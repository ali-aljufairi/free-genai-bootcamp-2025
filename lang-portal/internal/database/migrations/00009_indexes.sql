-- +goose Up
-- +goose StatementBegin
-- Graph Relationship Indexes
-- Indexes for optimizing graph relationship queries

-- Index for kanji-word relationships (USES_KANJI)
-- Optimizes queries that find words using specific kanji
CREATE INDEX IF NOT EXISTS idx_rel_to_kanji_uses ON item_relations (
    to_type,
    to_id,
    rel_type,
    from_type
)
WHERE
    to_type = 'kanji'
    AND rel_type = 'USES_KANJI';

-- Index for word-kanji relationships (USES_KANJI)
-- Optimizes queries that find kanji used by specific words
CREATE INDEX IF NOT EXISTS idx_rel_from_word_uses ON item_relations (
    from_type,
    from_id,
    rel_type,
    to_type
)
WHERE
    from_type = 'word'
    AND rel_type = 'USES_KANJI';

-- Index for similar relationships (SIMILAR_TO)
-- Optimizes queries finding similar words or kanji
CREATE INDEX IF NOT EXISTS idx_rel_similar_to ON item_relations (rel_type, from_type, to_type)
WHERE
    rel_type = 'SIMILAR_TO';

-- Index for grammar relationships (APPEARS_IN)
-- Optimizes queries finding words that appear in grammar patterns
CREATE INDEX IF NOT EXISTS idx_rel_appears_in ON item_relations (rel_type, to_type, to_id)
WHERE
    rel_type = 'APPEARS_IN'
    AND to_type = 'grammar';

-- Composite index for general relationship queries
-- Optimizes most common relationship lookups
CREATE INDEX IF NOT EXISTS idx_rel_composite ON item_relations (
    rel_type,
    from_type,
    to_type,
    from_id,
    to_id
);

-- Index for relationship type statistics
-- Optimizes queries that aggregate by relationship type
CREATE INDEX IF NOT EXISTS idx_rel_type_stats ON item_relations (rel_type);

-- Clerk-related indexes and constraints
-- Ensure clerk_id lookups are fast
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);

-- User Management Indexes for Sorami Language Portal
-- This script adds missing indexes for efficient user queries

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_jlpt_level ON user_settings (current_jlpt_level);

CREATE INDEX IF NOT EXISTS idx_user_settings_assessed_at ON user_settings (jlpt_level_assessed_at);

CREATE INDEX IF NOT EXISTS idx_user_settings_ui_language ON user_settings (ui_language);

CREATE INDEX IF NOT EXISTS idx_user_settings_timezone ON user_settings (timezone);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions (current_period_end);

CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions (created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_settings_jlpt_assessment ON user_settings (
    current_jlpt_level,
    jlpt_level_assessed_at
);

-- Note: idx_words_kana_gin, idx_words_romaji_gin, idx_words_english_gin, idx_words_kanji
-- are created in 00004_content_tables.sql

-- Note: All grammar indexes (idx_grammar_points_level, idx_grammar_readings_grammar, etc.)
-- are created in 00004_content_tables.sql

-- Note: idx_rel_from, idx_rel_to, idx_units_path_gist, idx_word_tags_tag
-- are created in 00004_content_tables.sql

-- Note: idx_study_sessions_user, idx_review_items_item, idx_progress_due
-- are created in 00006_learning_progress.sql

-- Note: Chat-related indexes (idx_chat_messages_session, idx_chat_sessions_user_created)
-- are created in 00010_study_activities.sql where the chat tables are defined

-- Note: idx_jlpt_questions_level, idx_jlpt_questions_tag, idx_jlpt_questions_kind
-- and all JLPT question type indexes are created in 00005_jlpt_system.sql

CREATE INDEX idx_jlpt_questions_original_id ON jlpt_questions (original_id);

CREATE INDEX idx_unit_items_unit ON unit_items (unit_id);

CREATE INDEX idx_unit_items_item ON unit_items (item_type, item_id);

CREATE INDEX idx_kanji_character ON kanji (character);

CREATE INDEX idx_kanji_jlpt ON kanji (jlpt);

CREATE INDEX idx_words_jlpt ON words (jlpt);

CREATE INDEX idx_words_part_of_speech ON words (part_of_speech);

-- Note: All JLPT progress, kanji progress, vocab progress, and user_jlpt_history indexes
-- are created in 00006_learning_progress.sql

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop indexes (list would be very long)
-- +goose StatementEnd