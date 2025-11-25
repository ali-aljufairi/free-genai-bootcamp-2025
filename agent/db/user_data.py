"""
User data fetching functions for learning plan generation.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from db.connection import get_db_connection, return_db_connection

logger = logging.getLogger(__name__)


def get_user_id_from_clerk_id(clerk_id: str, auto_create: bool = True) -> Optional[int]:
    """
    Map Clerk ID to database user_id.
    
    Args:
        clerk_id: The Clerk user ID
        auto_create: If True, automatically create user if not found
        
    Returns:
        The database user_id, or None if user doesn't exist and auto_create is False
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Try to find existing user
        cursor.execute(
            "SELECT id FROM users WHERE clerk_id = %s LIMIT 1",
            (clerk_id,)
        )
        result = cursor.fetchone()
        
        if result:
            return result['id']
        
        # User doesn't exist - create if auto_create is enabled
        if auto_create:
            logger.info(f"User with Clerk ID {clerk_id} not found, creating new user")
            
            # Create user with default values
            cursor.execute(
                """
                INSERT INTO users (clerk_id, email, display_name, created_at, updated_at)
                VALUES (%s, %s, %s, NOW(), NOW())
                RETURNING id
                """,
                (
                    clerk_id,
                    f"{clerk_id}@clerk.user",  # Fallback email
                    "User",  # Default display name
                )
            )
            result = cursor.fetchone()
            conn.commit()
            
            if result:
                user_id = result['id']
                logger.info(f"Created new user with ID {user_id} for Clerk ID {clerk_id}")
                
                # Create default user settings
                try:
                    cursor.execute(
                        """
                        INSERT INTO user_settings (
                            user_id, hide_english, ui_language, timezone, 
                            daily_review_target, current_jlpt_level, created_at, updated_at
                        )
                        VALUES (%s, false, 'en', 'UTC', 20, 5, NOW(), NOW())
                        ON CONFLICT (user_id) DO NOTHING
                        """,
                        (user_id,)
                    )
                    conn.commit()
                    logger.info(f"Created default settings for user_id {user_id}")
                except Exception as e:
                    logger.warning(f"Failed to create user settings for user_id {user_id}: {e}")
                    conn.rollback()
                
                # Assign default student role
                try:
                    cursor.execute(
                        """
                        INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
                        SELECT %s, r.id, NOW(), NOW()
                        FROM roles r
                        WHERE r.role_name = 'student'
                        LIMIT 1
                        ON CONFLICT DO NOTHING
                        """,
                        (user_id,)
                    )
                    conn.commit()
                    logger.info(f"Assigned student role to user_id {user_id}")
                except Exception as e:
                    logger.warning(f"Failed to assign student role to user_id {user_id}: {e}")
                    conn.rollback()
                
                return user_id
        
        return None
    except Exception as e:
        logger.error(f"Error fetching/creating user_id for Clerk ID {clerk_id}: {e}", exc_info=True)
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            return_db_connection(conn)


def get_user_profile_and_settings(user_id: int) -> Dict[str, Any]:
    """Fetch user profile and settings."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user profile
        cursor.execute(
            """
            SELECT id, clerk_id, email, display_name, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )
        user = cursor.fetchone()
        
        if not user:
            return {}
        
        # Get user settings
        cursor.execute(
            """
            SELECT 
                current_jlpt_level,
                daily_review_target,
                hide_english,
                ui_language,
                timezone
            FROM user_settings
            WHERE user_id = %s
            """,
            (user_id,)
        )
        settings = cursor.fetchone()
        
        return {
            "user_id": user['id'],
            "email": user['email'],
            "display_name": user['display_name'],
            "current_jlpt_level": settings['current_jlpt_level'] if settings else 5,
            "daily_review_target": settings['daily_review_target'] if settings else 20,
            "settings": dict(settings) if settings else {},
        }
    except Exception as e:
        logger.error(f"Error fetching user profile for user_id {user_id}: {e}")
        return {}
    finally:
        if conn:
            return_db_connection(conn)


def get_progress_summary(user_id: int) -> Dict[str, Any]:
    """Get summary of user's learning progress."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Kanji progress
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_kanji_studied,
                COUNT(CASE WHEN fully_mastered = TRUE THEN 1 END) as kanji_mastered,
                COUNT(CASE WHEN next_review <= NOW() THEN 1 END) as kanji_due_for_review
            FROM kanji_learning_progress
            WHERE user_id = %s
            """,
            (user_id,)
        )
        kanji_stats = cursor.fetchone()
        
        # Vocabulary progress
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_words_studied,
                COUNT(CASE WHEN fully_mastered = TRUE THEN 1 END) as words_mastered,
                COUNT(CASE WHEN next_review <= NOW() THEN 1 END) as words_due_for_review
            FROM vocabulary_learning_progress
            WHERE user_id = %s
            """,
            (user_id,)
        )
        vocab_stats = cursor.fetchone()
        
        # Grammar progress (from user_question_attempts)
        cursor.execute(
            """
            SELECT 
                COUNT(DISTINCT q.grammar_id) as grammar_points_studied,
                COUNT(CASE WHEN uqa.correct THEN 1 END) as grammar_correct,
                COUNT(*) as grammar_total_attempts
            FROM user_question_attempts uqa
            JOIN jlpt_questions q ON uqa.question_id = q.id
            WHERE uqa.user_id = %s AND q.grammar_id IS NOT NULL
            """,
            (user_id,)
        )
        grammar_stats = cursor.fetchone()
        
        return {
            "kanji": dict(kanji_stats) if kanji_stats else {},
            "vocabulary": dict(vocab_stats) if vocab_stats else {},
            "grammar": dict(grammar_stats) if grammar_stats else {},
        }
    except Exception as e:
        logger.error(f"Error fetching progress summary for user_id {user_id}: {e}")
        return {}
    finally:
        if conn:
            return_db_connection(conn)


def get_weak_areas(user_id: int, limit: int = 20) -> Dict[str, List[Dict[str, Any]]]:
    """Identify weak areas in user's learning."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        weak_areas = {
            "kanji": [],
            "vocabulary": [],
            "grammar": [],
        }
        
        # Weak kanji (low accuracy, not mastered)
        cursor.execute(
            """
            SELECT 
                k.id,
                k.character,
                k.meanings,
                k.jlpt,
                klp.reading_accuracy,
                klp.writing_accuracy,
                klp.meaning_accuracy,
                klp.seen_cnt,
                klp.correct_cnt
            FROM kanji_learning_progress klp
            JOIN kanji k ON klp.kanji_id = k.id
            WHERE klp.user_id = %s
                AND klp.fully_mastered = FALSE
                AND (klp.reading_accuracy < 70 OR klp.writing_accuracy < 70 OR klp.meaning_accuracy < 70)
            ORDER BY (klp.reading_accuracy + klp.writing_accuracy + klp.meaning_accuracy) / 3 ASC
            LIMIT %s
            """,
            (user_id, limit)
        )
        weak_areas["kanji"] = [dict(row) for row in cursor.fetchall()]
        
        # Weak vocabulary
        cursor.execute(
            """
            SELECT 
                w.id,
                w.kanji,
                w.kana,
                w.english,
                w.jlpt,
                vlp.meaning_accuracy,
                vlp.reading_accuracy,
                vlp.seen_cnt,
                vlp.correct_cnt
            FROM vocabulary_learning_progress vlp
            JOIN words w ON vlp.word_id = w.id
            WHERE vlp.user_id = %s
                AND vlp.fully_mastered = FALSE
                AND (vlp.meaning_accuracy < 70 OR vlp.reading_accuracy < 70)
            ORDER BY (vlp.meaning_accuracy + vlp.reading_accuracy) / 2 ASC
            LIMIT %s
            """,
            (user_id, limit)
        )
        weak_areas["vocabulary"] = [dict(row) for row in cursor.fetchall()]
        
        # Weak grammar (low accuracy on grammar questions)
        cursor.execute(
            """
            SELECT 
                gp.id,
                gp.key,
                gp.base_form,
                gp.level,
                COUNT(*) as total_attempts,
                COUNT(CASE WHEN uqa.correct THEN 1 END) as correct_attempts,
                ROUND(COUNT(CASE WHEN uqa.correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy
            FROM user_question_attempts uqa
            JOIN jlpt_questions q ON uqa.question_id = q.id
            JOIN grammar_points gp ON q.grammar_id = gp.id
            WHERE uqa.user_id = %s
            GROUP BY gp.id, gp.key, gp.base_form, gp.level
            HAVING COUNT(*) >= 3 AND COUNT(CASE WHEN uqa.correct THEN 1 END)::numeric / COUNT(*) < 0.7
            ORDER BY accuracy ASC
            LIMIT %s
            """,
            (user_id, limit)
        )
        weak_areas["grammar"] = [dict(row) for row in cursor.fetchall()]
        
        return weak_areas
    except Exception as e:
        logger.error(f"Error fetching weak areas for user_id {user_id}: {e}")
        return {"kanji": [], "vocabulary": [], "grammar": []}
    finally:
        if conn:
            return_db_connection(conn)


def get_srs_due_items(user_id: int, limit: int = 50) -> Dict[str, List[Dict[str, Any]]]:
    """Get items due for SRS review."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        due_items = {
            "kanji": [],
            "vocabulary": [],
            "grammar": [],
        }
        
        # Due kanji
        cursor.execute(
            """
            SELECT 
                k.id,
                k.character,
                k.meanings,
                k.jlpt,
                klp.next_review
            FROM kanji_learning_progress klp
            JOIN kanji k ON klp.kanji_id = k.id
            WHERE klp.user_id = %s
                AND klp.next_review <= NOW()
            ORDER BY klp.next_review ASC
            LIMIT %s
            """,
            (user_id, limit)
        )
        due_items["kanji"] = [dict(row) for row in cursor.fetchall()]
        
        # Due vocabulary
        cursor.execute(
            """
            SELECT 
                w.id,
                w.kanji,
                w.kana,
                w.english,
                w.jlpt,
                vlp.next_review
            FROM vocabulary_learning_progress vlp
            JOIN words w ON vlp.word_id = w.id
            WHERE vlp.user_id = %s
                AND vlp.next_review <= NOW()
            ORDER BY vlp.next_review ASC
            LIMIT %s
            """,
            (user_id, limit)
        )
        due_items["vocabulary"] = [dict(row) for row in cursor.fetchall()]
        
        return due_items
    except Exception as e:
        logger.error(f"Error fetching SRS due items for user_id {user_id}: {e}")
        return {"kanji": [], "vocabulary": [], "grammar": []}
    finally:
        if conn:
            return_db_connection(conn)


def get_recent_learning_activities(user_id: int, days: int = 30) -> List[Dict[str, Any]]:
    """Get recent learning activities."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            SELECT 
                activity_type,
                content_type,
                jlpt_level,
                item_count,
                correct_count,
                total_time_seconds,
                started_at,
                completed_at
            FROM learning_activities
            WHERE user_id = %s
                AND started_at >= NOW() - INTERVAL '%s days'
            ORDER BY started_at DESC
            LIMIT 100
            """,
            (user_id, days)
        )
        
        return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        logger.error(f"Error fetching recent activities for user_id {user_id}: {e}")
        return []
    finally:
        if conn:
            return_db_connection(conn)


def get_performance_analytics(user_id: int) -> Dict[str, Any]:
    """Get user performance analytics."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get analytics from user_learning_analytics table
        cursor.execute(
            """
            SELECT 
                accuracy_by_jlpt_level,
                accuracy_by_question_type,
                current_streak_days,
                longest_streak_days,
                total_study_time_hours,
                total_questions_attempted,
                total_questions_mastered,
                average_session_duration_minutes
            FROM user_learning_analytics
            WHERE user_id = %s
            """,
            (user_id,)
        )
        analytics = cursor.fetchone()
        
        if analytics:
            return dict(analytics)
        
        # If no analytics record, calculate basic stats
        cursor.execute(
            """
            SELECT 
                COUNT(*) as total_attempts,
                COUNT(CASE WHEN correct THEN 1 END) as correct_attempts,
                ROUND(COUNT(CASE WHEN correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as overall_accuracy
            FROM user_question_attempts
            WHERE user_id = %s
            """,
            (user_id,)
        )
        basic_stats = cursor.fetchone()
        
        return dict(basic_stats) if basic_stats else {}
    except Exception as e:
        logger.error(f"Error fetching performance analytics for user_id {user_id}: {e}")
        return {}
    finally:
        if conn:
            return_db_connection(conn)


def get_comprehensive_user_data(user_id: int) -> Dict[str, Any]:
    """Get all user data needed for learning plan generation."""
    return {
        "profile": get_user_profile_and_settings(user_id),
        "progress": get_progress_summary(user_id),
        "weak_areas": get_weak_areas(user_id),
        "srs_due_items": get_srs_due_items(user_id),
        "recent_activities": get_recent_learning_activities(user_id),
        "analytics": get_performance_analytics(user_id),
    }



