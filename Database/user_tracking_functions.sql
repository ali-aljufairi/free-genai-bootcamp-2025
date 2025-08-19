-- =====================================================
-- User Question Tracking API Functions
-- =====================================================
-- Comprehensive functions to handle user progress tracking
-- for JLPT questions, kanji, and vocabulary
--
-- USAGE: This file contains backend database functions for the Sorami platform.
-- These functions should be called from your application layer (API/backend).
--
-- DEPLOYMENT: Copy this file to your PostgreSQL container and execute it
-- to create all the tracking functions.
-- =====================================================

-- 1. JLPT QUESTION TRACKING FUNCTIONS
-- =====================================================

/**
 * record_jlpt_question_attempt - Record a user's attempt at a JLPT question
 * 
 * @param p_user_id - User ID
 * @param p_question_id - JLPT question ID
 * @param p_session_id - Study session ID
 * @param p_selected_answer_index - Which answer user chose (0-based)
 * @param p_is_correct - Whether the answer was correct
 * @param p_time_spent_seconds - Time spent on question
 * @param p_confidence_level - User's confidence level (optional)
 * @param p_explanation_read - Did user read explanation? (optional)
 * @param p_explanation_time_spent_seconds - Time spent reading explanation (optional)
 * @param p_marked_for_review - Did user mark for review? (optional)
 * @param p_device_type - Device type (optional, default: 'desktop')
 * 
 * @returns BIGINT - The attempt ID
 * 
 * USAGE: Call this function whenever a user answers a JLPT question
 */
CREATE OR REPLACE FUNCTION record_jlpt_question_attempt(
    p_user_id BIGINT,
    p_question_id BIGINT,
    p_session_id BIGINT,
    p_selected_answer_index INTEGER,
    p_is_correct BOOLEAN,
    p_time_spent_seconds INTEGER,
    p_confidence_level confidence_level_enum DEFAULT NULL,
    p_explanation_read BOOLEAN DEFAULT FALSE,
    p_explanation_time_spent_seconds INTEGER DEFAULT NULL,
    p_marked_for_review BOOLEAN DEFAULT FALSE,
    p_device_type TEXT DEFAULT 'desktop'
)
RETURNS BIGINT AS $$
DECLARE
    v_attempt_id BIGINT;
    v_attempt_number INTEGER;
BEGIN
    -- Get the next attempt number for this user and question
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM jlpt_question_attempts
    WHERE user_id = p_user_id AND question_id = p_question_id;
    
    -- Insert the attempt record
    INSERT INTO jlpt_question_attempts (
        user_id, question_id, session_id,
        selected_answer_index, is_correct, time_spent_seconds,
        confidence_level, explanation_read, explanation_time_spent_seconds,
        marked_for_review, attempt_number, device_type,
        completed_at
    ) VALUES (
        p_user_id, p_question_id, p_session_id,
        p_selected_answer_index, p_is_correct, p_time_spent_seconds,
        p_confidence_level, p_explanation_read, p_explanation_time_spent_seconds,
        p_marked_for_review, v_attempt_number, p_device_type,
        now()
    ) RETURNING id INTO v_attempt_id;
    
    -- Update user learning analytics
    PERFORM update_user_learning_analytics(p_user_id);
    
    RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql;

/**
 * get_user_jlpt_statistics - Get comprehensive JLPT statistics for a user
 * 
 * @param p_user_id - User ID
 * 
 * @returns TABLE with statistics including:
 *   - total_questions: Total JLPT questions available
 *   - attempted_questions: Questions user has attempted
 *   - correct_questions: Questions user got correct at least once
 *   - overall_accuracy: Average accuracy rate
 *   - mastered_questions: Questions marked as mastered
 *   - needs_review_questions: Questions needing review
 *   - average_time_per_question: Average time spent per question
 *   - total_study_time_hours: Total study time in hours
 * 
 * USAGE: Call this for user dashboard or progress reports
 */
CREATE OR REPLACE FUNCTION get_user_jlpt_statistics(p_user_id BIGINT)
RETURNS TABLE (
    total_questions INTEGER,
    attempted_questions INTEGER,
    correct_questions INTEGER,
    overall_accuracy NUMERIC(5,2),
    mastered_questions INTEGER,
    needs_review_questions INTEGER,
    average_time_per_question NUMERIC(8,2),
    total_study_time_hours NUMERIC(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(jq.id)::INTEGER as total_questions,
        COUNT(jqp.user_id)::INTEGER as attempted_questions,
        SUM(CASE WHEN jqp.correct_attempts > 0 THEN 1 ELSE 0 END)::INTEGER as correct_questions,
        ROUND(AVG(jqp.accuracy_rate), 2) as overall_accuracy,
        SUM(CASE WHEN jqp.understanding_level = 'mastered' THEN 1 ELSE 0 END)::INTEGER as mastered_questions,
        SUM(CASE WHEN jqp.understanding_level = 'needs_review' THEN 1 ELSE 0 END)::INTEGER as needs_review_questions,
        ROUND(AVG(jqp.average_time_spent_seconds), 2) as average_time_per_question,
        ROUND(SUM(jqp.average_time_spent_seconds * jqp.total_attempts) / 3600.0, 2) as total_study_time_hours
    FROM jlpt_questions jq
    LEFT JOIN jlpt_question_progress jqp ON jq.id = jqp.question_id AND jqp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

/**
 * get_jlpt_questions_for_review - Get questions due for review (Spaced Repetition)
 * 
 * @param p_user_id - User ID
 * @param p_limit - Maximum number of questions to return (default: 20)
 * @param p_jlpt_level - Filter by JLPT level (optional)
 * 
 * @returns TABLE with questions due for review, ordered by priority
 * 
 * USAGE: Call this to get questions for daily review or study sessions
 */
CREATE OR REPLACE FUNCTION get_jlpt_questions_for_review(
    p_user_id BIGINT,
    p_limit INTEGER DEFAULT 20,
    p_jlpt_level INTEGER DEFAULT NULL
)
RETURNS TABLE (
    question_id BIGINT,
    question_title TEXT,
    jlpt_level INTEGER,
    question_type TEXT,
    accuracy_rate NUMERIC(5,2),
    consecutive_incorrect INTEGER,
    understanding_level question_understanding_level,
    last_attempted TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jq.id,
        jq.title,
        jq.level::INTEGER,
        jq.tag,
        jqp.accuracy_rate,
        jqp.consecutive_incorrect,
        jqp.understanding_level,
        jqp.last_attempted_at,
        jqp.next_review_at
    FROM jlpt_questions jq
    LEFT JOIN jlpt_question_progress jqp ON jq.id = jqp.question_id AND jqp.user_id = p_user_id
    WHERE (p_jlpt_level IS NULL OR jq.level = p_jlpt_level)
      AND (jqp.next_review_at IS NULL OR jqp.next_review_at <= NOW())
      AND (jqp.understanding_level IS NULL OR jqp.understanding_level != 'mastered')
    ORDER BY 
        jqp.next_review_at ASC NULLS FIRST,
        jqp.accuracy_rate ASC NULLS FIRST,
        jqp.consecutive_incorrect DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 2. KANJI TRACKING FUNCTIONS
-- =====================================================

/**
 * record_kanji_progress - Record kanji learning progress
 * 
 * @param p_user_id - User ID
 * @param p_kanji_id - Kanji ID
 * @param p_reading_correct - Was reading correct?
 * @param p_writing_correct - Was writing correct?
 * @param p_meaning_correct - Was meaning correct?
 * @param p_stroke_order_correct - Was stroke order correct? (optional)
 * @param p_confidence_level - User's confidence level (optional)
 * 
 * USAGE: Call this whenever a user studies a kanji
 */
CREATE OR REPLACE FUNCTION record_kanji_progress(
    p_user_id BIGINT,
    p_kanji_id INTEGER,
    p_reading_correct BOOLEAN,
    p_writing_correct BOOLEAN,
    p_meaning_correct BOOLEAN,
    p_stroke_order_correct BOOLEAN DEFAULT NULL,
    p_confidence_level confidence_level_enum DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO kanji_learning_progress (
        user_id, kanji_id,
        seen_cnt, correct_cnt,
        reading_accuracy, writing_accuracy, meaning_accuracy,
        stroke_order_attempts, stroke_order_correct,
        first_seen, last_seen,
        understanding_level, confidence_level
    ) VALUES (
        p_user_id, p_kanji_id,
        1, 
        CASE WHEN (p_reading_correct AND p_writing_correct AND p_meaning_correct) THEN 1 ELSE 0 END,
        CASE WHEN p_reading_correct THEN 100.0 ELSE 0.0 END,
        CASE WHEN p_writing_correct THEN 100.0 ELSE 0.0 END,
        CASE WHEN p_meaning_correct THEN 100.0 ELSE 0.0 END,
        CASE WHEN p_stroke_order_correct IS NOT NULL THEN 1 ELSE 0 END,
        CASE WHEN p_stroke_order_correct THEN 1 ELSE 0 END,
        now(), now(),
        CASE 
            WHEN (p_reading_correct AND p_writing_correct AND p_meaning_correct) THEN 'attempted_correct_once'
            ELSE 'attempted_incorrect'
        END,
        p_confidence_level
    )
    ON CONFLICT (user_id, kanji_id) DO UPDATE SET
        seen_cnt = kanji_learning_progress.seen_cnt + 1,
        correct_cnt = kanji_learning_progress.correct_cnt + 
            CASE WHEN (p_reading_correct AND p_writing_correct AND p_meaning_correct) THEN 1 ELSE 0 END,
        reading_accuracy = (
            (kanji_learning_progress.reading_accuracy * (kanji_learning_progress.seen_cnt - 1) + 
             CASE WHEN p_reading_correct THEN 100.0 ELSE 0.0 END) / kanji_learning_progress.seen_cnt
        ),
        writing_accuracy = (
            (kanji_learning_progress.writing_accuracy * (kanji_learning_progress.seen_cnt - 1) + 
             CASE WHEN p_writing_correct THEN 100.0 ELSE 0.0 END) / kanji_learning_progress.seen_cnt
        ),
        meaning_accuracy = (
            (kanji_learning_progress.meaning_accuracy * (kanji_learning_progress.seen_cnt - 1) + 
             CASE WHEN p_meaning_correct THEN 100.0 ELSE 0.0 END) / kanji_learning_progress.seen_cnt
        ),
        stroke_order_attempts = kanji_learning_progress.stroke_order_attempts + 
            CASE WHEN p_stroke_order_correct IS NOT NULL THEN 1 ELSE 0 END,
        stroke_order_correct = kanji_learning_progress.stroke_order_correct + 
            CASE WHEN p_stroke_order_correct THEN 1 ELSE 0 END,
        last_seen = now(),
        understanding_level = CASE 
            WHEN (p_reading_correct AND p_writing_correct AND p_meaning_correct) THEN
                CASE 
                    WHEN kanji_learning_progress.consecutive_correct >= 2 THEN 'mastered'
                    WHEN kanji_learning_progress.consecutive_correct >= 1 THEN 'attempted_correct_multiple'
                    ELSE 'attempted_correct_once'
                END
            ELSE 'attempted_incorrect'
        END,
        confidence_level = p_confidence_level;
    
    -- Update mastery flags
    UPDATE kanji_learning_progress SET
        reading_mastered = (reading_accuracy >= 90.0),
        writing_mastered = (writing_accuracy >= 90.0),
        meaning_mastered = (meaning_accuracy >= 90.0),
        stroke_order_mastered = (stroke_order_accuracy >= 90.0),
        fully_mastered = (reading_accuracy >= 90.0 AND writing_accuracy >= 90.0 AND meaning_accuracy >= 90.0)
    WHERE user_id = p_user_id AND kanji_id = p_kanji_id;
    
    -- Update user learning analytics
    PERFORM update_user_learning_analytics(p_user_id);
END;
$$ LANGUAGE plpgsql;

/**
 * get_kanji_for_review - Get kanji due for review
 * 
 * @param p_user_id - User ID
 * @param p_limit - Maximum number of kanji to return (default: 20)
 * @param p_jlpt_level - Filter by JLPT level (optional)
 * 
 * @returns TABLE with kanji due for review
 * 
 * USAGE: Call this to get kanji for daily review
 */
CREATE OR REPLACE FUNCTION get_kanji_for_review(
    p_user_id BIGINT,
    p_limit INTEGER DEFAULT 20,
    p_jlpt_level INTEGER DEFAULT NULL
)
RETURNS TABLE (
    kanji_id INTEGER,
    kanji_character TEXT,
    jlpt_level INTEGER,
    reading_accuracy NUMERIC(5,2),
    writing_accuracy NUMERIC(5,2),
    meaning_accuracy NUMERIC(5,2),
    understanding_level question_understanding_level,
    last_seen TIMESTAMPTZ,
    next_review TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        k.id,
        k.character,
        k.jlpt::INTEGER,
        klp.reading_accuracy,
        klp.writing_accuracy,
        klp.meaning_accuracy,
        klp.understanding_level,
        klp.last_seen,
        klp.next_review
    FROM kanji k
    LEFT JOIN kanji_learning_progress klp ON k.id = klp.kanji_id AND klp.user_id = p_user_id
    WHERE (p_jlpt_level IS NULL OR k.jlpt = p_jlpt_level)
      AND (klp.next_review IS NULL OR klp.next_review <= NOW())
      AND (klp.fully_mastered IS NULL OR klp.fully_mastered = FALSE)
    ORDER BY 
        klp.next_review ASC NULLS FIRST,
        LEAST(klp.reading_accuracy, klp.writing_accuracy, klp.meaning_accuracy) ASC NULLS FIRST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. VOCABULARY TRACKING FUNCTIONS
-- =====================================================

/**
 * record_vocabulary_progress - Record vocabulary learning progress
 * 
 * @param p_user_id - User ID
 * @param p_word_id - Word ID
 * @param p_meaning_correct - Was meaning correct?
 * @param p_reading_correct - Was reading correct?
 * @param p_writing_correct - Was writing correct?
 * @param p_listening_correct - Was listening correct? (optional)
 * @param p_confidence_level - User's confidence level (optional)
 * 
 * USAGE: Call this whenever a user studies vocabulary
 */
CREATE OR REPLACE FUNCTION record_vocabulary_progress(
    p_user_id BIGINT,
    p_word_id INTEGER,
    p_meaning_correct BOOLEAN,
    p_reading_correct BOOLEAN,
    p_writing_correct BOOLEAN,
    p_listening_correct BOOLEAN DEFAULT NULL,
    p_confidence_level confidence_level_enum DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO vocabulary_learning_progress (
        user_id, word_id,
        seen_cnt, correct_cnt,
        meaning_accuracy, reading_accuracy, writing_accuracy, listening_accuracy,
        first_seen, last_seen,
        understanding_level, confidence_level
    ) VALUES (
        p_user_id, p_word_id,
        1, 
        CASE WHEN (p_meaning_correct AND p_reading_correct AND p_writing_correct) THEN 1 ELSE 0 END,
        CASE WHEN p_meaning_correct THEN 100.0 ELSE 0.0 END,
        CASE WHEN p_reading_correct THEN 100.0 ELSE 0.0 END,
        CASE WHEN p_writing_correct THEN 100.0 ELSE 0.0 END,
        CASE WHEN p_listening_correct IS NOT NULL THEN 
            CASE WHEN p_listening_correct THEN 100.0 ELSE 0.0 END
        ELSE NULL END,
        now(), now(),
        CASE 
            WHEN (p_meaning_correct AND p_reading_correct AND p_writing_correct) THEN 'attempted_correct_once'
            ELSE 'attempted_incorrect'
        END,
        p_confidence_level
    )
    ON CONFLICT (user_id, word_id) DO UPDATE SET
        seen_cnt = vocabulary_learning_progress.seen_cnt + 1,
        correct_cnt = vocabulary_learning_progress.correct_cnt + 
            CASE WHEN (p_meaning_correct AND p_reading_correct AND p_writing_correct) THEN 1 ELSE 0 END,
        meaning_accuracy = (
            (vocabulary_learning_progress.meaning_accuracy * (vocabulary_learning_progress.seen_cnt - 1) + 
             CASE WHEN p_meaning_correct THEN 100.0 ELSE 0.0 END) / vocabulary_learning_progress.seen_cnt
        ),
        reading_accuracy = (
            (vocabulary_learning_progress.reading_accuracy * (vocabulary_learning_progress.seen_cnt - 1) + 
             CASE WHEN p_reading_correct THEN 100.0 ELSE 0.0 END) / vocabulary_learning_progress.seen_cnt
        ),
        writing_accuracy = (
            (vocabulary_learning_progress.writing_accuracy * (vocabulary_learning_progress.seen_cnt - 1) + 
             CASE WHEN p_writing_correct THEN 100.0 ELSE 0.0 END) / vocabulary_learning_progress.seen_cnt
        ),
        listening_accuracy = CASE 
            WHEN p_listening_correct IS NOT NULL THEN
                (vocabulary_learning_progress.listening_accuracy * (vocabulary_learning_progress.seen_cnt - 1) + 
                 CASE WHEN p_listening_correct THEN 100.0 ELSE 0.0 END) / vocabulary_learning_progress.seen_cnt
            ELSE vocabulary_learning_progress.listening_accuracy
        END,
        last_seen = now(),
        understanding_level = CASE 
            WHEN (p_meaning_correct AND p_reading_correct AND p_writing_correct) THEN
                CASE 
                    WHEN vocabulary_learning_progress.consecutive_correct >= 2 THEN 'mastered'
                    WHEN vocabulary_learning_progress.consecutive_correct >= 1 THEN 'attempted_correct_multiple'
                    ELSE 'attempted_correct_once'
                END
            ELSE 'attempted_incorrect'
        END,
        confidence_level = p_confidence_level;
    
    -- Update mastery flags
    UPDATE vocabulary_learning_progress SET
        meaning_mastered = (meaning_accuracy >= 90.0),
        reading_mastered = (reading_accuracy >= 90.0),
        writing_mastered = (writing_accuracy >= 90.0),
        listening_mastered = (listening_accuracy >= 90.0),
        fully_mastered = (meaning_accuracy >= 90.0 AND reading_accuracy >= 90.0 AND writing_accuracy >= 90.0)
    WHERE user_id = p_user_id AND word_id = p_word_id;
    
    -- Update user learning analytics
    PERFORM update_user_learning_analytics(p_user_id);
END;
$$ LANGUAGE plpgsql;

/**
 * get_vocabulary_for_review - Get vocabulary due for review
 * 
 * @param p_user_id - User ID
 * @param p_limit - Maximum number of words to return (default: 20)
 * @param p_jlpt_level - Filter by JLPT level (optional)
 * 
 * @returns TABLE with vocabulary due for review
 * 
 * USAGE: Call this to get vocabulary for daily review
 */
CREATE OR REPLACE FUNCTION get_vocabulary_for_review(
    p_user_id BIGINT,
    p_limit INTEGER DEFAULT 20,
    p_jlpt_level INTEGER DEFAULT NULL
)
RETURNS TABLE (
    word_id INTEGER,
    word_kana TEXT,
    word_english TEXT,
    jlpt_level INTEGER,
    meaning_accuracy NUMERIC(5,2),
    reading_accuracy NUMERIC(5,2),
    writing_accuracy NUMERIC(5,2),
    understanding_level question_understanding_level,
    last_seen TIMESTAMPTZ,
    next_review TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.kana,
        w.english,
        w.jlpt::INTEGER,
        vlp.meaning_accuracy,
        vlp.reading_accuracy,
        vlp.writing_accuracy,
        vlp.understanding_level,
        vlp.last_seen,
        vlp.next_review
    FROM words w
    LEFT JOIN vocabulary_learning_progress vlp ON w.id = vlp.word_id AND vlp.user_id = p_user_id
    WHERE (p_jlpt_level IS NULL OR w.jlpt = p_jlpt_level)
      AND (vlp.next_review IS NULL OR vlp.next_review <= NOW())
      AND (vlp.fully_mastered IS NULL OR vlp.fully_mastered = FALSE)
    ORDER BY 
        vlp.next_review ASC NULLS FIRST,
        LEAST(vlp.meaning_accuracy, vlp.reading_accuracy, vlp.writing_accuracy) ASC NULLS FIRST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. STUDY SESSION FUNCTIONS
-- =====================================================

/**
 * start_study_session - Start a new study session
 * 
 * @param p_user_id - User ID
 * @param p_session_type - Type of session ('jlpt_practice', 'kanji_study', 'vocabulary_review', 'mixed')
 * @param p_device_type - Device type (optional, default: 'desktop')
 * @param p_location - Location (optional)
 * 
 * @returns BIGINT - Session ID
 * 
 * USAGE: Call this when user starts studying
 */
CREATE OR REPLACE FUNCTION start_study_session(
    p_user_id BIGINT,
    p_session_type TEXT,
    p_device_type TEXT DEFAULT 'desktop',
    p_location TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_session_id BIGINT;
BEGIN
    INSERT INTO enhanced_study_sessions (
        user_id, session_type, device_type, location
    ) VALUES (
        p_user_id, p_session_type, p_device_type, p_location
    ) RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

/**
 * end_study_session - End a study session and record summary
 * 
 * @param p_session_id - Session ID
 * @param p_jlpt_questions_attempted - Number of JLPT questions attempted
 * @param p_kanji_reviewed - Number of kanji reviewed
 * @param p_vocabulary_reviewed - Number of vocabulary reviewed
 * @param p_total_correct - Total correct answers
 * @param p_total_incorrect - Total incorrect answers
 * @param p_focus_score - Focus score 1-10 (optional)
 * @param p_difficulty_level - Difficulty level (optional)
 * @param p_notes - Session notes (optional)
 * 
 * USAGE: Call this when user finishes studying
 */
CREATE OR REPLACE FUNCTION end_study_session(
    p_session_id BIGINT,
    p_jlpt_questions_attempted INTEGER DEFAULT 0,
    p_kanji_reviewed INTEGER DEFAULT 0,
    p_vocabulary_reviewed INTEGER DEFAULT 0,
    p_total_correct INTEGER DEFAULT 0,
    p_total_incorrect INTEGER DEFAULT 0,
    p_focus_score INTEGER DEFAULT NULL,
    p_difficulty_level TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id BIGINT;
BEGIN
    UPDATE enhanced_study_sessions SET
        ended_at = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - started_at)) / 60,
        jlpt_questions_attempted = p_jlpt_questions_attempted,
        kanji_reviewed = p_kanji_reviewed,
        vocabulary_reviewed = p_vocabulary_reviewed,
        total_correct = p_total_correct,
        total_incorrect = p_total_incorrect,
        focus_score = p_focus_score,
        difficulty_level = p_difficulty_level,
        notes = p_notes
    WHERE id = p_session_id;
    
    -- Update user learning analytics
    SELECT user_id INTO v_user_id FROM enhanced_study_sessions WHERE id = p_session_id;
    PERFORM update_user_learning_analytics(v_user_id);
END;
$$ LANGUAGE plpgsql;

-- 5. USER LEARNING ANALYTICS FUNCTIONS
-- =====================================================

/**
 * update_user_learning_analytics - Update user's learning analytics
 * 
 * @param p_user_id - User ID
 * 
 * USAGE: This function is called automatically by other tracking functions.
 * You can also call it manually to refresh analytics.
 */
CREATE OR REPLACE FUNCTION update_user_learning_analytics(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_total_study_time_hours NUMERIC(8,2);
    v_total_questions_attempted INTEGER;
    v_total_questions_mastered INTEGER;
    v_total_kanji_learned INTEGER;
    v_total_vocabulary_learned INTEGER;
    v_total_study_days INTEGER;
    v_avg_session_duration NUMERIC(8,2);
    v_questions_per_session_avg NUMERIC(5,2);
BEGIN
    -- Calculate total study time
    SELECT COALESCE(SUM(duration_minutes) / 60.0, 0)
    INTO v_total_study_time_hours
    FROM enhanced_study_sessions
    WHERE user_id = p_user_id;
    
    -- Calculate question statistics
    SELECT 
        COUNT(DISTINCT question_id),
        COUNT(DISTINCT CASE WHEN understanding_level = 'mastered' THEN question_id END)
    INTO v_total_questions_attempted, v_total_questions_mastered
    FROM jlpt_question_progress
    WHERE user_id = p_user_id;
    
    -- Calculate kanji statistics
    SELECT COUNT(DISTINCT kanji_id)
    INTO v_total_kanji_learned
    FROM kanji_learning_progress
    WHERE user_id = p_user_id;
    
    -- Calculate vocabulary statistics
    SELECT COUNT(DISTINCT word_id)
    INTO v_total_vocabulary_learned
    FROM vocabulary_learning_progress
    WHERE user_id = p_user_id;
    
    -- Calculate session statistics
    SELECT 
        AVG(duration_minutes),
        AVG(jlpt_questions_attempted + kanji_reviewed + vocabulary_reviewed)
    INTO v_avg_session_duration, v_questions_per_session_avg
    FROM enhanced_study_sessions
    WHERE user_id = p_user_id AND ended_at IS NOT NULL;
    
    -- Calculate study days
    SELECT COUNT(DISTINCT DATE(created_at))
    INTO v_total_study_days
    FROM enhanced_study_sessions
    WHERE user_id = p_user_id;
    
    -- Insert or update analytics
    INSERT INTO user_learning_analytics (
        user_id,
        total_study_time_hours,
        total_questions_attempted,
        total_questions_mastered,
        total_kanji_learned,
        total_vocabulary_learned,
        average_session_duration_minutes,
        questions_per_session_avg,
        total_study_days,
        last_updated
    ) VALUES (
        p_user_id,
        v_total_study_time_hours,
        v_total_questions_attempted,
        v_total_questions_mastered,
        v_total_kanji_learned,
        v_total_vocabulary_learned,
        v_avg_session_duration,
        v_questions_per_session_avg,
        v_total_study_days,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_study_time_hours = EXCLUDED.total_study_time_hours,
        total_questions_attempted = EXCLUDED.total_questions_attempted,
        total_questions_mastered = EXCLUDED.total_questions_mastered,
        total_kanji_learned = EXCLUDED.total_kanji_learned,
        total_vocabulary_learned = EXCLUDED.total_vocabulary_learned,
        average_session_duration_minutes = EXCLUDED.average_session_duration_minutes,
        questions_per_session_avg = EXCLUDED.questions_per_session_avg,
        total_study_days = EXCLUDED.total_study_days,
        last_updated = now();
END;
$$ LANGUAGE plpgsql;

-- 6. REPORTING FUNCTIONS
-- =====================================================

/**
 * get_user_progress_report - Get comprehensive user progress report
 * 
 * @param p_user_id - User ID
 * 
 * @returns TABLE with detailed progress metrics organized by category
 * 
 * USAGE: Call this for comprehensive progress reports or dashboards
 */
CREATE OR REPLACE FUNCTION get_user_progress_report(p_user_id BIGINT)
RETURNS TABLE (
    report_type TEXT,
    metric_name TEXT,
    metric_value TEXT,
    numeric_value NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    -- Overall Statistics
    SELECT 'Overall'::TEXT, 'Total Study Time (Hours)'::TEXT, 
           ula.total_study_time_hours::TEXT, ula.total_study_time_hours
    FROM user_learning_analytics ula
    WHERE ula.user_id = p_user_id
    
    UNION ALL
    
    SELECT 'Overall', 'Total Questions Attempted', 
           ula.total_questions_attempted::TEXT, ula.total_questions_attempted::NUMERIC
    FROM user_learning_analytics ula
    WHERE ula.user_id = p_user_id
    
    UNION ALL
    
    SELECT 'Overall', 'Questions Mastered', 
           ula.total_questions_mastered::TEXT, ula.total_questions_mastered::NUMERIC
    FROM user_learning_analytics ula
    WHERE ula.user_id = p_user_id
    
    UNION ALL
    
    SELECT 'Overall', 'Kanji Learned', 
           ula.total_kanji_learned::TEXT, ula.total_kanji_learned::NUMERIC
    FROM user_learning_analytics ula
    WHERE ula.user_id = p_user_id
    
    UNION ALL
    
    SELECT 'Overall', 'Vocabulary Learned', 
           ula.total_vocabulary_learned::TEXT, ula.total_vocabulary_learned::NUMERIC
    FROM user_learning_analytics ula
    WHERE ula.user_id = p_user_id
    
    UNION ALL
    
    SELECT 'Overall', 'Study Days', 
           ula.total_study_days::TEXT, ula.total_study_days::NUMERIC
    FROM user_learning_analytics ula
    WHERE ula.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 7. UTILITY FUNCTIONS
-- =====================================================

/**
 * reset_user_progress - Reset all progress for a user (for testing or account reset)
 * 
 * @param p_user_id - User ID
 * 
 * WARNING: This will delete ALL progress data for the user!
 * 
 * USAGE: Only use for testing or when user requests account reset
 */
CREATE OR REPLACE FUNCTION reset_user_progress(p_user_id BIGINT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM jlpt_question_attempts WHERE user_id = p_user_id;
    DELETE FROM jlpt_question_progress WHERE user_id = p_user_id;
    DELETE FROM kanji_learning_progress WHERE user_id = p_user_id;
    DELETE FROM vocabulary_learning_progress WHERE user_id = p_user_id;
    DELETE FROM enhanced_study_sessions WHERE user_id = p_user_id;
    DELETE FROM user_learning_analytics WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

/**
 * get_learning_recommendations - Get personalized learning recommendations
 * 
 * @param p_user_id - User ID
 * @param p_limit - Maximum number of recommendations (default: 10)
 * 
 * @returns TABLE with recommendations ordered by priority
 * 
 * USAGE: Call this to suggest what user should study next
 */
CREATE OR REPLACE FUNCTION get_learning_recommendations(p_user_id BIGINT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    recommendation_type TEXT,
    item_id BIGINT,
    item_title TEXT,
    priority_score NUMERIC(5,2),
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- JLPT questions needing attention
    SELECT 
        'jlpt_question'::TEXT,
        jq.id::BIGINT,
        jq.title,
        (100 - jqp.accuracy_rate) as priority_score,
        'Low accuracy: ' || jqp.accuracy_rate || '%' as reason
    FROM jlpt_questions jq
    JOIN jlpt_question_progress jqp ON jq.id = jqp.question_id
    WHERE jqp.user_id = p_user_id 
      AND jqp.accuracy_rate < 70
    
    UNION ALL
    
    -- Kanji needing review
    SELECT 
        'kanji'::TEXT,
        k.id::BIGINT,
        k.character,
        (100 - LEAST(klp.reading_accuracy, klp.writing_accuracy, klp.meaning_accuracy)) as priority_score,
        'Low accuracy in kanji components' as reason
    FROM kanji k
    JOIN kanji_learning_progress klp ON k.id = klp.kanji_id
    WHERE klp.user_id = p_user_id 
      AND LEAST(klp.reading_accuracy, klp.writing_accuracy, klp.meaning_accuracy) < 70
    
    UNION ALL
    
    -- Vocabulary needing review
    SELECT 
        'vocabulary'::TEXT,
        w.id::BIGINT,
        w.kana,
        (100 - LEAST(vlp.meaning_accuracy, vlp.reading_accuracy, vlp.writing_accuracy)) as priority_score,
        'Low accuracy in vocabulary components' as reason
    FROM words w
    JOIN vocabulary_learning_progress vlp ON w.id = vlp.word_id
    WHERE vlp.user_id = p_user_id 
      AND LEAST(vlp.meaning_accuracy, vlp.reading_accuracy, vlp.writing_accuracy) < 70
    ORDER BY priority_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- END OF USER TRACKING FUNCTIONS
-- =====================================================