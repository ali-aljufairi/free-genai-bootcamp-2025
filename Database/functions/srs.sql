-- SRS (Spaced Repetition System) Database Schema and Functions
-- This file contains all necessary tables, types, and functions for the SRS system

-- Create enum type for review item types (already created in pg.sql)
-- CREATE TYPE review_item_enum AS ENUM ('word', 'kanji', 'grammar', 'sentence');

-- Create progress table for SRS tracking
CREATE TABLE IF NOT EXISTS progress (
    user_id BIGINT NOT NULL,
    item_type review_item_enum NOT NULL,
    item_id INT NOT NULL,
    seen_cnt INT DEFAULT 0,
    correct_cnt INT DEFAULT 0,
    incorrect_cnt INT GENERATED ALWAYS AS (seen_cnt - correct_cnt) STORED,
    last_seen TIMESTAMPTZ,
    next_due TIMESTAMPTZ,
    PRIMARY KEY (user_id, item_type, item_id)
);

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    activity_id INT,
    unit_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_items INT DEFAULT 0,
    correct_answers INT DEFAULT 0
);

-- Create review_items table for individual review attempts
CREATE TABLE IF NOT EXISTS review_items (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES study_sessions(id) ON DELETE CASCADE,
    item_type review_item_enum NOT NULL,
    item_id INT NOT NULL,
    correct BOOLEAN NOT NULL,
    response_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create study_activities table
-- Note: Table is created in pg.sql, we just add SRS-specific columns here
ALTER TABLE study_activities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE study_activities ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- For SRS, we'll use the existing activity_type column but add our own activities
-- Insert default study activities for SRS (these are different from the main system activities)
INSERT INTO study_activities (name, activity_type, description) VALUES
    ('SRS Flashcards', 'flashcard', 'Practice vocabulary with spaced repetition'),
    ('SRS Quiz', 'grammar_quiz', 'Test your knowledge with multiple choice questions'),
    ('SRS Chat Practice', 'shadow', 'Practice conversation skills'),
    ('SRS Drawing', 'stroke', 'Practice writing kanji characters'),
    ('SRS AI Agent', 'speech_image', 'Interactive learning with AI assistant'),
    ('SRS Speech Practice', 'writing', 'Practice pronunciation and listening')
ON CONFLICT (activity_type) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_user_due ON progress(user_id, next_due);
CREATE INDEX IF NOT EXISTS idx_progress_user_type ON progress(user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_items_session ON review_items(session_id);
CREATE INDEX IF NOT EXISTS idx_review_items_user_session ON review_items(session_id, item_type, item_id);

-- Create SRS update function
CREATE OR REPLACE FUNCTION update_srs_progress(
    p_user_id BIGINT,
    p_item_type review_item_enum,
    p_item_id INT,
    p_correct BOOLEAN
) RETURNS VOID AS $$
DECLARE
    current_interval INTERVAL;
    new_interval INTERVAL;
BEGIN
    -- Get current progress interval
    SELECT next_due - last_seen INTO current_interval
    FROM progress
    WHERE user_id = p_user_id AND item_type = p_item_type AND item_id = p_item_id;

    -- Calculate new interval based on SRS algorithm
    IF p_correct THEN
        -- Correct answer: increase interval
        IF current_interval IS NULL THEN
            new_interval := INTERVAL '1 day';
        ELSIF current_interval < INTERVAL '1 day' THEN
            new_interval := INTERVAL '1 day';
        ELSIF current_interval < INTERVAL '1 week' THEN
            new_interval := current_interval * 2;
        ELSE
            new_interval := current_interval * 1.5;
        END IF;
    ELSE
        -- Incorrect answer: reset to 1 day
        new_interval := INTERVAL '1 day';
    END IF;

    -- Update or insert progress record
    INSERT INTO progress (user_id, item_type, item_id, seen_cnt, correct_cnt, last_seen, next_due)
    VALUES (p_user_id, p_item_type, p_item_id, 1,
            CASE WHEN p_correct THEN 1 ELSE 0 END,
            NOW(), NOW() + new_interval)
    ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET
        seen_cnt = progress.seen_cnt + 1,
        correct_cnt = progress.correct_cnt + CASE WHEN p_correct THEN 1 ELSE 0 END,
        last_seen = NOW(),
        next_due = NOW() + new_interval;
END;
$$ LANGUAGE plpgsql;

-- Create function to get items due for review
CREATE OR REPLACE FUNCTION get_due_items(
    p_user_id BIGINT,
    p_limit INT DEFAULT 20
) RETURNS TABLE (
    item_type review_item_enum,
    item_id INT,
    seen_cnt INT,
    correct_cnt INT,
    last_seen TIMESTAMPTZ,
    next_due TIMESTAMPTZ,
    item_content TEXT,
    item_hint TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.item_type,
        p.item_id,
        p.seen_cnt,
        p.correct_cnt,
        p.last_seen,
        p.next_due,
        CASE p.item_type
            WHEN 'word' THEN w.english
            WHEN 'kanji' THEN k.character
            WHEN 'grammar' THEN gp.key
            WHEN 'sentence' THEN s.japanese
        END as item_content,
        CASE p.item_type
            WHEN 'word' THEN w.kana
            WHEN 'kanji' THEN k.meanings[1]
            WHEN 'grammar' THEN gp.structure
            WHEN 'sentence' THEN s.english
        END as item_hint
    FROM progress p
    LEFT JOIN words w ON p.item_type = 'word' AND p.item_id = w.id
    LEFT JOIN kanji k ON p.item_type = 'kanji' AND p.item_id = k.id
    LEFT JOIN grammar_points gp ON p.item_type = 'grammar' AND p.item_id = gp.id
    LEFT JOIN sentences s ON p.item_type = 'sentence' AND p.item_id = s.id
    WHERE p.user_id = p_user_id
      AND p.next_due <= NOW()
      AND p.seen_cnt < 10  -- Limit to prevent overwhelming
    ORDER BY p.next_due
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to get learning statistics
CREATE OR REPLACE FUNCTION get_learning_stats(p_user_id BIGINT)
RETURNS TABLE (
    item_type review_item_enum,
    total_items BIGINT,
    studied_items BIGINT,
    mastered_items BIGINT,
    avg_accuracy NUMERIC,
    due_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.item_type,
        COUNT(*) as total_items,
        COUNT(CASE WHEN p.seen_cnt > 0 THEN 1 END) as studied_items,
        COUNT(CASE WHEN p.correct_cnt >= 3 THEN 1 END) as mastered_items,
        ROUND(AVG(p.correct_cnt::numeric / NULLIF(p.seen_cnt, 0)) * 100, 2) as avg_accuracy,
        COUNT(CASE WHEN p.next_due <= NOW() THEN 1 END) as due_items
    FROM progress p
    WHERE p.user_id = p_user_id
    GROUP BY p.item_type;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate current learning streak
CREATE OR REPLACE FUNCTION get_learning_streak(p_user_id BIGINT)
RETURNS INT AS $$
DECLARE
    streak_count INT := 0;
BEGIN
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
    SELECT COUNT(*) INTO streak_count
    FROM streak_calc
    WHERE grp = (SELECT grp FROM streak_calc WHERE rn = 1);

    RETURN streak_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to reset SRS progress for a user
CREATE OR REPLACE FUNCTION reset_user_srs_progress(p_user_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- Delete all progress records for the user
    DELETE FROM progress WHERE user_id = p_user_id;

    -- Update user settings to mark SRS as reset
    UPDATE user_settings
    SET srs_reset_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE progress IS 'Main SRS progress tracking table';
COMMENT ON TABLE study_sessions IS 'User study sessions';
COMMENT ON TABLE review_items IS 'Individual review attempts within sessions';
COMMENT ON TABLE study_activities IS 'Available study activity types';
COMMENT ON FUNCTION update_srs_progress IS 'Updates SRS progress after a review attempt';
COMMENT ON FUNCTION get_due_items IS 'Gets items due for review based on SRS schedule';
COMMENT ON FUNCTION get_learning_stats IS 'Gets comprehensive learning statistics';
COMMENT ON FUNCTION get_learning_streak IS 'Calculates current learning streak in days';
COMMENT ON FUNCTION reset_user_srs_progress IS 'Resets all SRS progress for a user';