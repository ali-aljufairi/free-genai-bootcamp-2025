-- +goose Up
-- +goose StatementBegin

-- Data Quality and Group Management Functions
-- Functions for analyzing data quality and creating automatic groups

/* ================================================================
DATA QUALITY FUNCTIONS
================================================================ */

-- Function to analyze words data quality issues
CREATE OR REPLACE FUNCTION analyze_words_data_quality(json_data JSONB)
RETURNS TABLE(
    issue_type TEXT,
    count BIGINT,
    sample_ids TEXT,
    description TEXT
) AS $$
DECLARE
    record_data JSONB;
    null_pos_count BIGINT := 0;
    empty_short_mean_count BIGINT := 0;
    null_word_count BIGINT := 0;
    null_id_count BIGINT := 0;
    null_pos_ids TEXT[] := ARRAY[]::TEXT[];
    empty_short_mean_ids TEXT[] := ARRAY[]::TEXT[];
    null_word_ids TEXT[] := ARRAY[]::TEXT[];
    null_id_ids TEXT[] := ARRAY[]::TEXT[];
    current_id TEXT;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each word record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        current_id := safe_jsonb_extract_text(record_data, 'id');

        -- Check for null IDs
        IF safe_jsonb_extract_int(record_data, 'id') IS NULL THEN
            null_id_count := null_id_count + 1;
            IF array_length(null_id_ids, 1) < 5 THEN
                null_id_ids := array_append(null_id_ids, COALESCE(current_id, 'NULL'));
            END IF;
        END IF;

        -- Check for null words
        IF safe_jsonb_extract_text(record_data, 'word') IS NULL THEN
            null_word_count := null_word_count + 1;
            IF array_length(null_word_ids, 1) < 5 THEN
                null_word_ids := array_append(null_word_ids, current_id);
            END IF;
        END IF;

        -- Check for null part_of_speech
        IF record_data -> 'part_of_speech' IS NULL OR record_data -> 'part_of_speech' = 'null'::jsonb THEN
            null_pos_count := null_pos_count + 1;
            IF array_length(null_pos_ids, 1) < 5 THEN
                null_pos_ids := array_append(null_pos_ids, current_id);
            END IF;
        END IF;

        -- Check for empty short_mean arrays
        IF safe_jsonb_extract_text_array(record_data, 'short_mean') IS NULL OR
           array_length(safe_jsonb_extract_text_array(record_data, 'short_mean'), 1) = 0 THEN
            empty_short_mean_count := empty_short_mean_count + 1;
            IF array_length(empty_short_mean_ids, 1) < 5 THEN
                empty_short_mean_ids := array_append(empty_short_mean_ids, current_id);
            END IF;
        END IF;
    END LOOP;

    -- Return results
    IF null_id_count > 0 THEN
        RETURN QUERY SELECT
            'null_id'::TEXT,
            null_id_count,
            array_to_string(null_id_ids, ', '),
            'Records with null or missing ID field';
    END IF;

    IF null_word_count > 0 THEN
        RETURN QUERY SELECT
            'null_word'::TEXT,
            null_word_count,
            array_to_string(null_word_ids, ', '),
            'Records with null or missing word field';
    END IF;

    IF null_pos_count > 0 THEN
        RETURN QUERY SELECT
            'null_part_of_speech'::TEXT,
            null_pos_count,
            array_to_string(null_pos_ids, ', '),
            'Records with null part_of_speech (will default to unclassified)';
    END IF;

    IF empty_short_mean_count > 0 THEN
        RETURN QUERY SELECT
            'empty_short_mean'::TEXT,
            empty_short_mean_count,
            array_to_string(empty_short_mean_ids, ', '),
            'Records with empty short_mean arrays (will default to "No meaning available")';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create word groups by JLPT level in fixed-size chunks (exclude level 0)
-- Example group names: N4-words-1, N4-words-2, ...
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
        INSERT INTO groups(name, description)
        SELECT DISTINCT
            FORMAT('N%s-words-%s', jlpt, chunk_no) AS name,
            FORMAT('Auto group N%s words (chunk %s)', jlpt, chunk_no) AS description
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

-- Create kanji groups by JLPT level in fixed-size chunks (exclude level 0)
-- Example group names: N4-kanji-1, N4-kanji-2, ...
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
        INSERT INTO groups(name, description)
        SELECT DISTINCT
            FORMAT('N%s-kanji-%s', jlpt, chunk_no) AS name,
            FORMAT('Auto group N%s kanji (chunk %s)', jlpt, chunk_no) AS description
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

-- Add comments for data quality functions
COMMENT ON FUNCTION analyze_words_data_quality (JSONB) IS 'Analyze data quality issues in words JSON data before import';

COMMENT ON FUNCTION create_word_groups_by_jlpt (INTEGER) IS 'Create word groups by JLPT level in fixed-size chunks';

COMMENT ON FUNCTION create_kanji_groups_by_jlpt (INTEGER) IS 'Create kanji groups by JLPT level in fixed-size chunks';

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS create_kanji_groups_by_jlpt(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS create_word_groups_by_jlpt(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS analyze_words_data_quality(JSONB) CASCADE;

-- +goose StatementEnd