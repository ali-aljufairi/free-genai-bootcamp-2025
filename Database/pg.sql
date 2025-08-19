/* ----------------------------------------------------------------------
PostgreSQL Migration Schema  —  Sorami Language Portal  (PostgreSQL ≥ 16)
------------------------------------------------------------------------

This schema supports the migration from SQLite to PostgreSQL for the Sorami
language learning platform. It handles 507MB of JSON data efficiently while
preserving existing functionality and properly supporting the actual data
structure found in the JSON files.

Key Features:
- Complete JLPT question support with type-specific tables
- Enhanced kanji data with stroke SVG information
- Hierarchical unit organization using ltree
- Full-text search capabilities with pg_trgm
- Data integrity constraints and validation
- Helper functions for safe JSON processing
- Performance optimized indexes

Requirements Addressed: 1.1, 1.2, 1.3
-------------------------------------------------------------------- */

/* 0. EXTENSIONS ------------------------------------------------------ */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE EXTENSION IF NOT EXISTS "ltree";

CREATE EXTENSION IF NOT EXISTS "vector";

/* 1. ENUMS ----------------------------------------------------------- */
CREATE TYPE role_enum AS ENUM ('admin','teacher','student');

CREATE TYPE pos_enum AS ENUM (
    'noun','verb','adjective','adverb',
    'particle','conjunction','interjection','auxiliary',
    'prefix','suffix','counter','expression','unclassified'
);

CREATE TYPE activity_enum AS ENUM (          -- ❌ generic 'quiz' removed
    'flashcard',
    'grammar_quiz',   -- JLPT grammar MCQ
    'writing',        -- handwriting / drawing practice
    'speech_image',   -- speech-to-image study
    'shadow',         -- conversation / shadowing
    'stroke'          -- kanji stroke-order
);

CREATE TYPE relation_enum   AS ENUM (
    'USES_KANJI','APPEARS_IN','DEMONSTRATES','SIMILAR_TO','BELONGS_TO_UNIT'
);

CREATE TYPE unit_item_enum  AS ENUM ('word','kanji','grammar','sentence');

CREATE TYPE review_item_enum AS ENUM ('word','kanji','grammar','sentence');

/* 2. USERS, RBAC, BILLING ------------------------------------------- */
-- Users table integrated with Clerk authentication
-- clerk_id stores Clerk user IDs (format: user_xxxxxxxxxxxxx)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE, -- Clerk user ID
    email TEXT NOT NULL,
    display_name TEXT,
    stripe_customer_id TEXT UNIQUE, -- NEW
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name role_enum UNIQUE NOT NULL
);

INSERT INTO
    roles (role_name)
VALUES ('admin'),
    ('teacher'),
    ('student');

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    role_id INT REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_settings ( -- UPDATED
    user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    hide_english BOOLEAN DEFAULT FALSE,
    srs_reset_at TIMESTAMPTZ,
    ui_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    daily_review_target INT DEFAULT 20, -- # of reviews the user aims for
    current_jlpt_level INT DEFAULT 5, -- User's current JLPT level (1-5)
    jlpt_level_assessed_at TIMESTAMPTZ, -- When the level was last assessed
    jlpt_level_assessment_method TEXT -- 'manual', 'automatic', 'exam'
);

-- Add constraint for valid JLPT levels
ALTER TABLE user_settings
ADD CONSTRAINT check_jlpt_level CHECK (
    current_jlpt_level BETWEEN 1 AND 5
);

CREATE TABLE subscriptions ( -- NEW
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT, -- active, past_due, canceled …
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

/* 3. CORE CONTENT ---------------------------------------------------- */
CREATE TABLE kanji (
    id SERIAL PRIMARY KEY,
    character TEXT UNIQUE NOT NULL CHECK (char_length(character) = 1),
    heisig_en TEXT,
    meanings JSONB, -- Store as JSON array for better GORM compatibility
    detail TEXT,
    unicode TEXT UNIQUE NOT NULL,
    onyomi TEXT,
    kunyomi TEXT,
    jlpt INT,
    frequency INT,
    components TEXT,
    stroke_count INT,
    strokes_svg TEXT -- From kanji_svg_strokes.json "strokes_svg"
);

CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    kana TEXT, -- From javi_cleaned.json "phonetic" (can be NULL)
    kanji TEXT, -- From javi_cleaned.json "word"  
    romaji TEXT, -- From javi_cleaned.json "phonetic" (can be NULL - no actual romaji data available)
    english TEXT NOT NULL, -- From javi_cleaned.json "short_mean" (joined)
    part_of_speech pos_enum NOT NULL, -- From javi_cleaned.json "part_of_speech" (defaults to unclassified)
    jlpt INT, -- From javi_cleaned.json "level" (mapped N1-N5 to 1-5, 0 = no level)
    level INT DEFAULT 0, -- 0 = no level, 1-5 = JLPT N1-N5
    correct_count INT DEFAULT 0, -- Preserved from SQLite
    audio_path TEXT, -- Future use
    embedding VECTOR (384), -- Future use
    raw_data JSONB -- Complete original JSON for complex fields
);

-- Add constraint for valid JLPT levels (0-5, where 0 = no level)
ALTER TABLE words
ADD CONSTRAINT check_words_jlpt_level CHECK (
    jlpt IS NULL
    OR (
        jlpt >= 0
        AND jlpt <= 5
    )
);

CREATE INDEX idx_words_kana_gin ON words USING gin (kana gin_trgm_ops);

CREATE INDEX idx_words_romaji_gin ON words USING gin (romaji gin_trgm_ops);

CREATE INDEX idx_words_english_gin ON words USING gin (english gin_trgm_ops);

CREATE TABLE grammar_points (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    base_form TEXT NOT NULL,
    level TEXT NOT NULL CHECK (
        level IN ('N5', 'N4', 'N3', 'N2', 'N1')
    ),
    structure TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE grammar_readings (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    kanji TEXT NOT NULL,
    reading TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (grammar_id, kanji, position)
);

CREATE TABLE grammar_examples (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    japanese TEXT NOT NULL,
    english TEXT NOT NULL
);

CREATE TABLE grammar_details (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    meaning TEXT,
    notes TEXT,
    caution TEXT,
    fun_fact TEXT,
    UNIQUE (grammar_id)
);

CREATE TABLE grammar_relations (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    related_grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (
        relation_type IN (
            'synonym',
            'similar',
            'opposite',
            'related'
        )
    ),
    UNIQUE (
        grammar_id,
        related_grammar_id,
        relation_type
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_grammar_points_level ON grammar_points (level);

CREATE INDEX idx_grammar_readings_grammar ON grammar_readings (grammar_id);

CREATE INDEX idx_grammar_examples_grammar ON grammar_examples (grammar_id);

CREATE INDEX idx_grammar_details_grammar ON grammar_details (grammar_id);

CREATE INDEX idx_grammar_relations_grammar ON grammar_relations (grammar_id);

CREATE INDEX idx_grammar_relations_related ON grammar_relations (related_grammar_id);

CREATE TABLE sentences (
    id SERIAL PRIMARY KEY,
    japanese TEXT NOT NULL,
    english TEXT,
    source TEXT,
    embedding VECTOR (384)
);

/* 4. CONTENT GROUPS (words & kanji) --------------------------------- */
CREATE TABLE groups ( -- NEW (global group catalogue)
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE word_groups ( -- NEW
    word_id INT REFERENCES words (id) ON DELETE CASCADE,
    group_id INT REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (word_id, group_id)
);

CREATE TABLE kanji_groups ( -- NEW
    kanji_id INT REFERENCES kanji (id) ON DELETE CASCADE,
    group_id INT REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (kanji_id, group_id)
);

/* 5. GRAPH RELATIONS ------------------------------------------------- */
CREATE TABLE item_relations (
    id BIGSERIAL PRIMARY KEY,
    from_type TEXT NOT NULL,
    from_id INT NOT NULL,
    rel_type relation_enum NOT NULL,
    to_type TEXT NOT NULL,
    to_id INT NOT NULL,
    position INT,
    UNIQUE (
        from_type,
        from_id,
        rel_type,
        to_type,
        to_id
    )
);

CREATE INDEX idx_rel_from ON item_relations (from_type, from_id);

CREATE INDEX idx_rel_to ON item_relations (to_type, to_id);

/* 6. COURSES, UNITS, TAGS, USER STUDY GROUPS ------------------------ */
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- From book_set.json "name" + "level"
    description TEXT, -- Generated from book_set.json metadata
    level TEXT, -- From book_set.json "level"
    total_words INT, -- From book_set.json "total_word"
    version INT -- From book_set.json "version"
);

CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses (id) ON DELETE CASCADE,
    path LTREE NOT NULL, -- Hierarchical path for unit organization
    title TEXT NOT NULL, -- From book_set_unit_all.json "name"
    description TEXT, -- Generated description
    total_words INT -- From book_set_unit_all.json "total_word"
);

CREATE INDEX idx_units_path_gist ON units USING gist (path);

CREATE TABLE unit_items (
    unit_id INT REFERENCES units (id) ON DELETE CASCADE,
    item_type unit_item_enum NOT NULL,
    item_id INT NOT NULL,
    position INT,
    PRIMARY KEY (unit_id, item_type, item_id)
);

CREATE TABLE study_groups (
    id SERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE study_group_words (
    group_id INT REFERENCES study_groups (id) ON DELETE CASCADE,
    word_id INT REFERENCES words (id) ON DELETE CASCADE,
    position INT,
    PRIMARY KEY (group_id, word_id)
);

CREATE TABLE word_tags (
    word_id INT REFERENCES words (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (word_id, tag)
);

CREATE INDEX idx_word_tags_tag ON word_tags (tag);

/* 7. STUDY FLOW & SPACED REPETITION --------------------------------- */
CREATE TABLE study_activities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    activity_type activity_enum NOT NULL,
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

-- 7b. Flashcard sessions are tracked via enhanced_study_sessions + review_items
-- No separate flashcard tables; session config can be stored as JSON
-- in enhanced_study_sessions.notes for deterministic regeneration.

/* 8. SHADOWING & STROKE-ORDER --------------------------------------- */
CREATE TABLE shadow_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    sentence_id INT REFERENCES sentences (id),
    audio_path TEXT,
    accuracy NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kanji_traces (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    kanji_id INT REFERENCES kanji (id),
    trace_svg TEXT,
    accuracy NUMERIC(5, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);

/* 9. CHAT HISTORY ---------------------------------------------------- */
CREATE TABLE chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT now(),
    context TEXT
);

CREATE TABLE chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES chat_sessions (id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (
        sender IN ('user', 'assistant')
    ),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_session ON chat_messages (session_id);

/* 10. DATA INTEGRITY CONSTRAINTS ------------------------------------ */

-- Ensure valid JLPT levels for words
-- Note: Constraint already defined earlier allowing 0–5 (0 = no level).
-- The stricter 1–5 constraint caused valid level 0 inserts to fail, so it is removed here.

-- Ensure valid JLPT levels for kanji
ALTER TABLE kanji
ADD CONSTRAINT check_kanji_jlpt_level CHECK (
    jlpt IS NULL
    OR jlpt BETWEEN 0 AND 5
);

/* 11. HELPER FUNCTIONS FOR JSON PROCESSING -------------------------- */

-- Safe JSON text extraction function
CREATE OR REPLACE FUNCTION safe_jsonb_extract_text(json_data JSONB, key TEXT)
RETURNS TEXT AS $$
BEGIN
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;
    RETURN json_data ->> key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting key % from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safe JSON integer extraction function
CREATE OR REPLACE FUNCTION safe_jsonb_extract_int(json_data JSONB, key TEXT)
RETURNS INTEGER AS $$
BEGIN
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;
    RETURN (json_data ->> key)::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting integer key % from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Safe JSON array extraction function
CREATE OR REPLACE FUNCTION safe_jsonb_extract_array(json_data JSONB, key TEXT)
RETURNS JSONB AS $$
BEGIN
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN '[]'::jsonb;
    END IF;
    RETURN json_data -> key;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting array key % from JSON: %', key, SQLERRM;
        RETURN '[]'::jsonb;
END;
$$ LANGUAGE plpgsql;

/* 12. TEMPORARY IMPORT TABLES --------------------------------------- */

-- Note: json_import table removed - import functions work directly with JSONB parameters
/* JLPT QUESTION TYPE ENUMS */

-- Grammar question types enum
CREATE TYPE grammar_question_type_enum AS ENUM (
    'grammar_choice',           -- Multiple choice grammar questions
    'passage_grammar',          -- Grammar questions based on a passage
    'sentence_composition'      -- Sentence composition with grammar elements
);

-- Listening question types enum
CREATE TYPE listening_question_type_enum AS ENUM (
    'listening_comprehensive',  -- Comprehensive listening test with audio
    'listening_expressions',    -- Understanding expressions in spoken form
    'listening_main_points',    -- Identify main points from audio
    'listening_overview',       -- Overall comprehension of audio passage
    'listening_topic',          -- Identify topics from audio
    'quick_response'            -- Quick response to audio prompts
);

-- Reading question types enum
CREATE TYPE reading_question_type_enum AS ENUM (
    'information_search',       -- Find specific information in text
    'long_passage',             -- Comprehension of long text passages
    'medium_passage',           -- Comprehension of medium-length passages
    'reading_comprehensive',    -- Comprehensive reading questions
    'reading_topic',            -- Identify topics from text
    'short_passage'             -- Comprehension of short text passages
);

-- Word/vocabulary question types enum
CREATE TYPE word_question_type_enum AS ENUM (
    'context_fill_in',          -- Fill in words in context
    'expression_change',        -- Change expressions using vocabulary
    'grammar_choice',           -- Select appropriate word for grammar
    'kanji_reading',            -- Reading kanji correctly
    'passage_grammar',          -- Word usage in passages
    'sentence_composition',     -- Compose sentences with specific words
    'word_application',         -- Apply words in different contexts
    'word_formation',           -- Form words from components
    'word_writing'              -- Write words correctly
);

/* JLPT QUESTION TABLES */

-- Base table for all JLPT questions
CREATE TABLE jlpt_questions (
    id BIGSERIAL PRIMARY KEY,
    original_id INT NOT NULL UNIQUE, -- Original question ID from JSON
    title TEXT NOT NULL, -- Question title/instructions
    title_trans TEXT, -- Translated title if available
    level INT NOT NULL, -- JLPT level (1-5)
    level_of_difficult INT, -- Difficulty level if specified
    tag TEXT, -- Question tag (e.g., "grammar")
    score INT, -- Question score
    kind TEXT NOT NULL, -- Original question kind/type string
    correct_answers INT[], -- Array of correct answer indices
    check_explain INT, -- Flag for explanation checking
    created_at TIMESTAMPTZ, -- Creation timestamp
    updated_at TIMESTAMPTZ, -- Last update timestamp
    raw_data JSONB NOT NULL -- Complete raw JSON data for full preservation
);

-- Grammar questions table
CREATE TABLE jlpt_grammar_questions (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT UNIQUE REFERENCES jlpt_questions (id) ON DELETE CASCADE,
    question_type grammar_question_type_enum NOT NULL,
    question_html TEXT, -- HTML content of the question (may be empty)
    question_text TEXT, -- Plain text version of the question (may be empty)
    image_url TEXT, -- URL to any image in the question
    answers JSONB NOT NULL, -- All possible answers as JSON array
    correct_answer_index INT NOT NULL, -- Index of the correct answer (0-based)
    explanation TEXT, -- Explanation in default language
    explanations JSONB -- All multilingual explanations
);

-- Listening questions table
CREATE TABLE jlpt_listening_questions (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT UNIQUE REFERENCES jlpt_questions (id) ON DELETE CASCADE,
    question_type listening_question_type_enum NOT NULL,
    question_html TEXT, -- HTML content of the question (may be empty for audio-only)
    question_text TEXT, -- Plain text version of the question (may be empty for audio-only)
    audio_url TEXT, -- URL to audio file
    audio_duration NUMERIC(8, 3), -- Audio duration in seconds
    image_url TEXT, -- URL to any image in the question
    transcript TEXT, -- Transcript of the audio
    answers JSONB NOT NULL, -- All possible answers as JSON array
    correct_answer_index INT NOT NULL, -- Index of the correct answer (0-based)
    explanation TEXT, -- Explanation in default language
    explanations JSONB -- All multilingual explanations
);

-- Reading questions table
CREATE TABLE jlpt_reading_questions (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT UNIQUE REFERENCES jlpt_questions (id) ON DELETE CASCADE,
    question_type reading_question_type_enum NOT NULL,
    question_html TEXT, -- HTML content of the question (may be empty)
    question_text TEXT, -- Plain text version of the question (may be empty)
    passage TEXT, -- The reading passage if separate
    image_url TEXT, -- URL to any image in the question
    answers JSONB NOT NULL, -- All possible answers as JSON array
    correct_answer_index INT NOT NULL, -- Index of the correct answer (0-based)
    explanation TEXT, -- Explanation in default language
    explanations JSONB -- All multilingual explanations
);

-- Word/vocabulary questions table
CREATE TABLE jlpt_word_questions (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT UNIQUE REFERENCES jlpt_questions (id) ON DELETE CASCADE,
    question_type word_question_type_enum NOT NULL,
    question_html TEXT, -- HTML content of the question (may be empty)
    question_text TEXT, -- Plain text version of the question (may be empty)
    image_url TEXT, -- URL to any image in the question
    answers JSONB NOT NULL, -- All possible answers as JSON array
    correct_answer_index INT NOT NULL, -- Index of the correct answer (0-based)
    explanation TEXT, -- Explanation in default language
    explanations JSONB -- All multilingual explanations
);

-- Multilingual text for question components
CREATE TABLE jlpt_question_texts (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT REFERENCES jlpt_questions (id) ON DELETE CASCADE,
    language_code TEXT NOT NULL, -- ISO language code (en, zh, vn, etc.)
    text_type TEXT NOT NULL, -- Type of text (reading_passage, general_text, etc.)
    content TEXT NOT NULL, -- The actual text content
    UNIQUE (
        question_id,
        language_code,
        text_type
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_jlpt_questions_level ON jlpt_questions (level);

CREATE INDEX idx_jlpt_questions_tag ON jlpt_questions (tag);

CREATE INDEX idx_jlpt_questions_kind ON jlpt_questions (kind);

CREATE INDEX idx_grammar_questions_type ON jlpt_grammar_questions (question_type);

CREATE INDEX idx_listening_questions_type ON jlpt_listening_questions (question_type);

CREATE INDEX idx_reading_questions_type ON jlpt_reading_questions (question_type);

CREATE INDEX idx_word_questions_type ON jlpt_word_questions (question_type);

-- Additional performance indexes
CREATE INDEX idx_jlpt_questions_original_id ON jlpt_questions (original_id);

-- Note: original_id is already unique in the table definition above
CREATE INDEX idx_unit_items_unit ON unit_items (unit_id);

CREATE INDEX idx_unit_items_item ON unit_items (item_type, item_id);

CREATE INDEX idx_kanji_character ON kanji (character);

CREATE INDEX idx_kanji_jlpt ON kanji (jlpt);

CREATE INDEX idx_words_jlpt ON words (jlpt);

CREATE INDEX idx_words_part_of_speech ON words (part_of_speech);

-- JLPT table constraints (added after table creation)
ALTER TABLE jlpt_questions
ADD CONSTRAINT check_question_tag CHECK (
    tag IN (
        'grammar',
        'listen',
        'read',
        'word'
    )
);

ALTER TABLE jlpt_questions
ADD CONSTRAINT check_jlpt_questions_level CHECK (level BETWEEN 1 AND 5);

ALTER TABLE jlpt_grammar_questions
ADD CONSTRAINT check_grammar_correct_answer CHECK (correct_answer_index >= 0);

ALTER TABLE jlpt_listening_questions
ADD CONSTRAINT check_listening_correct_answer CHECK (correct_answer_index >= 0);

ALTER TABLE jlpt_reading_questions
ADD CONSTRAINT check_reading_correct_answer CHECK (correct_answer_index >= 0);

ALTER TABLE jlpt_word_questions
ADD CONSTRAINT check_word_correct_answer CHECK (correct_answer_index >= 0);

-- =====================================================
-- USER QUESTION TRACKING SYSTEM
-- =====================================================
-- Comprehensive tracking for JLPT questions, kanji, and vocabulary
-- =====================================================

-- Extend existing enums for user tracking
ALTER TYPE review_item_enum ADD VALUE IF NOT EXISTS 'jlpt_question';

-- Create understanding level enum
CREATE TYPE question_understanding_level AS ENUM (
    'not_attempted',
    'attempted_incorrect',
    'attempted_correct_once',
    'attempted_correct_multiple',
    'mastered',
    'needs_review'
);

-- Create confidence level enum
CREATE TYPE confidence_level_enum AS ENUM (
    'very_low',
    'low',
    'medium',
    'high',
    'very_high'
);

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
    notes TEXT,
    
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

-- Missing Enum Types for Sorami Language Portal
-- This script adds the enum types mentioned in the task list that are not yet implemented

-- 1. Notification Channel Enum
CREATE TYPE notification_channel_enum AS ENUM (
    'email',
    'push',
    'sms',
    'in_app',
    'webhook'
);

-- 2. User Role Enum (already exists as role_enum, but creating for consistency)
-- Note: role_enum already exists, this is for API consistency
CREATE TYPE user_role_enum AS ENUM (
    'admin',
    'teacher', 
    'student'
);

-- 3. Job Status Enum
CREATE TYPE job_status_enum AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'retrying'
);

-- 4. Notification Type Enum
CREATE TYPE notification_type_enum AS ENUM (
    'study_reminder',
    'achievement',
    'progress_milestone',
    'system_alert',
    'subscription_update',
    'content_update'
);

-- 5. Import/Export Status Enum
CREATE TYPE import_export_status_enum AS ENUM (
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled'
);

-- 6. Data Migration Status Enum
CREATE TYPE migration_status_enum AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed',
    'rolled_back'
);

-- 7. Backup Status Enum
CREATE TYPE backup_status_enum AS ENUM (
    'scheduled',
    'running',
    'completed',
    'failed',
    'expired'
);

-- 8. External Integration Status Enum
CREATE TYPE integration_status_enum AS ENUM (
    'active',
    'inactive',
    'error',
    'maintenance'
);

-- 9. Data Quality Status Enum
CREATE TYPE data_quality_status_enum AS ENUM (
    'valid',
    'warning',
    'error',
    'needs_review'
);

-- 10. Audit Action Enum
CREATE TYPE audit_action_enum AS ENUM (
    'create',
    'read',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'import'
);