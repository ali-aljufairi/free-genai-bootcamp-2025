-- +goose Up
-- +goose StatementBegin
/* 1. ENUMS ----------------------------------------------------------- */
CREATE TYPE role_enum AS ENUM ('admin','teacher','student');

CREATE TYPE pos_enum AS ENUM (
    'noun','verb','adjective','adverb',
    'particle','conjunction','interjection','auxiliary',
    'prefix','suffix','counter','expression','unclassified'
);

CREATE TYPE activity_enum AS ENUM (          
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


ALTER TYPE review_item_enum ADD VALUE IF NOT EXISTS 'jlpt_question';

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
-- +goose StatementEnd

-- +goose Down
-- Note: Cannot drop enum types if they are in use
