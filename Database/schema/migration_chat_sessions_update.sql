-- Migration: Update chat_sessions table to match Go model schema
-- This migration adds missing columns to align the database schema with the ChatSession model
-- Date: 2025-12-01

-- =====================================================
-- PHASE 1: ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to chat_sessions table
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS messages JSONB,
ADD COLUMN IF NOT EXISTS skill_summary JSONB,
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS prompt_used TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =====================================================
-- PHASE 2: CREATE INDEXES
-- =====================================================

-- Create unique index on session_id if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions (session_id)
WHERE
    session_id IS NOT NULL;

-- Create index on user_id and created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_created ON chat_sessions (user_id, created_at DESC);

-- =====================================================
-- PHASE 3: MIGRATE EXISTING DATA
-- =====================================================

-- Migrate existing data: set created_at = started_at for existing rows
-- This ensures existing sessions have a created_at timestamp
UPDATE chat_sessions
SET
    created_at = started_at
WHERE
    created_at IS NULL
    AND started_at IS NOT NULL;

-- Set updated_at = started_at for existing rows that don't have updated_at
UPDATE chat_sessions
SET
    updated_at = started_at
WHERE
    updated_at IS NULL
    AND started_at IS NOT NULL;

-- =====================================================
-- PHASE 4: ADD CONSTRAINTS (OPTIONAL)
-- =====================================================

-- Add NOT NULL constraints after data migration
-- Note: These are commented out to avoid breaking existing data
-- Uncomment after verifying all rows have been migrated

-- ALTER TABLE chat_sessions
--   ALTER COLUMN session_id SET NOT NULL,
--   ALTER COLUMN messages SET NOT NULL,
--   ALTER COLUMN model_used SET NOT NULL,
--   ALTER COLUMN prompt_used SET NOT NULL,
--   ALTER COLUMN created_at SET NOT NULL,
--   ALTER COLUMN updated_at SET NOT NULL;

-- =====================================================
-- NOTES
-- =====================================================

-- After migration:
-- - started_at column is kept for backward compatibility
-- - New sessions should use created_at and updated_at
-- - The Go model (ChatSession) now matches the database schema
-- - Dashboard handlers can use either started_at or created_at
--   (currently using started_at as interim fix)

