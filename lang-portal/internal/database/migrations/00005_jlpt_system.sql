-- +goose Up
-- +goose StatementBegin
/* JLPT QUESTION TABLES */
-- Note: Enum types (grammar_question_type_enum, listening_question_type_enum,
-- reading_question_type_enum, word_question_type_enum) are defined in 00002_enums.sql

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
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS jlpt_question_texts CASCADE;

DROP TABLE IF EXISTS jlpt_word_questions CASCADE;

DROP TABLE IF EXISTS jlpt_reading_questions CASCADE;

DROP TABLE IF EXISTS jlpt_listening_questions CASCADE;

DROP TABLE IF EXISTS jlpt_grammar_questions CASCADE;

DROP TABLE IF EXISTS jlpt_questions CASCADE;
-- Note: Enum types are dropped in 00002_enums.sql down migration
-- +goose StatementEnd