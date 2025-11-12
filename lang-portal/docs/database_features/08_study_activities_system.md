# Study Activities System Features

## Overview
Comprehensive study activities system providing diverse learning experiences including flashcards, writing practice, listening exercises, and interactive games.

## Core Tables
- `study_activities` - Available study activity types
- `study_sessions` - User study sessions
- `review_items` - Individual review attempts
- `kanji_traces` - User kanji writing practice
- `activity_results` - Detailed activity performance

## Key Features

### 1. Study Activity Management
```sql
-- Get all available study activities
SELECT id, name, description, activity_type, difficulty_level, 
       estimated_duration, is_active
FROM study_activities 
WHERE is_active = true
ORDER BY difficulty_level, name;

-- Get activities by type
SELECT * FROM study_activities 
WHERE activity_type = $1 
ORDER BY difficulty_level;

-- Get recommended activities for user level
SELECT sa.*, 
       COUNT(ss.id) as usage_count,
       AVG(ss.duration_minutes) as avg_duration
FROM study_activities sa
LEFT JOIN study_sessions ss ON sa.id = ss.activity_id
WHERE sa.difficulty_level <= $1
GROUP BY sa.id
ORDER BY usage_count DESC, sa.difficulty_level;
```

### 2. Flashcard Activities
```sql
-- Get flashcard content for study session
SELECT 
    CASE ui.item_type 
        WHEN 'word' THEN w.english
        WHEN 'kanji' THEN k.character
        WHEN 'grammar' THEN gp.key
    END as front_content,
    CASE ui.item_type 
        WHEN 'word' THEN w.kana || ' - ' || w.kanji
        WHEN 'kanji' THEN k.meanings[1] || ' - ' || k.onyomi
        WHEN 'grammar' THEN gp.structure
    END as back_content,
    ui.item_type,
    ui.item_id
FROM unit_items ui
LEFT JOIN words w ON ui.item_type = 'word' AND ui.item_id = w.id
LEFT JOIN kanji k ON ui.item_type = 'kanji' AND ui.item_id = k.id
LEFT JOIN grammar_points gp ON ui.item_type = 'grammar' AND ui.item_id = gp.id
WHERE ui.unit_id = $1
ORDER BY RANDOM()
LIMIT $2;

-- Get spaced repetition flashcards
SELECT p.*, 
       CASE p.item_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
       END as front_content,
       CASE p.item_type 
         WHEN 'word' THEN w.kana
         WHEN 'kanji' THEN k.meanings[1]
         WHEN 'grammar' THEN gp.structure
       END as back_content
FROM progress p
LEFT JOIN words w ON p.item_type = 'word' AND p.item_id = w.id
LEFT JOIN kanji k ON p.item_type = 'kanji' AND p.item_id = k.id
LEFT JOIN grammar_points gp ON p.item_type = 'grammar' AND p.item_id = gp.id
WHERE p.user_id = $1 AND p.next_due <= NOW()
ORDER BY p.next_due
LIMIT $2;
```

### 3. Writing Practice Activities
```sql
-- Get kanji for writing practice
SELECT k.character, k.meanings, k.stroke_count, k.strokes_svg
FROM kanji k
WHERE k.jlpt = $1 AND k.stroke_count BETWEEN $2 AND $3
ORDER BY RANDOM()
LIMIT $4;

-- Record kanji writing practice
INSERT INTO kanji_traces (user_id, kanji_id, stroke_data, accuracy_score, practice_time)
VALUES ($1, $2, $3, $4, $5);

-- Get writing practice history
SELECT kt.*, k.character, k.meanings
FROM kanji_traces kt
JOIN kanji k ON kt.kanji_id = k.id
WHERE kt.user_id = $1
ORDER BY kt.created_at DESC
LIMIT $2;

-- Get writing improvement over time
SELECT 
    DATE(created_at) as practice_date,
    COUNT(*) as practice_count,
    AVG(accuracy_score) as avg_accuracy,
    AVG(practice_time) as avg_time
FROM kanji_traces 
WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY practice_date;
```

### 4. Listening Activities
```sql
-- Get listening exercises
SELECT lq.*, q.level, q.tag
FROM jlpt_listening_questions lq
JOIN jlpt_questions q ON lq.question_id = q.id
WHERE q.level = $1 AND q.tag = 'listen'
ORDER BY RANDOM()
LIMIT $2;

-- Get listening practice with audio
SELECT 
    lq.audio_url,
    lq.audio_duration,
    lq.transcript,
    lq.answers,
    lq.correct_answer_index,
    q.level,
    q.level_of_difficult
FROM jlpt_listening_questions lq
JOIN jlpt_questions q ON lq.question_id = q.id
WHERE q.level BETWEEN $1 AND $2
ORDER BY q.level_of_difficult, RANDOM()
LIMIT $3;
```

### 5. Grammar Practice Activities
```sql
-- Get grammar exercises
SELECT gq.*, q.level, q.level_of_difficult
FROM jlpt_grammar_questions gq
JOIN jlpt_questions q ON gq.question_id = q.id
WHERE q.level = $1 AND q.tag = 'grammar'
ORDER BY q.level_of_difficult, RANDOM()
LIMIT $2;

-- Get grammar pattern practice
SELECT gp.*, ge.japanese, ge.english
FROM grammar_points gp
LEFT JOIN grammar_examples ge ON gp.id = ge.grammar_id
WHERE gp.level = $1
ORDER BY RANDOM()
LIMIT $2;
```

## API Endpoints (Example)

### Activity Management
```javascript
// GET /api/activities - List all activities
// GET /api/activities/:id - Get activity details
// GET /api/activities/recommended - Get recommended activities
// POST /api/activities/:id/start - Start activity session
```

### Study Sessions
```javascript
// POST /api/study/session/start - Start new session
// POST /api/study/session/:id/end - End session
// GET /api/study/session/:id/progress - Get session progress
// POST /api/study/review - Submit review answer
```

### Writing Practice
```javascript
// GET /api/writing/kanji/:level - Get kanji for writing
// POST /api/writing/practice - Submit writing practice
// GET /api/writing/history - Get practice history
// GET /api/writing/progress - Get writing progress
```

## Advanced Activity Features

### 1. Adaptive Difficulty
```sql
-- Adjust activity difficulty based on user performance
CREATE OR REPLACE FUNCTION get_adaptive_activity_difficulty(p_user_id BIGINT, p_activity_type TEXT)
RETURNS INT AS $$
DECLARE
    user_accuracy NUMERIC;
    recommended_difficulty INT;
BEGIN
    -- Get user's recent performance
    SELECT AVG(ar.accuracy_score) INTO user_accuracy
    FROM activity_results ar
    JOIN study_sessions ss ON ar.session_id = ss.id
    WHERE ss.user_id = p_user_id 
      AND ar.activity_type = p_activity_type
      AND ar.created_at >= NOW() - INTERVAL '7 days';
    
    -- Adjust difficulty based on performance
    IF user_accuracy IS NULL THEN
        recommended_difficulty := 1;  -- Start with beginner
    ELSIF user_accuracy > 0.9 THEN
        recommended_difficulty := 3;  -- Advanced
    ELSIF user_accuracy > 0.7 THEN
        recommended_difficulty := 2;  -- Intermediate
    ELSE
        recommended_difficulty := 1;  -- Beginner
    END IF;
    
    RETURN recommended_difficulty;
END;
$$ LANGUAGE plpgsql;
```

### 2. Activity Sequencing
```sql
-- Generate optimal activity sequence
WITH user_progress AS (
    SELECT item_type, AVG(correct_cnt::numeric / seen_cnt) as mastery
    FROM progress 
    WHERE user_id = $1 AND seen_cnt >= 3
    GROUP BY item_type
),
activity_recommendations AS (
    SELECT 
        sa.id,
        sa.name,
        sa.activity_type,
        sa.difficulty_level,
        CASE 
            WHEN up.mastery IS NULL THEN 1.0  -- New content
            WHEN up.mastery < 0.6 THEN 0.9    -- Needs practice
            WHEN up.mastery < 0.8 THEN 0.7    -- Moderate practice
            ELSE 0.3                          -- Review
        END as priority_score
    FROM study_activities sa
    LEFT JOIN user_progress up ON sa.activity_type = up.item_type
    WHERE sa.is_active = true
)
SELECT * FROM activity_recommendations
ORDER BY priority_score DESC, difficulty_level
LIMIT 5;
```

### 3. Gamification Features
```sql
-- Track user achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id BIGINT)
RETURNS TABLE(achievement_name TEXT, achievement_description TEXT) AS $$
BEGIN
    RETURN QUERY
    -- Daily study streak achievement
    SELECT 
        'Study Streak'::TEXT,
        'Studied for ' || streak_count || ' consecutive days'::TEXT
    FROM (
        WITH daily_study AS (
            SELECT DATE(created_at) as study_date
            FROM study_sessions 
            WHERE user_id = p_user_id
            GROUP BY DATE(created_at)
        ),
        streak_calc AS (
            SELECT study_date,
                   ROW_NUMBER() OVER (ORDER BY study_date DESC) as rn,
                   study_date - ROW_NUMBER() OVER (ORDER BY study_date DESC) * INTERVAL '1 day' as grp
            FROM daily_study
        )
        SELECT COUNT(*) as streak_count
        FROM streak_calc 
        WHERE grp = (SELECT grp FROM streak_calc WHERE rn = 1)
    ) streak_data
    WHERE streak_count >= 7;
    
    -- Mastery achievement
    RETURN QUERY
    SELECT 
        'Master Learner'::TEXT,
        'Mastered ' || mastered_count || ' items'::TEXT
    FROM (
        SELECT COUNT(*) as mastered_count
        FROM progress 
        WHERE user_id = p_user_id AND correct_cnt >= 5
    ) mastery_data
    WHERE mastered_count >= 100;
END;
$$ LANGUAGE plpgsql;
```

### 4. Activity Performance Analytics
```sql
-- Get detailed activity performance
SELECT 
    sa.name as activity_name,
    sa.activity_type,
    COUNT(ss.id) as total_sessions,
    AVG(ss.duration_minutes) as avg_duration,
    AVG(ar.accuracy_score) as avg_accuracy,
    COUNT(DISTINCT ss.user_id) as unique_users
FROM study_activities sa
LEFT JOIN study_sessions ss ON sa.id = ss.activity_id
LEFT JOIN activity_results ar ON ss.id = ar.session_id
WHERE ss.created_at >= NOW() - INTERVAL '30 days'
GROUP BY sa.id, sa.name, sa.activity_type
ORDER BY total_sessions DESC;

-- Get user activity preferences
SELECT 
    sa.activity_type,
    COUNT(*) as usage_count,
    AVG(ss.duration_minutes) as avg_session_time,
    AVG(ar.accuracy_score) as avg_performance
FROM study_sessions ss
JOIN study_activities sa ON ss.activity_id = sa.id
LEFT JOIN activity_results ar ON ss.id = ar.session_id
WHERE ss.user_id = $1
GROUP BY sa.activity_type
ORDER BY usage_count DESC;
```

## Activity Types

### 1. Flashcard Activities
- **Traditional Flashcards**: Front/back card flipping
- **Spaced Repetition**: Algorithm-based review scheduling
- **Multi-modal**: Text, audio, and visual content
- **Progressive Disclosure**: Gradual information reveal

### 2. Writing Practice
- **Stroke Order Practice**: Kanji writing with stroke guidance
- **Free Writing**: Unrestricted writing practice
- **Tracing Exercises**: Guided writing practice
- **Accuracy Scoring**: Real-time feedback on writing quality

### 3. Listening Activities
- **Audio Comprehension**: Listen and understand exercises
- **Dictation Practice**: Write what you hear
- **Speed Listening**: Variable speed audio playback
- **Accent Recognition**: Different speaker accents

### 4. Grammar Practice
- **Pattern Recognition**: Identify grammar patterns
- **Sentence Construction**: Build sentences with grammar points
- **Error Correction**: Find and fix grammar mistakes
- **Context Usage**: Use grammar in context

### 5. Interactive Games
- **Word Association**: Connect related words
- **Kanji Components**: Build kanji from components
- **Grammar Chains**: Create grammar pattern sequences
- **Speed Challenges**: Timed learning challenges

## Performance Optimization

### 1. Activity Indexes
```sql
-- Indexes for activity queries
CREATE INDEX idx_study_sessions_user_activity ON study_sessions(user_id, activity_id);
CREATE INDEX idx_activity_results_session ON activity_results(session_id);
CREATE INDEX idx_kanji_traces_user_date ON kanji_traces(user_id, created_at);
```

### 2. Caching Strategy
- Activity content caching
- User progress caching
- Achievement calculation caching
- Session state caching

### 3. Real-time Features
- Live progress tracking
- Real-time feedback
- Collaborative study sessions
- Instant achievement notifications 