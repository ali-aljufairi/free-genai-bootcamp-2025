-- +goose Up
-- +goose StatementBegin
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

-- Hiragana to Romaji Conversion Function for PostgreSQL
-- This function converts Japanese hiragana characters to romaji (Latin alphabet)
-- Supports all standard hiragana characters including combinations

CREATE OR REPLACE FUNCTION hiragana_to_romaji(hiragana_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    char_length INTEGER;
    current_char TEXT;
    next_char TEXT;
    i INTEGER := 1;
BEGIN
    -- Return NULL or empty string as-is
    IF hiragana_text IS NULL OR hiragana_text = '' THEN
        RETURN hiragana_text;
    END IF;
    
    char_length := char_length(hiragana_text);
    
    WHILE i <= char_length LOOP
        current_char := substring(hiragana_text FROM i FOR 1);
        next_char := CASE WHEN i < char_length THEN substring(hiragana_text FROM i+1 FOR 1) ELSE '' END;
        
        -- Handle small tsu (っ) - double consonant
        IF current_char = 'っ' THEN
            -- Get the first consonant of the next character
            CASE next_char
                WHEN 'か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご' THEN result := result || 'k';
                WHEN 'さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ' THEN result := result || 's';
                WHEN 'た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど' THEN result := result || 't';
                WHEN 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ' THEN result := result || 'p';
                WHEN 'ま', 'み', 'む', 'め', 'も' THEN result := result || 'm';
                WHEN 'や', 'ゆ', 'よ' THEN result := result || 'y';
                WHEN 'ら', 'り', 'る', 'れ', 'ろ' THEN result := result || 'r';
                WHEN 'わ', 'ゐ', 'ゑ', 'を', 'ん' THEN result := result || 'w';
                ELSE result := result || 't'; -- Default to 't' for unknown
            END CASE;
            i := i + 1;
            CONTINUE;
        END IF;
        
        -- Handle combinations first (き + ゃ/ゅ/ょ, etc.)
        IF i < char_length THEN
            CASE current_char || next_char
                -- きゃ, きゅ, きょ series
                WHEN 'きゃ' THEN result := result || 'kya'; i := i + 2; CONTINUE;
                WHEN 'きゅ' THEN result := result || 'kyu'; i := i + 2; CONTINUE;
                WHEN 'きょ' THEN result := result || 'kyo'; i := i + 2; CONTINUE;
                -- しゃ, しゅ, しょ series
                WHEN 'しゃ' THEN result := result || 'sha'; i := i + 2; CONTINUE;
                WHEN 'しゅ' THEN result := result || 'shu'; i := i + 2; CONTINUE;
                WHEN 'しょ' THEN result := result || 'sho'; i := i + 2; CONTINUE;
                -- ちゃ, ちゅ, ちょ series
                WHEN 'ちゃ' THEN result := result || 'cha'; i := i + 2; CONTINUE;
                WHEN 'ちゅ' THEN result := result || 'chu'; i := i + 2; CONTINUE;
                WHEN 'ちょ' THEN result := result || 'cho'; i := i + 2; CONTINUE;
                -- にゃ, にゅ, にょ series
                WHEN 'にゃ' THEN result := result || 'nya'; i := i + 2; CONTINUE;
                WHEN 'にゅ' THEN result := result || 'nyu'; i := i + 2; CONTINUE;
                WHEN 'にょ' THEN result := result || 'nyo'; i := i + 2; CONTINUE;
                -- ひゃ, ひゅ, ひょ series
                WHEN 'ひゃ' THEN result := result || 'hya'; i := i + 2; CONTINUE;
                WHEN 'ひゅ' THEN result := result || 'hyu'; i := i + 2; CONTINUE;
                WHEN 'ひょ' THEN result := result || 'hyo'; i := i + 2; CONTINUE;
                -- みゃ, みゅ, みょ series
                WHEN 'みゃ' THEN result := result || 'mya'; i := i + 2; CONTINUE;
                WHEN 'みゅ' THEN result := result || 'myu'; i := i + 2; CONTINUE;
                WHEN 'みょ' THEN result := result || 'myo'; i := i + 2; CONTINUE;
                -- りゃ, りゅ, りょ series
                WHEN 'りゃ' THEN result := result || 'rya'; i := i + 2; CONTINUE;
                WHEN 'りゅ' THEN result := result || 'ryu'; i := i + 2; CONTINUE;
                WHEN 'りょ' THEN result := result || 'ryo'; i := i + 2; CONTINUE;
                -- ぎゃ, ぎゅ, ぎょ series
                WHEN 'ぎゃ' THEN result := result || 'gya'; i := i + 2; CONTINUE;
                WHEN 'ぎゅ' THEN result := result || 'gyu'; i := i + 2; CONTINUE;
                WHEN 'ぎょ' THEN result := result || 'gyo'; i := i + 2; CONTINUE;
                -- じゃ, じゅ, じょ series
                WHEN 'じゃ' THEN result := result || 'ja'; i := i + 2; CONTINUE;
                WHEN 'じゅ' THEN result := result || 'ju'; i := i + 2; CONTINUE;
                WHEN 'じょ' THEN result := result || 'jo'; i := i + 2; CONTINUE;
                -- びゃ, びゅ, びょ series
                WHEN 'びゃ' THEN result := result || 'bya'; i := i + 2; CONTINUE;
                WHEN 'びゅ' THEN result := result || 'byu'; i := i + 2; CONTINUE;
                WHEN 'びょ' THEN result := result || 'byo'; i := i + 2; CONTINUE;
                -- ぴゃ, ぴゅ, ぴょ series
                WHEN 'ぴゃ' THEN result := result || 'pya'; i := i + 2; CONTINUE;
                WHEN 'ぴゅ' THEN result := result || 'pyu'; i := i + 2; CONTINUE;
                WHEN 'ぴょ' THEN result := result || 'pyo'; i := i + 2; CONTINUE;
                ELSE -- Continue to single character processing
            END CASE;
        END IF;
        
        -- Handle single characters
        CASE current_char
            -- Vowels
            WHEN 'あ' THEN result := result || 'a';
            WHEN 'い' THEN result := result || 'i';
            WHEN 'う' THEN result := result || 'u';
            WHEN 'え' THEN result := result || 'e';
            WHEN 'お' THEN result := result || 'o';
            
            -- K series
            WHEN 'か' THEN result := result || 'ka';
            WHEN 'き' THEN result := result || 'ki';
            WHEN 'く' THEN result := result || 'ku';
            WHEN 'け' THEN result := result || 'ke';
            WHEN 'こ' THEN result := result || 'ko';
            
            -- G series
            WHEN 'が' THEN result := result || 'ga';
            WHEN 'ぎ' THEN result := result || 'gi';
            WHEN 'ぐ' THEN result := result || 'gu';
            WHEN 'げ' THEN result := result || 'ge';
            WHEN 'ご' THEN result := result || 'go';
            
            -- S series
            WHEN 'さ' THEN result := result || 'sa';
            WHEN 'し' THEN result := result || 'shi';
            WHEN 'す' THEN result := result || 'su';
            WHEN 'せ' THEN result := result || 'se';
            WHEN 'そ' THEN result := result || 'so';
            
            -- Z series
            WHEN 'ざ' THEN result := result || 'za';
            WHEN 'じ' THEN result := result || 'ji';
            WHEN 'ず' THEN result := result || 'zu';
            WHEN 'ぜ' THEN result := result || 'ze';
            WHEN 'ぞ' THEN result := result || 'zo';
            
            -- T series
            WHEN 'た' THEN result := result || 'ta';
            WHEN 'ち' THEN result := result || 'chi';
            WHEN 'つ' THEN result := result || 'tsu';
            WHEN 'て' THEN result := result || 'te';
            WHEN 'と' THEN result := result || 'to';
            
            -- D series
            WHEN 'だ' THEN result := result || 'da';
            WHEN 'ぢ' THEN result := result || 'ji';
            WHEN 'づ' THEN result := result || 'zu';
            WHEN 'で' THEN result := result || 'de';
            WHEN 'ど' THEN result := result || 'do';
            
            -- N series
            WHEN 'な' THEN result := result || 'na';
            WHEN 'に' THEN result := result || 'ni';
            WHEN 'ぬ' THEN result := result || 'nu';
            WHEN 'ね' THEN result := result || 'ne';
            WHEN 'の' THEN result := result || 'no';
            
            -- H series
            WHEN 'は' THEN result := result || 'ha';
            WHEN 'ひ' THEN result := result || 'hi';
            WHEN 'ふ' THEN result := result || 'fu';
            WHEN 'へ' THEN result := result || 'he';
            WHEN 'ほ' THEN result := result || 'ho';
            
            -- B series
            WHEN 'ば' THEN result := result || 'ba';
            WHEN 'び' THEN result := result || 'bi';
            WHEN 'ぶ' THEN result := result || 'bu';
            WHEN 'べ' THEN result := result || 'be';
            WHEN 'ぼ' THEN result := result || 'bo';
            
            -- P series
            WHEN 'ぱ' THEN result := result || 'pa';
            WHEN 'ぴ' THEN result := result || 'pi';
            WHEN 'ぷ' THEN result := result || 'pu';
            WHEN 'ぺ' THEN result := result || 'pe';
            WHEN 'ぽ' THEN result := result || 'po';
            
            -- M series
            WHEN 'ま' THEN result := result || 'ma';
            WHEN 'み' THEN result := result || 'mi';
            WHEN 'む' THEN result := result || 'mu';
            WHEN 'め' THEN result := result || 'me';
            WHEN 'も' THEN result := result || 'mo';
            
            -- Y series
            WHEN 'や' THEN result := result || 'ya';
            WHEN 'ゆ' THEN result := result || 'yu';
            WHEN 'よ' THEN result := result || 'yo';
            
            -- R series
            WHEN 'ら' THEN result := result || 'ra';
            WHEN 'り' THEN result := result || 'ri';
            WHEN 'る' THEN result := result || 'ru';
            WHEN 'れ' THEN result := result || 're';
            WHEN 'ろ' THEN result := result || 'ro';
            
            -- W series
            WHEN 'わ' THEN result := result || 'wa';
            WHEN 'ゐ' THEN result := result || 'wi';
            WHEN 'ゑ' THEN result := result || 'we';
            WHEN 'を' THEN result := result || 'wo';
            
            -- N
            WHEN 'ん' THEN result := result || 'n';
            
            -- Long vowel mark
            WHEN 'ー' THEN 
                -- Don't add anything, just extend the previous vowel
                NULL;
            
            -- Unknown character - keep as is
            ELSE result := result || current_char;
        END CASE;
        
        i := i + 1;
    END LOOP;
    
    return result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function to batch update romaji field in words table
CREATE OR REPLACE FUNCTION update_words_romaji()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update all words where kana is not null but romaji is null or same as kana
    UPDATE words 
    SET romaji = hiragana_to_romaji(kana)
    WHERE kana IS NOT NULL 
    AND (romaji IS NULL OR romaji = kana OR romaji = 'No pronunciation available');
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Log the result
    RAISE NOTICE 'Updated romaji for % words', updated_count;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Test function with examples
CREATE OR REPLACE FUNCTION test_hiragana_conversion()
RETURNS TABLE(hiragana TEXT, romaji TEXT) AS $$
BEGIN
    RETURN QUERY VALUES
        ('あい', hiragana_to_romaji('あい')),
        ('あいさつ', hiragana_to_romaji('あいさつ')),
        ('あいじょう', hiragana_to_romaji('あいじょう')),
        ('きょう', hiragana_to_romaji('きょう')),
        ('しゃしん', hiragana_to_romaji('しゃしん')),
        ('がっこう', hiragana_to_romaji('がっこう')),
        ('じっぷん', hiragana_to_romaji('じっぷん')),
        ('りょこう', hiragana_to_romaji('りょこう'));
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION hiragana_to_romaji (TEXT) IS 'Convert hiragana text to romaji with support for all standard characters and combinations';

COMMENT ON FUNCTION update_words_romaji () IS 'Batch update romaji field in words table by converting hiragana kana values';

COMMENT ON FUNCTION test_hiragana_conversion () IS 'Test the hiragana to romaji conversion with sample words';

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


-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop core functions (handled by CASCADE if needed)
-- +goose StatementEnd
