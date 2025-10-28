-- Migration: Add user ownership tracking to groups table
-- This migration enhances the groups table to support user-created groups
-- System groups are identified by user_id being NULL

-- =====================================================
-- PHASE 1: ALTER GROUPS TABLE
-- =====================================================

-- Add new columns to groups table
ALTER TABLE groups
ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX idx_groups_user_id ON groups (user_id);

CREATE INDEX idx_groups_system ON groups (user_id)
WHERE
    user_id IS NULL;

-- =====================================================
-- PHASE 2: UPDATE EXISTING DATA
-- =====================================================

-- Existing groups are system-generated (user_id remains NULL)
-- No update needed - existing groups automatically have user_id = NULL

-- =====================================================
-- PHASE 3: UPDATE SEEDING FUNCTIONS
-- =====================================================

-- Update create_kanji_groups_by_jlpt function (system groups have user_id = NULL)
CREATE OR REPLACE FUNCTION create_kanji_groups_by_jlpt(p_chunk_size INTEGER DEFAULT 15)
RETURNS TABLE(created_groups INT, linked_kanji INT) AS $$
DECLARE
    v_created_groups INT := 0;
    v_linked_kanji INT := 0;
BEGIN
    IF p_chunk_size IS NULL OR p_chunk_size < 1 THEN
        RAISE EXCEPTION 'chunk_size must be positive';
    END IF;

    -- Materialize chunk assignments for kanji (JLPT 1..5 only)
    WITH k AS (
        SELECT 
            id AS kanji_id,
            jlpt,
            ((ROW_NUMBER() OVER (PARTITION BY jlpt ORDER BY id) - 1) / p_chunk_size + 1) AS chunk_no
        FROM kanji
        WHERE jlpt BETWEEN 1 AND 5
    ),
    g AS (
        INSERT INTO groups(name, description, created_at)
        SELECT DISTINCT 
            FORMAT('N%s-kanji-%s', jlpt, chunk_no) AS name,
            FORMAT('Auto group N%s kanji (chunk %s)', jlpt, chunk_no) AS description,
            NOW() AS created_at
        FROM k
        ON CONFLICT (name) DO NOTHING
        RETURNING 1
    )
    SELECT COALESCE(SUM(1), 0) INTO v_created_groups FROM g;

    -- Link kanji to their groups
    WITH k AS (
        SELECT 
            id AS kanji_id,
            jlpt,
            ((ROW_NUMBER() OVER (PARTITION BY jlpt ORDER BY id) - 1) / p_chunk_size + 1) AS chunk_no
        FROM kanji
        WHERE jlpt BETWEEN 1 AND 5
    ),
    ins AS (
        INSERT INTO kanji_groups(kanji_id, group_id)
        SELECT 
            k.kanji_id,
            gr.id
        FROM k
        JOIN groups gr ON gr.name = FORMAT('N%s-kanji-%s', k.jlpt, k.chunk_no)
        ON CONFLICT (kanji_id, group_id) DO NOTHING
        RETURNING 1
    )
    SELECT COALESCE(SUM(1), 0) INTO v_linked_kanji FROM ins;

    RETURN QUERY SELECT v_created_groups, v_linked_kanji;
END;
$$ LANGUAGE plpgsql;

-- Update create_word_groups_by_jlpt function (system groups have user_id = NULL)
CREATE OR REPLACE FUNCTION create_word_groups_by_jlpt(p_chunk_size INTEGER DEFAULT 10)
RETURNS TABLE(created_groups INT, linked_words INT) AS $$
DECLARE
    v_created_groups INT := 0;
    v_linked_words INT := 0;
BEGIN
    IF p_chunk_size IS NULL OR p_chunk_size < 1 THEN
        RAISE EXCEPTION 'chunk_size must be positive';
    END IF;

    -- Materialize chunk assignments for words (JLPT 1..5 only)
    WITH w AS (
        SELECT
            id AS word_id,
            jlpt,
            ((ROW_NUMBER() OVER (PARTITION BY jlpt ORDER BY id) - 1) / p_chunk_size + 1) AS chunk_no
        FROM words
        WHERE jlpt BETWEEN 1 AND 5
    ),
    g AS (
        INSERT INTO groups(name, description, created_at)
        SELECT DISTINCT
            FORMAT('N%s-words-%s', jlpt, chunk_no) AS name,
            FORMAT('Auto group N%s words (chunk %s)', jlpt, chunk_no) AS description,
            NOW() AS created_at
        FROM w
        ON CONFLICT (name) DO NOTHING
        RETURNING 1
    )
    SELECT COALESCE(SUM(1), 0) INTO v_created_groups FROM g;

    -- Link words to their groups
    WITH w AS (
        SELECT
            id AS word_id,
            jlpt,
            ((ROW_NUMBER() OVER (PARTITION BY jlpt ORDER BY id) - 1) / p_chunk_size + 1) AS chunk_no
        FROM words
        WHERE jlpt BETWEEN 1 AND 5
    ),
    ins AS (
        INSERT INTO word_groups(word_id, group_id)
        SELECT
            w.word_id,
            gr.id
        FROM w
        JOIN groups gr ON gr.name = FORMAT('N%s-words-%s', w.jlpt, w.chunk_no)
        ON CONFLICT (word_id, group_id) DO NOTHING
        RETURNING 1
    )
    SELECT COALESCE(SUM(1), 0) INTO v_linked_words FROM ins;

    RETURN QUERY SELECT v_created_groups, v_linked_words;
END;
$$ LANGUAGE plpgsql;