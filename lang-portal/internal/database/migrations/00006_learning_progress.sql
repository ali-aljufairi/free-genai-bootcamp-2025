-- +goose Up
-- +goose StatementBegin
/* 7. STUDY FLOW & SPACED REPETITION --------------------------------- */
CREATE TABLE study_activities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    activity_type activity_enum NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE study_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    activity_id INT REFERENCES study_activities (id),
    unit_id INT REFERENCES units (id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_study_sessions_user ON study_sessions (user_id);

CREATE TABLE review_items (
    session_id BIGINT REFERENCES study_sessions (id) ON DELETE CASCADE,
    item_type review_item_enum NOT NULL,
    item_id INT NOT NULL,
    correct BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (
        session_id,
        item_type,
        item_id
    )
);

CREATE INDEX idx_review_items_item ON review_items (item_type, item_id);

/*  🔹  Enhanced analytics for SRS  🔹  */
CREATE TABLE progress (
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    item_type review_item_enum NOT NULL,
    item_id INT NOT NULL,
    seen_cnt INT DEFAULT 0, -- total attempts
    correct_cnt INT DEFAULT 0, -- total correct
    incorrect_cnt INT GENERATED ALWAYS AS (seen_cnt - correct_cnt) STORED,
    last_seen TIMESTAMPTZ,
    next_due TIMESTAMPTZ,
    PRIMARY KEY (user_id, item_type, item_id)
);

CREATE INDEX idx_progress_due ON progress (user_id, next_due);

-- =====================================================
-- USER QUESTION TRACKING SYSTEM
-- =====================================================
-- Comprehensive tracking for JLPT questions, kanji, and vocabulary
-- =====================================================

-- Extend existing enums for user tracking
ALTER TYPE review_item_enum ADD VALUE IF NOT EXISTS 'jlpt_question';

-- Note: question_understanding_level and confidence_level_enum are defined in 00002_enums.sql

-- JLPT Question Attempts - Detailed tracking of each attempt
CREATE TABLE jlpt_question_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES jlpt_questions(id) ON DELETE CASCADE,
    session_id BIGINT REFERENCES study_sessions(id) ON DELETE CASCADE,

-- Question Interaction Details
started_at TIMESTAMPTZ DEFAULT now(),
completed_at TIMESTAMPTZ,
time_spent_seconds INTEGER CHECK (time_spent_seconds >= 0),

-- Answer Details
selected_answer_index INTEGER CHECK (selected_answer_index >= 0),
is_correct BOOLEAN NOT NULL,
confidence_level confidence_level_enum,

-- Understanding Assessment
explanation_read BOOLEAN DEFAULT FALSE,
explanation_time_spent_seconds INTEGER CHECK (
    explanation_time_spent_seconds >= 0
),
marked_for_review BOOLEAN DEFAULT FALSE,

-- Metadata


attempt_number INTEGER DEFAULT 1 CHECK (attempt_number > 0),
    device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE (user_id, question_id, attempt_number)
);

-- JLPT Question Progress - Aggregated progress tracking
CREATE TABLE jlpt_question_progress (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES jlpt_questions(id) ON DELETE CASCADE,

-- Attempt Statistics
total_attempts INTEGER DEFAULT 0 CHECK (total_attempts >= 0),
correct_attempts INTEGER DEFAULT 0 CHECK (correct_attempts >= 0),
incorrect_attempts INTEGER DEFAULT 0 CHECK (incorrect_attempts >= 0),
accuracy_rate NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
        WHEN total_attempts = 0 THEN 0
        ELSE ROUND(
            (
                correct_attempts::NUMERIC / total_attempts
            ) * 100,
            2
        )
    END
) STORED,

-- Understanding Metrics
average_time_spent_seconds NUMERIC(8, 2),
explanation_read_count INTEGER DEFAULT 0 CHECK (explanation_read_count >= 0),
marked_for_review_count INTEGER DEFAULT 0 CHECK (marked_for_review_count >= 0),

-- Learning Progress
first_attempted_at TIMESTAMPTZ,
last_attempted_at TIMESTAMPTZ,
mastered_at TIMESTAMPTZ,
next_review_at TIMESTAMPTZ,

-- Understanding Level
understanding_level question_understanding_level DEFAULT 'not_attempted',
consecutive_correct INTEGER DEFAULT 0 CHECK (consecutive_correct >= 0),
consecutive_incorrect INTEGER DEFAULT 0 CHECK (consecutive_incorrect >= 0),

-- Difficulty Assessment
perceived_difficulty INTEGER CHECK (
    perceived_difficulty BETWEEN 1 AND 5
),

-- Metadata


last_updated TIMESTAMPTZ DEFAULT now(),
    
    PRIMARY KEY (user_id, question_id)
);

-- Kanji Learning Progress - Enhanced kanji tracking
CREATE TABLE kanji_learning_progress (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    kanji_id INT REFERENCES kanji(id) ON DELETE CASCADE,

-- Basic Progress
seen_cnt INTEGER DEFAULT 0 CHECK (seen_cnt >= 0),
correct_cnt INTEGER DEFAULT 0 CHECK (correct_cnt >= 0),
incorrect_cnt INTEGER GENERATED ALWAYS AS (seen_cnt - correct_cnt) STORED,

-- Kanji-Specific Metrics
reading_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    reading_accuracy BETWEEN 0 AND 100
),
writing_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    writing_accuracy BETWEEN 0 AND 100
),
meaning_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    meaning_accuracy BETWEEN 0 AND 100
),

-- Stroke Order Tracking
stroke_order_attempts INTEGER DEFAULT 0 CHECK (stroke_order_attempts >= 0),
stroke_order_correct INTEGER DEFAULT 0 CHECK (stroke_order_correct >= 0),
stroke_order_accuracy NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
        WHEN stroke_order_attempts = 0 THEN 0
        ELSE ROUND(
            (
                stroke_order_correct::NUMERIC / stroke_order_attempts
            ) * 100,
            2
        )
    END
) STORED,

-- Learning Stages
reading_mastered BOOLEAN DEFAULT FALSE,
writing_mastered BOOLEAN DEFAULT FALSE,
meaning_mastered BOOLEAN DEFAULT FALSE,
stroke_order_mastered BOOLEAN DEFAULT FALSE,
fully_mastered BOOLEAN DEFAULT FALSE,

-- Timing
first_seen TIMESTAMPTZ,
last_seen TIMESTAMPTZ,
next_review TIMESTAMPTZ,

-- Understanding


understanding_level question_understanding_level DEFAULT 'not_attempted',
    confidence_level confidence_level_enum,
    
    PRIMARY KEY (user_id, kanji_id)
);

-- Vocabulary Learning Progress - Enhanced vocabulary tracking
CREATE TABLE vocabulary_learning_progress (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    word_id INT REFERENCES words(id) ON DELETE CASCADE,

-- Basic Progress
seen_cnt INTEGER DEFAULT 0 CHECK (seen_cnt >= 0),
correct_cnt INTEGER DEFAULT 0 CHECK (correct_cnt >= 0),
incorrect_cnt INTEGER GENERATED ALWAYS AS (seen_cnt - correct_cnt) STORED,

-- Vocabulary-Specific Metrics
meaning_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    meaning_accuracy BETWEEN 0 AND 100
),
reading_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    reading_accuracy BETWEEN 0 AND 100
),
writing_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    writing_accuracy BETWEEN 0 AND 100
),
listening_accuracy NUMERIC(5, 2) DEFAULT 0 CHECK (
    listening_accuracy BETWEEN 0 AND 100
),

-- Usage Tracking
used_in_sentences INTEGER DEFAULT 0 CHECK (used_in_sentences >= 0),
used_in_conversations INTEGER DEFAULT 0 CHECK (used_in_conversations >= 0),

-- Learning Stages
meaning_mastered BOOLEAN DEFAULT FALSE,
reading_mastered BOOLEAN DEFAULT FALSE,
writing_mastered BOOLEAN DEFAULT FALSE,
listening_mastered BOOLEAN DEFAULT FALSE,
fully_mastered BOOLEAN DEFAULT FALSE,

-- Timing
first_seen TIMESTAMPTZ,
last_seen TIMESTAMPTZ,
next_review TIMESTAMPTZ,

-- Understanding


understanding_level question_understanding_level DEFAULT 'not_attempted',
    confidence_level confidence_level_enum,
    
    PRIMARY KEY (user_id, word_id)
);

-- User Learning Analytics - User-level analytics
CREATE TABLE user_learning_analytics (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,

-- Study Habits
preferred_study_time TIME,
average_session_duration_minutes INTEGER DEFAULT 0 CHECK (
    average_session_duration_minutes >= 0
),
questions_per_session_avg NUMERIC(5, 2) DEFAULT 0 CHECK (
    questions_per_session_avg >= 0
),

-- Performance by Category
accuracy_by_jlpt_level JSONB DEFAULT '{}'::jsonb,
accuracy_by_question_type JSONB DEFAULT '{}'::jsonb,
accuracy_by_kanji_level JSONB DEFAULT '{}'::jsonb,
accuracy_by_vocabulary_level JSONB DEFAULT '{}'::jsonb,

-- Time Analysis
time_spent_by_question_type JSONB DEFAULT '{}'::jsonb,
time_spent_by_jlpt_level JSONB DEFAULT '{}'::jsonb,

-- Learning Preferences
prefers_audio BOOLEAN DEFAULT FALSE,
prefers_visual BOOLEAN DEFAULT FALSE,
reads_explanations BOOLEAN DEFAULT FALSE,
marks_for_review BOOLEAN DEFAULT FALSE,

-- Progress Metrics
total_study_time_hours NUMERIC(8, 2) DEFAULT 0 CHECK (total_study_time_hours >= 0),
total_questions_attempted INTEGER DEFAULT 0 CHECK (
    total_questions_attempted >= 0
),
total_questions_mastered INTEGER DEFAULT 0 CHECK (total_questions_mastered >= 0),
total_kanji_learned INTEGER DEFAULT 0 CHECK (total_kanji_learned >= 0),
total_vocabulary_learned INTEGER DEFAULT 0 CHECK (total_vocabulary_learned >= 0),

-- Streaks and Motivation
current_streak_days INTEGER DEFAULT 0 CHECK (current_streak_days >= 0),
longest_streak_days INTEGER DEFAULT 0 CHECK (longest_streak_days >= 0),
total_study_days INTEGER DEFAULT 0 CHECK (total_study_days >= 0),

-- Learning Goals
target_jlpt_level INTEGER CHECK (
    target_jlpt_level BETWEEN 1 AND 5
),
target_kanji_count INTEGER DEFAULT 0 CHECK (target_kanji_count >= 0),
target_vocabulary_count INTEGER DEFAULT 0 CHECK (target_vocabulary_count >= 0),

-- Metadata
last_updated TIMESTAMPTZ DEFAULT now() );

-- Enhanced Study Sessions - Detailed session tracking
CREATE TABLE enhanced_study_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    session_type TEXT CHECK (session_type IN ('jlpt_practice', 'kanji_study', 'vocabulary_review', 'mixed')),
    notes JSONB,

-- Session Details
started_at TIMESTAMPTZ DEFAULT now(),
ended_at TIMESTAMPTZ,
duration_minutes INTEGER CHECK (duration_minutes >= 0),

-- Content Covered
jlpt_questions_attempted INTEGER DEFAULT 0 CHECK (jlpt_questions_attempted >= 0),
kanji_reviewed INTEGER DEFAULT 0 CHECK (kanji_reviewed >= 0),
vocabulary_reviewed INTEGER DEFAULT 0 CHECK (vocabulary_reviewed >= 0),

-- Performance
total_correct INTEGER DEFAULT 0 CHECK (total_correct >= 0),
total_incorrect INTEGER DEFAULT 0 CHECK (total_incorrect >= 0),
session_accuracy NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
        WHEN (
            total_correct + total_incorrect
        ) = 0 THEN 0
        ELSE ROUND(
            (
                total_correct::NUMERIC / (
                    total_correct + total_incorrect
                )
            ) * 100,
            2
        )
    END
) STORED,

-- Focus Areas
jlpt_levels_covered INTEGER[],
kanji_levels_covered INTEGER[],
vocabulary_levels_covered INTEGER[],

-- Session Quality
focus_score INTEGER CHECK (focus_score BETWEEN 1 AND 10),
difficulty_level TEXT CHECK (
    difficulty_level IN (
        'easy',
        'medium',
        'hard',
        'mixed'
    )
),

-- Metadata


device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
    location TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for User Tracking Tables
CREATE INDEX idx_jlpt_attempts_user_question ON jlpt_question_attempts (user_id, question_id);

CREATE INDEX idx_jlpt_attempts_session ON jlpt_question_attempts (session_id);

CREATE INDEX idx_jlpt_attempts_created ON jlpt_question_attempts (created_at);

CREATE INDEX idx_jlpt_progress_user ON jlpt_question_progress (user_id);

CREATE INDEX idx_jlpt_progress_accuracy ON jlpt_question_progress (accuracy_rate);

CREATE INDEX idx_jlpt_progress_next_review ON jlpt_question_progress (next_review_at);

CREATE INDEX idx_jlpt_progress_understanding ON jlpt_question_progress (understanding_level);

CREATE INDEX idx_kanji_progress_user ON kanji_learning_progress (user_id);

CREATE INDEX idx_kanji_progress_accuracy ON kanji_learning_progress (
    reading_accuracy,
    writing_accuracy,
    meaning_accuracy
);

CREATE INDEX idx_kanji_progress_next_review ON kanji_learning_progress (next_review);

CREATE INDEX idx_kanji_progress_mastered ON kanji_learning_progress (fully_mastered);

CREATE INDEX idx_vocab_progress_user ON vocabulary_learning_progress (user_id);

CREATE INDEX idx_vocab_progress_accuracy ON vocabulary_learning_progress (
    meaning_accuracy,
    reading_accuracy
);

CREATE INDEX idx_vocab_progress_next_review ON vocabulary_learning_progress (next_review);

CREATE INDEX idx_vocab_progress_mastered ON vocabulary_learning_progress (fully_mastered);

CREATE INDEX idx_enhanced_sessions_user ON enhanced_study_sessions (user_id);

CREATE INDEX idx_enhanced_sessions_type ON enhanced_study_sessions (session_type);

CREATE INDEX idx_enhanced_sessions_created ON enhanced_study_sessions (created_at);

-- Views for Easy Querying
CREATE VIEW user_learning_dashboard AS
SELECT
    u.id as user_id,
    u.display_name,
    ula.total_study_time_hours,
    ula.total_questions_attempted,
    ula.total_questions_mastered,
    ula.total_kanji_learned,
    ula.total_vocabulary_learned,
    ula.current_streak_days,
    ula.longest_streak_days,
    ula.target_jlpt_level,
    ROUND(
        CASE
            WHEN ula.total_questions_attempted > 0 THEN (
                ula.total_questions_mastered::NUMERIC / ula.total_questions_attempted
            ) * 100
            ELSE 0
        END,
        2
    ) as overall_mastery_rate
FROM
    users u
    LEFT JOIN user_learning_analytics ula ON u.id = ula.user_id;

CREATE VIEW questions_needing_attention AS
SELECT jqp.user_id, jq.id as question_id, jq.title, jq.level, jq.tag, jqp.accuracy_rate, jqp.consecutive_incorrect, jqp.understanding_level, jqp.last_attempted_at
FROM
    jlpt_question_progress jqp
    JOIN jlpt_questions jq ON jqp.question_id = jq.id
WHERE
    jqp.accuracy_rate < 70
    OR jqp.consecutive_incorrect >= 3
    OR jqp.understanding_level = 'needs_review'
ORDER BY jqp.accuracy_rate ASC, jqp.consecutive_incorrect DESC;

CREATE VIEW user_study_sessions_summary AS
SELECT
    ess.user_id,
    ess.session_type,
    COUNT(*) as session_count,
    AVG(ess.duration_minutes) as avg_duration_minutes,
    AVG(ess.session_accuracy) as avg_session_accuracy,
    SUM(ess.jlpt_questions_attempted) as total_jlpt_questions,
    SUM(ess.kanji_reviewed) as total_kanji_reviewed,
    SUM(ess.vocabulary_reviewed) as total_vocabulary_reviewed,
    MAX(ess.created_at) as last_session_date
FROM enhanced_study_sessions ess
GROUP BY
    ess.user_id,
    ess.session_type
ORDER BY ess.user_id, ess.session_type;

-- JLPT Level Management System
-- Track user's JLPT level progression over time
CREATE TABLE user_jlpt_level_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    jlpt_level INT NOT NULL CHECK (jlpt_level BETWEEN 1 AND 5),
    assessment_method TEXT NOT NULL, -- 'manual', 'automatic', 'exam'
    assessment_date TIMESTAMPTZ DEFAULT NOW(),
    confidence_score NUMERIC(3, 2), -- 0.00 to 1.00
    notes TEXT
);

-- Index for efficient queries
CREATE INDEX idx_user_jlpt_history_user_date ON user_jlpt_level_history (user_id, assessment_date);

-- Automatically assess user's JLPT level based on performance
CREATE OR REPLACE FUNCTION assess_user_jlpt_level(p_user_id BIGINT)
RETURNS TABLE(
    assessed_level INT,
    confidence_score NUMERIC,
    assessment_method TEXT,
    details JSONB
) AS $$
DECLARE
    user_performance RECORD;
    level_requirements JSONB;
    assessed_level INT;
    confidence_score NUMERIC;
    assessment_details JSONB;
BEGIN
    -- Get user's performance by JLPT level
    SELECT 
        jsonb_object_agg(
            level::text, 
            jsonb_build_object(
                'total_questions', COUNT(*),
                'correct_answers', COUNT(CASE WHEN is_correct THEN 1 END),
                'accuracy', ROUND(COUNT(CASE WHEN is_correct THEN 1 END)::numeric / COUNT(*) * 100, 2)
            )
        ) as performance_by_level,
        jsonb_object_agg(
            level::text,
            COUNT(CASE WHEN is_correct THEN 1 END)::numeric / COUNT(*)
        ) as accuracy_by_level
    INTO user_performance
    FROM jlpt_question_attempts uqa
    JOIN jlpt_questions q ON uqa.question_id = q.id
    WHERE uqa.user_id = p_user_id
    GROUP BY level;
    
    -- Define level requirements (can be customized)
    level_requirements := '{
        "5": {"min_accuracy": 0.6, "min_questions": 50},
        "4": {"min_accuracy": 0.7, "min_questions": 100},
        "3": {"min_accuracy": 0.75, "min_questions": 150},
        "2": {"min_accuracy": 0.8, "min_questions": 200},
        "1": {"min_accuracy": 0.85, "min_questions": 250}
    }'::jsonb;
    
    -- Assess level based on performance
    FOR i IN 1..5 LOOP
        IF user_performance.accuracy_by_level ? i::text THEN
            IF (user_performance.accuracy_by_level ->> i::text)::numeric >= 
               (level_requirements ->> i::text)::jsonb ->> 'min_accuracy' THEN
                assessed_level := i;
                confidence_score := (user_performance.accuracy_by_level ->> i::text)::numeric;
                EXIT;
            END IF;
        END IF;
    END LOOP;
    
    -- If no level met, default to N5
    IF assessed_level IS NULL THEN
        assessed_level := 5;
        confidence_score := 0.5;
    END IF;
    
    -- Build assessment details
    assessment_details := jsonb_build_object(
        'performance_by_level', user_performance.performance_by_level,
        'level_requirements', level_requirements,
        'assessment_criteria', 'accuracy_threshold'
    );
    
    RETURN QUERY SELECT 
        assessed_level,
        confidence_score,
        'automatic'::TEXT,
        assessment_details;
END;
$$ LANGUAGE plpgsql;

-- Update user's JLPT level and log history
CREATE OR REPLACE FUNCTION update_user_jlpt_level(
    p_user_id BIGINT,
    p_new_level INT,
    p_assessment_method TEXT DEFAULT 'manual',
    p_confidence_score NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_level INT;
    assessment_result RECORD;
BEGIN
    -- Get current level
    SELECT current_jlpt_level INTO current_level
    FROM user_settings 
    WHERE user_id = p_user_id;
    
    -- If automatic assessment, run assessment
    IF p_assessment_method = 'automatic' THEN
        SELECT * INTO assessment_result
        FROM assess_user_jlpt_level(p_user_id);
        
        p_new_level := assessment_result.assessed_level;
        p_confidence_score := assessment_result.confidence_score;
    END IF;
    
    -- Update user settings
    UPDATE user_settings SET
        current_jlpt_level = p_new_level,
        jlpt_level_assessed_at = NOW(),
        jlpt_level_assessment_method = p_assessment_method
    WHERE user_id = p_user_id;
    
    -- Log level change in history
    INSERT INTO user_jlpt_level_history (
        user_id, jlpt_level, assessment_method, 
        confidence_score, notes
    ) VALUES (
        p_user_id, p_new_level, p_assessment_method,
        p_confidence_score, p_notes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get user's JLPT level with details
CREATE OR REPLACE FUNCTION get_user_jlpt_level(p_user_id BIGINT)
RETURNS TABLE(
    current_level INT,
    assessed_at TIMESTAMPTZ,
    assessment_method TEXT,
    confidence_score NUMERIC,
    level_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.current_jlpt_level,
        us.jlpt_level_assessed_at,
        us.jlpt_level_assessment_method,
        ujlh.confidence_score,
        CASE us.current_jlpt_level
            WHEN 1 THEN 'N1 (Advanced)'
            WHEN 2 THEN 'N2 (Pre-Advanced)'
            WHEN 3 THEN 'N3 (Intermediate)'
            WHEN 4 THEN 'N4 (Elementary)'
            WHEN 5 THEN 'N5 (Beginner)'
        END as level_name
    FROM user_settings us
    LEFT JOIN user_jlpt_level_history ujlh ON us.user_id = ujlh.user_id 
        AND ujlh.assessment_date = us.jlpt_level_assessed_at
    WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get level-appropriate content for user
CREATE OR REPLACE FUNCTION get_level_appropriate_content(
    p_user_id BIGINT,
    p_content_type TEXT DEFAULT 'all',
    p_limit INT DEFAULT 20
)
RETURNS TABLE(
    content_id INT,
    content_type TEXT,
    content_data JSONB,
    difficulty_level INT
) AS $$
DECLARE
    user_level INT;
BEGIN
    -- Get user's current level
    SELECT current_jlpt_level INTO user_level
    FROM user_settings 
    WHERE user_id = p_user_id;
    
    -- Return kanji appropriate for user's level
    IF p_content_type = 'all' OR p_content_type = 'kanji' THEN
        RETURN QUERY
        SELECT 
            k.id::INT,
            'kanji'::TEXT,
            jsonb_build_object(
                'character', k.character,
                'meanings', k.meanings,
                'onyomi', k.onyomi,
                'kunyomi', k.kunyomi,
                'stroke_count', k.stroke_count,
                'jlpt', k.jlpt
            ),
            k.jlpt
        FROM kanji k
        WHERE k.jlpt <= user_level
        ORDER BY k.frequency, RANDOM()
        LIMIT p_limit;
    END IF;
    
    -- Return words appropriate for user's level
    IF p_content_type = 'all' OR p_content_type = 'words' THEN
        RETURN QUERY
        SELECT 
            w.id::INT,
            'word'::TEXT,
            jsonb_build_object(
                'kanji', w.kanji,
                'kana', w.kana,
                'english', w.english,
                'jlpt', w.jlpt
            ),
            w.jlpt
        FROM words w
        WHERE w.jlpt <= user_level
        ORDER BY RANDOM()
        LIMIT p_limit;
    END IF;
    
    -- Return grammar appropriate for user's level
    IF p_content_type = 'all' OR p_content_type = 'grammar' THEN
        RETURN QUERY
        SELECT 
            gp.id::INT,
            'grammar'::TEXT,
            jsonb_build_object(
                'key', gp.key,
                'base_form', gp.base_form,
                'level', gp.level,
                'structure', gp.structure
            ),
            CASE gp.level
                WHEN 'N1' THEN 1
                WHEN 'N2' THEN 2
                WHEN 'N3' THEN 3
                WHEN 'N4' THEN 4
                WHEN 'N5' THEN 5
            END
        FROM grammar_points gp
        WHERE CASE gp.level
                WHEN 'N1' THEN 1
                WHEN 'N2' THEN 2
                WHEN 'N3' THEN 3
                WHEN 'N4' THEN 4
                WHEN 'N5' THEN 5
            END <= user_level
        ORDER BY RANDOM()
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View for JLPT level analytics
CREATE VIEW user_jlpt_level_analytics AS
SELECT
    u.id as user_id,
    u.display_name,
    us.current_jlpt_level,
    us.jlpt_level_assessed_at,
    us.jlpt_level_assessment_method,
    COUNT(ujlh.id) as level_changes_count,
    MIN(ujlh.assessment_date) as first_assessment,
    MAX(ujlh.assessment_date) as last_assessment,
    CASE us.current_jlpt_level
        WHEN 1 THEN 'N1 (Advanced)'
        WHEN 2 THEN 'N2 (Pre-Advanced)'
        WHEN 3 THEN 'N3 (Intermediate)'
        WHEN 4 THEN 'N4 (Elementary)'
        WHEN 5 THEN 'N5 (Beginner)'
    END as current_level_name
FROM
    users u
    JOIN user_settings us ON u.id = us.user_id
    LEFT JOIN user_jlpt_level_history ujlh ON u.id = ujlh.user_id
GROUP BY
    u.id,
    u.display_name,
    us.current_jlpt_level,
    us.jlpt_level_assessed_at,
    us.jlpt_level_assessment_method;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP VIEW IF EXISTS user_jlpt_level_analytics CASCADE;
DROP VIEW IF EXISTS user_study_sessions_summary CASCADE;
DROP VIEW IF EXISTS questions_needing_attention CASCADE;
DROP VIEW IF EXISTS user_learning_dashboard CASCADE;
DROP TABLE IF EXISTS user_jlpt_level_history CASCADE;
DROP TABLE IF EXISTS enhanced_study_sessions CASCADE;
DROP TABLE IF EXISTS user_learning_analytics CASCADE;
DROP TABLE IF EXISTS vocabulary_learning_progress CASCADE;
DROP TABLE IF EXISTS kanji_learning_progress CASCADE;
DROP TABLE IF EXISTS jlpt_question_progress CASCADE;
DROP TABLE IF EXISTS jlpt_question_attempts CASCADE;
DROP TABLE IF EXISTS review_items CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TYPE IF EXISTS confidence_level_enum CASCADE;
DROP TYPE IF EXISTS question_understanding_level CASCADE;
DROP FUNCTION IF EXISTS get_level_appropriate_content CASCADE;
DROP FUNCTION IF EXISTS get_user_jlpt_level CASCADE;
DROP FUNCTION IF EXISTS update_user_jlpt_level CASCADE;
DROP FUNCTION IF EXISTS assess_user_jlpt_level CASCADE;
-- +goose StatementEnd
