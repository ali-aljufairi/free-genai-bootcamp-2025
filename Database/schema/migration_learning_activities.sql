-- Migration: Simplified Activity-Based Tracking System
-- This migration replaces complex session tracking with unified learning activities
-- Adds progression control based on correct answer thresholds

-- =====================================================
-- PHASE 1: NEW TABLES
-- =====================================================

-- Learning Activities Table (Unified activity tracking)
CREATE TABLE learning_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Activity classification
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'flashcards', 'srs_review', 'jlpt_practice',
        'kanji_study', 'grammar_study', 'vocabulary_review'
    )),
    content_type TEXT NOT NULL CHECK (content_type IN (
        'word', 'kanji', 'grammar', 'jlpt_question', 'sentence'
    )),

    -- Content scope (flexible targeting)
    jlpt_level INT CHECK (jlpt_level BETWEEN 1 AND 5),
    course_id INT,
    unit_id INT,
    group_id INT,  -- For user-created study groups
    item_ids BIGINT[],  -- Array of specific item IDs practiced

    -- Performance metrics
    item_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    total_time_seconds INT NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Metadata
    config JSONB DEFAULT '{}',  -- Activity-specific configuration
    device_type TEXT,
    location TEXT,

    -- Constraints
    CHECK (completed_at IS NULL OR completed_at >= started_at),
    CHECK (correct_count <= item_count)
);

-- Progression Settings Table (Configurable advancement thresholds)
CREATE TABLE progression_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Scope (NULL = global default, specific IDs = overrides)
    course_id INT,
    unit_id INT,
    jlpt_level INT CHECK (jlpt_level BETWEEN 1 AND 5),
    group_id INT,

    -- Advancement thresholds
    required_correct_ratio NUMERIC(3,2) NOT NULL DEFAULT 0.80
        CHECK (required_correct_ratio BETWEEN 0.1 AND 1.0),
    minimum_attempts INT NOT NULL DEFAULT 3
        CHECK (minimum_attempts >= 1),
    consecutive_correct INT NOT NULL DEFAULT 2
        CHECK (consecutive_correct >= 1),

    -- Auto-progression settings
    auto_advance BOOLEAN NOT NULL DEFAULT TRUE,
    advance_on_course_completion BOOLEAN NOT NULL DEFAULT TRUE,
    advance_on_unit_completion BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure only one setting per scope per user
    UNIQUE(user_id, course_id, unit_id, jlpt_level, group_id)
);

-- =====================================================
-- PHASE 2: INDEXES FOR PERFORMANCE
-- =====================================================

-- Learning Activities indexes
CREATE INDEX idx_learning_activities_user ON learning_activities(user_id);
CREATE INDEX idx_learning_activities_type ON learning_activities(activity_type, content_type);
CREATE INDEX idx_learning_activities_time ON learning_activities(started_at, completed_at);
CREATE INDEX idx_learning_activities_scope ON learning_activities(course_id, unit_id, jlpt_level, group_id);
CREATE INDEX idx_learning_activities_completed ON learning_activities(completed_at) WHERE completed_at IS NOT NULL;

-- Progression Settings indexes
CREATE INDEX idx_progression_settings_user ON progression_settings(user_id);
CREATE INDEX idx_progression_settings_scope ON progression_settings(course_id, unit_id, jlpt_level, group_id);

-- =====================================================
-- PHASE 3: DEFAULT PROGRESSION SETTINGS
-- =====================================================

-- Insert default global settings for all existing users
INSERT INTO progression_settings (
    user_id,
    required_correct_ratio,
    minimum_attempts,
    consecutive_correct,
    auto_advance,
    advance_on_course_completion,
    advance_on_unit_completion
)
SELECT
    id as user_id,
    0.80 as required_correct_ratio,  -- 80% correct
    3 as minimum_attempts,           -- At least 3 attempts
    2 as consecutive_correct,        -- 2 in a row correct
    TRUE as auto_advance,
    TRUE as advance_on_course_completion,
    TRUE as advance_on_unit_completion
FROM users;

-- =====================================================
-- PHASE 4: MIGRATION FUNCTIONS
-- =====================================================

-- Function to get progression settings for a user and scope
CREATE OR REPLACE FUNCTION get_progression_settings(
    p_user_id BIGINT,
    p_course_id INT DEFAULT NULL,
    p_unit_id INT DEFAULT NULL,
    p_jlpt_level INT DEFAULT NULL,
    p_group_id INT DEFAULT NULL
)
RETURNS TABLE (
    required_correct_ratio NUMERIC,
    minimum_attempts INT,
    consecutive_correct INT,
    auto_advance BOOLEAN,
    advance_on_course_completion BOOLEAN,
    advance_on_unit_completion BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.required_correct_ratio,
        ps.minimum_attempts,
        ps.consecutive_correct,
        ps.auto_advance,
        ps.advance_on_course_completion,
        ps.advance_on_unit_completion
    FROM progression_settings ps
    WHERE ps.user_id = p_user_id
      AND (
          -- Exact match for specific scope
          (ps.course_id = p_course_id AND ps.unit_id = p_unit_id AND ps.jlpt_level = p_jlpt_level AND ps.group_id = p_group_id)
          -- Or fallback to global settings (all NULL)
          OR (ps.course_id IS NULL AND ps.unit_id IS NULL AND ps.jlpt_level IS NULL AND ps.group_id IS NULL)
      )
    ORDER BY
        -- Prefer specific settings over global
        CASE WHEN ps.course_id IS NOT NULL OR ps.unit_id IS NOT NULL OR ps.jlpt_level IS NOT NULL OR ps.group_id IS NOT NULL
             THEN 1 ELSE 2 END,
        ps.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has mastered content based on settings
CREATE OR REPLACE FUNCTION check_content_mastery(
    p_user_id BIGINT,
    p_course_id INT DEFAULT NULL,
    p_unit_id INT DEFAULT NULL,
    p_jlpt_level INT DEFAULT NULL,
    p_group_id INT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    settings RECORD;
    total_items INT := 0;
    mastered_items INT := 0;
BEGIN
    -- Get progression settings
    SELECT * INTO settings FROM get_progression_settings(p_user_id, p_course_id, p_unit_id, p_jlpt_level, p_group_id);
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Count total items in scope
    SELECT COUNT(*) INTO total_items
    FROM unit_items ui
    WHERE (p_unit_id IS NOT NULL AND ui.unit_id = p_unit_id)
       OR (p_course_id IS NOT NULL AND ui.unit_id IN (SELECT id FROM units WHERE course_id = p_course_id))
       OR (p_group_id IS NOT NULL AND ui.unit_id IN (
           SELECT sgw.word_id FROM study_group_words sgw WHERE sgw.group_id = p_group_id
       ));

    -- Count mastered items based on progression settings
    -- This is a simplified version - in practice you'd check SRS progress
    SELECT COUNT(*) INTO mastered_items
    FROM unit_items ui
    JOIN progress p ON p.item_type = ui.item_type AND p.item_id = ui.item_id
    WHERE p.user_id = p_user_id
      AND p.correct_cnt >= settings.consecutive_correct
      AND ((p_unit_id IS NOT NULL AND ui.unit_id = p_unit_id)
        OR (p_course_id IS NOT NULL AND ui.unit_id IN (SELECT id FROM units WHERE course_id = p_course_id))
        OR (p_group_id IS NOT NULL AND ui.unit_id IN (
            SELECT sgw.word_id FROM study_group_words sgw WHERE sgw.group_id = p_group_id
        )));

    -- Check if enough items are mastered
    RETURN mastered_items >= total_items AND total_items > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to record a learning activity
CREATE OR REPLACE FUNCTION record_learning_activity(
    p_user_id BIGINT,
    p_activity_type TEXT,
    p_content_type TEXT,
    p_item_count INT,
    p_correct_count INT,
    p_total_time_seconds INT,
    p_course_id INT DEFAULT NULL,
    p_unit_id INT DEFAULT NULL,
    p_jlpt_level INT DEFAULT NULL,
    p_group_id INT DEFAULT NULL,
    p_item_ids BIGINT[] DEFAULT NULL,
    p_config JSONB DEFAULT '{}',
    p_device_type TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    activity_id BIGINT;
BEGIN
    INSERT INTO learning_activities (
        user_id, activity_type, content_type, item_count, correct_count,
        total_time_seconds, course_id, unit_id, jlpt_level, group_id,
        item_ids, config, device_type, location
    ) VALUES (
        p_user_id, p_activity_type, p_content_type, p_item_count, p_correct_count,
        p_total_time_seconds, p_course_id, p_unit_id, p_jlpt_level, p_group_id,
        p_item_ids, p_config, p_device_type, p_location
    ) RETURNING id INTO activity_id;

    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 5: DATA MIGRATION (Optional - run after testing)
-- =====================================================

-- Migrate enhanced study sessions to learning activities
-- (Uncomment and run after testing the new system)
/*
INSERT INTO learning_activities (
    user_id, activity_type, content_type,
    item_count, correct_count, total_time_seconds,
    started_at, completed_at, config
)
SELECT
    user_id,
    CASE session_type
        WHEN 'vocabulary_review' THEN 'flashcards'
        WHEN 'kanji_study' THEN 'kanji_study'
        ELSE 'vocabulary_review'
    END,
    CASE session_type
        WHEN 'vocabulary_review' THEN 'word'
        WHEN 'kanji_study' THEN 'kanji'
        ELSE 'word'
    END,
    COALESCE(total_items, 0),
    COALESCE(total_correct, 0),
    EXTRACT(EPOCH FROM (COALESCE(ended_at, started_at) - started_at))::INT,
    started_at,
    ended_at,
    COALESCE(notes::JSONB, '{}'::JSONB)
FROM enhanced_study_sessions
WHERE ended_at IS NOT NULL;
*/

-- =====================================================
-- PHASE 6: CLEANUP (Run after migration verification)
-- =====================================================

-- Drop old tables after data migration and testing
-- (Uncomment after thorough testing)
/*
DROP TABLE IF EXISTS enhanced_study_sessions;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS review_items;
ALTER TABLE words DROP COLUMN IF EXISTS correct_count;
*/