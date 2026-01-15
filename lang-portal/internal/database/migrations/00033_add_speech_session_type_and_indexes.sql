-- +goose Up
-- +goose StatementBegin
/*
 * Migration: Add 'speech' session type for companion and performance indexes
 * 
 * This migration:
 * 1. Updates enhanced_study_sessions session_type CHECK constraint to include 'speech'
 *    for the AI companion voice-based sessions
 * 2. Adds missing indexes on started_at to fix slow queries in dashboard_handlers.go
 * 3. Adds composite index for common query pattern: WHERE user_id = ? ORDER BY started_at DESC
 * 4. Adds functional index for DATE(started_at) used in streak/activity calculations
 */

-- =============================================================================
-- 1. UPDATE CHECK CONSTRAINT: Add 'speech' session type
-- =============================================================================
-- The AI companion uses 'speech' for voice-based conversation sessions.
-- Current constraint only allows: 'jlpt_practice', 'kanji_study', 'vocabulary_review', 'mixed'

-- Drop the existing inline CHECK constraint (auto-named by PostgreSQL)
ALTER TABLE enhanced_study_sessions 
DROP CONSTRAINT IF EXISTS enhanced_study_sessions_session_type_check;

-- Add updated CHECK constraint with 'speech' included
ALTER TABLE enhanced_study_sessions
ADD CONSTRAINT enhanced_study_sessions_session_type_check 
CHECK (session_type IN ('jlpt_practice', 'kanji_study', 'vocabulary_review', 'mixed', 'speech'));

-- +goose StatementEnd

-- =============================================================================
-- 2. ADD PERFORMANCE INDEXES (using CONCURRENTLY to avoid table locks)
-- =============================================================================
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction, 
-- so we use separate statements outside StatementBegin/End blocks

-- +goose NO TRANSACTION

-- Index on started_at for ORDER BY queries
-- Used in: dashboard_handlers.go lines 62, 286
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhanced_sessions_started 
ON enhanced_study_sessions (started_at);

-- Composite index for the most common query pattern: WHERE user_id = ? ORDER BY started_at DESC
-- Used in: dashboard_handlers.go lines 62, 286
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enhanced_sessions_user_started 
ON enhanced_study_sessions (user_id, started_at DESC);

-- Note: Functional index on date portion not created due to TIMESTAMPTZ immutability issues.
-- The composite index above should handle most query patterns effectively.
-- If DATE(started_at) queries remain slow, consider updating queries to use started_at directly
-- with date range comparisons: WHERE started_at >= '2026-01-01' AND started_at < '2026-01-02'


-- +goose Down
-- +goose StatementBegin
/*
 * Rollback: Remove 'speech' from session_type and drop performance indexes
 * 
 * WARNING: Rolling back will fail if any rows exist with session_type = 'speech'
 * You must first delete or update those rows:
 *   DELETE FROM enhanced_study_sessions WHERE session_type = 'speech';
 * or
 *   UPDATE enhanced_study_sessions SET session_type = 'mixed' WHERE session_type = 'speech';
 */

-- Revert CHECK constraint to original values (without 'speech')
ALTER TABLE enhanced_study_sessions 
DROP CONSTRAINT IF EXISTS enhanced_study_sessions_session_type_check;

ALTER TABLE enhanced_study_sessions
ADD CONSTRAINT enhanced_study_sessions_session_type_check 
CHECK (session_type IN ('jlpt_practice', 'kanji_study', 'vocabulary_review', 'mixed'));

-- +goose StatementEnd

-- +goose NO TRANSACTION

-- Drop the performance indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_enhanced_sessions_started;
DROP INDEX CONCURRENTLY IF EXISTS idx_enhanced_sessions_user_started;
