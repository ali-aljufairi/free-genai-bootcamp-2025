-- +goose Up
-- +goose StatementBegin
-- Core Data Import Functions for PostgreSQL Migration
-- This file contains safe JSON extraction and validation functions
-- for importing kanji, words, and grammar data from cleaned JSON files

-- Requirements: 2.1, 2.2, 4.1, 6.1, 7.1

/* ================================================================
SAFE JSON EXTRACTION AND VALIDATION FUNCTIONS
================================================================ */

-- Safe JSON text extraction with validation
CREATE OR REPLACE FUNCTION safe_jsonb_extract_text(json_data JSONB, key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract and validate text value
    DECLARE
        result TEXT := json_data ->> key;
    BEGIN
        -- Return null for empty strings
        IF result = '' THEN
            RETURN NULL;
        END IF;
        RETURN result;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting text key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JSON integer extraction with validation
CREATE OR REPLACE FUNCTION safe_jsonb_extract_int(json_data JSONB, key TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract and validate integer value
    DECLARE
        text_value TEXT := json_data ->> key;
        result INTEGER;
    BEGIN
        -- Handle empty or null string values
        IF text_value IS NULL OR text_value = '' THEN
            RETURN NULL;
        END IF;

        -- Convert to integer with validation
        result := text_value::INTEGER;
        RETURN result;
    END;
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE WARNING 'Invalid integer value for key "%": %', key, json_data ->> key;
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting integer key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JSON decimal extraction
CREATE OR REPLACE FUNCTION safe_jsonb_extract_decimal(json_data JSONB, key TEXT)
RETURNS DECIMAL AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract and validate decimal value
    DECLARE
        text_value TEXT := json_data ->> key;
        result DECIMAL;
    BEGIN
        -- Handle empty or null string values
        IF text_value IS NULL OR text_value = '' THEN
            RETURN NULL;
        END IF;

        -- Convert to decimal with validation
        result := text_value::DECIMAL;
        RETURN result;
    END;
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE WARNING 'Invalid decimal value for key "%": %', key, json_data ->> key;
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting decimal key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JSON array extraction and conversion to PostgreSQL text array
CREATE OR REPLACE FUNCTION safe_jsonb_extract_text_array(json_data JSONB, key TEXT)
RETURNS TEXT[] AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract array and convert to text array
    DECLARE
        json_array JSONB := json_data -> key;
        result TEXT[];
    BEGIN
        -- Handle non-array values
        IF jsonb_typeof(json_array) != 'array' THEN
            RETURN NULL;
        END IF;

        -- Convert JSONB array to PostgreSQL text array
        SELECT ARRAY(SELECT jsonb_array_elements_text(json_array)) INTO result;

        -- Return null for empty arrays
        IF array_length(result, 1) IS NULL THEN
            RETURN NULL;
        END IF;

        RETURN result;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting array key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe nested JSON decimal extraction
CREATE OR REPLACE FUNCTION safe_jsonb_extract_nested_decimal(json_data JSONB, path TEXT[])
RETURNS DECIMAL AS $$
DECLARE
    current_data JSONB := json_data;
    path_element TEXT;
    result DECIMAL;
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb THEN
        RETURN NULL;
    END IF;

    -- Navigate through nested path
    FOREACH path_element IN ARRAY path
    LOOP
        IF current_data IS NULL OR NOT current_data ? path_element THEN
            RETURN NULL;
        END IF;
        current_data := current_data -> path_element;
    END LOOP;

    -- Extract final decimal value
    IF jsonb_typeof(current_data) IN ('number', 'string') THEN
        result := (current_data #>> '{}')::DECIMAL;
        RETURN result;
    END IF;

    RETURN NULL;
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE WARNING 'Invalid decimal value in nested path %: %', path, current_data;
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting nested decimal path % from JSON: %', path, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe nested JSON text extraction (for complex structures like furigana)
CREATE OR REPLACE FUNCTION safe_jsonb_extract_nested_text(json_data JSONB, path TEXT[])
RETURNS TEXT AS $$
DECLARE
    current_data JSONB := json_data;
    path_element TEXT;
    result TEXT;
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb THEN
        RETURN NULL;
    END IF;

    -- Navigate through nested path
    FOREACH path_element IN ARRAY path
    LOOP
        IF current_data IS NULL OR NOT current_data ? path_element THEN
            RETURN NULL;
        END IF;
        current_data := current_data -> path_element;
    END LOOP;

    -- Extract final text value
    IF jsonb_typeof(current_data) = 'string' THEN
        result := current_data #>> '{}';
        IF result = '' THEN
            RETURN NULL;
        END IF;
        RETURN result;
    END IF;

    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting nested path % from JSON: %', path, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe SVG data extraction and validation
CREATE OR REPLACE FUNCTION safe_jsonb_extract_svg(json_data JSONB, key TEXT)
RETURNS TEXT AS $$
DECLARE
    svg_content TEXT;
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract SVG content
    svg_content := json_data ->> key;

    -- Validate that it's actually SVG content
    IF svg_content IS NULL OR svg_content = '' THEN
        RETURN NULL;
    END IF;

    -- Basic SVG validation - check for SVG tag
    IF NOT (svg_content LIKE '%<svg%' OR svg_content LIKE '%&lt;svg%') THEN
        RAISE WARNING 'Invalid SVG content for key "%": missing SVG tag', key;
        RETURN NULL;
    END IF;

    -- Decode HTML entities if present
    svg_content := regexp_replace(svg_content, '&lt;', '<', 'g');
    svg_content := regexp_replace(svg_content, '&gt;', '>', 'g');
    svg_content := regexp_replace(svg_content, '&quot;', '"', 'g');
    svg_content := regexp_replace(svg_content, '&amp;', '&', 'g');

    RETURN svg_content;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting SVG key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add helpful comments
COMMENT ON FUNCTION safe_jsonb_extract_text (JSONB, TEXT) IS 'Safely extract text value from JSONB with error handling';

COMMENT ON FUNCTION safe_jsonb_extract_int (JSONB, TEXT) IS 'Safely extract integer value from JSONB with validation';

COMMENT ON FUNCTION safe_jsonb_extract_decimal (JSONB, TEXT) IS 'Safely extract decimal value from JSONB with validation';

COMMENT ON FUNCTION safe_jsonb_extract_text_array (JSONB, TEXT) IS 'Safely extract and convert JSONB array to PostgreSQL text array';

COMMENT ON FUNCTION safe_jsonb_extract_nested_decimal (JSONB, TEXT []) IS 'Safely extract decimal value from nested JSON path with error handling';

COMMENT ON FUNCTION safe_jsonb_extract_nested_text (JSONB, TEXT []) IS 'Safely extract text value from nested JSON path with error handling';

COMMENT ON FUNCTION safe_jsonb_extract_svg (JSONB, TEXT) IS 'Safely extract and validate SVG content from JSONB with HTML entity decoding';

-- Core Data Import Functions
-- Main functions for importing kanji, words, grammar, and sentences data

/* ================================================================
CORE DATA IMPORT FUNCTIONS
================================================================ */

-- Import kanji data from cleaned JSON
CREATE OR REPLACE FUNCTION import_kanji_data(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each kanji record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO kanji (
                id, "character", heisig_en, meanings, unicode, onyomi, kunyomi,
                detail, jlpt, frequency, components, stroke_count, strokes_svg, audio_path
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'id'),
                safe_jsonb_extract_text(record_data, 'character'),
                safe_jsonb_extract_text(record_data, 'heisig_en'),
                record_data -> 'meanings',
                safe_jsonb_extract_text(record_data, 'unicode'),
                safe_jsonb_extract_text(record_data, 'onyomi'),
                safe_jsonb_extract_text(record_data, 'kunyomi'),
                CASE
                    WHEN safe_jsonb_extract_text(record_data, 'detail') IS NOT NULL THEN
                        safe_jsonb_extract_text(record_data, 'detail')
                    WHEN record_data -> 'meanings' IS NOT NULL AND jsonb_array_length(record_data -> 'meanings') > 0 THEN
                        array_to_string(ARRAY(
                            SELECT jsonb_array_elements_text(record_data -> 'meanings')
                            ORDER BY jsonb_array_elements_text(record_data -> 'meanings')
                        ), ', ')
                    ELSE NULL
                END,
                safe_jsonb_extract_jlpt_level(record_data, 'jlpt'),
                safe_jsonb_extract_int(record_data, 'frequency'),
                safe_jsonb_extract_text(record_data, 'components'),
                safe_jsonb_extract_int(record_data, 'stroke_count'),
                safe_jsonb_extract_svg(record_data, 'strokes_svg'),
                safe_jsonb_extract_text(record_data, 'audio') -- Audio URL from JSON
            )
            ON CONFLICT (id) DO UPDATE SET
                "character" = EXCLUDED."character",
                heisig_en = EXCLUDED.heisig_en,
                meanings = EXCLUDED.meanings,
                unicode = EXCLUDED.unicode,
                onyomi = EXCLUDED.onyomi,
                kunyomi = EXCLUDED.kunyomi,
                detail = EXCLUDED.detail,
                jlpt = EXCLUDED.jlpt,
                frequency = EXCLUDED.frequency,
                components = EXCLUDED.components,
                stroke_count = EXCLUDED.stroke_count,
                strokes_svg = EXCLUDED.strokes_svg,
                audio_path = EXCLUDED.audio_path;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing kanji record ID %: %',
                    safe_jsonb_extract_int(record_data, 'id'), SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to fix inconsistencies between meanings and detail fields
CREATE OR REPLACE FUNCTION fix_kanji_meanings_detail()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update records where meanings exists but detail is null/empty
    UPDATE kanji SET
        detail = array_to_string(ARRAY(
            SELECT jsonb_array_elements_text(meanings)
            ORDER BY jsonb_array_elements_text(meanings)
        ), ', ')
    WHERE meanings IS NOT NULL
      AND jsonb_array_length(meanings) > 0
      AND (detail IS NULL OR detail = '');

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Import kanji SVG stroke data from separate JSON file
CREATE OR REPLACE FUNCTION import_kanji_svg_strokes(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
    updated_count INTEGER := 0;
    record_data JSONB;
    kanji_id INTEGER;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each SVG stroke record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            kanji_id := safe_jsonb_extract_int(record_data, 'id');
            processed_count := processed_count + 1;

            -- Update existing kanji record with SVG stroke data
            UPDATE kanji SET
                strokes_svg = safe_jsonb_extract_svg(record_data, 'strokes_svg')
            WHERE id = kanji_id;

            -- Count only if a row was actually updated
            IF FOUND THEN
                updated_count := updated_count + 1;
            ELSE
                RAISE WARNING 'Kanji with ID % not found for SVG stroke update', kanji_id;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing SVG stroke data for kanji ID %: %',
                    safe_jsonb_extract_int(record_data, 'id'), SQLERRM;
        END;
    END LOOP;

    -- Log summary
    RAISE NOTICE 'SVG Import Summary: Processed % records, Updated % kanji with SVG data', processed_count, updated_count;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Import words data from cleaned JSON
CREATE OR REPLACE FUNCTION import_words_data(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    error_count INTEGER := 0;
    record_data JSONB;
    short_mean_array TEXT[];
    english_text TEXT;
    word_id INTEGER;
    word_text TEXT;
    phonetic_text TEXT;
    pos_array JSONB;
    level_text TEXT;
    determined_kana TEXT;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each word record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            -- Extract key fields for debugging
            word_id := safe_jsonb_extract_int(record_data, 'id');
            word_text := safe_jsonb_extract_text(record_data, 'word');
            phonetic_text := safe_jsonb_extract_text(record_data, 'phonetic');
            pos_array := record_data -> 'part_of_speech';
            level_text := safe_jsonb_extract_text(record_data, 'level');

            -- Determine kana reading
            IF phonetic_text IS NOT NULL AND phonetic_text != '' THEN
                determined_kana := phonetic_text;
            ELSIF is_hiragana(word_text) THEN
                determined_kana := word_text;
            ELSIF is_katakana(word_text) THEN
                determined_kana := katakana_to_hiragana(word_text);
            ELSE
                determined_kana := NULL;
            END IF;

            -- Extract and join short meanings
            short_mean_array := safe_jsonb_extract_text_array(record_data, 'short_mean');
            english_text := CASE
                WHEN short_mean_array IS NOT NULL AND array_length(short_mean_array, 1) > 0 THEN
                    array_to_string(short_mean_array, ', ')
                ELSE
                    'No meaning available'
            END;

            INSERT INTO words (
                id, kana, kanji, romaji, english, part_of_speech, jlpt, level, audio_path, raw_data
            ) VALUES (
                word_id,
                determined_kana, -- Determined kana reading
                word_text,
                CASE
                    WHEN determined_kana IS NOT NULL THEN
                        hiragana_to_romaji(determined_kana)
                    ELSE
                        NULL
                END, -- Convert hiragana to romaji
                english_text,
                validate_part_of_speech(pos_array),
                COALESCE(validate_jlpt_level(level_text), 0), -- Default to 0 if no level
                COALESCE(validate_jlpt_level(level_text), 0), -- Default to 0 if no level
                safe_jsonb_extract_text(record_data, 'audio'), -- Audio URL from JSON
                record_data -- Store complete raw data for complex fields
            )
            ON CONFLICT (id) DO UPDATE SET
                kana = EXCLUDED.kana,
                kanji = EXCLUDED.kanji,
                romaji = EXCLUDED.romaji,
                english = EXCLUDED.english,
                part_of_speech = EXCLUDED.part_of_speech,
                jlpt = EXCLUDED.jlpt,
                level = EXCLUDED.level,
                audio_path = EXCLUDED.audio_path,
                raw_data = EXCLUDED.raw_data;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE WARNING 'Error importing word record ID % (word: %, phonetic: %, pos: %, level: %): %',
                    word_id, word_text, phonetic_text, pos_array, level_text, SQLERRM;
        END;
    END LOOP;

    -- Log summary
    RAISE NOTICE 'Words Import Summary: Successfully imported % words, % errors encountered', inserted_count, error_count;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import grammar data from cleaned JSON
CREATE OR REPLACE FUNCTION import_grammar_data(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
    current_grammar_id INTEGER;
    example_data JSONB;
    synonym_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each grammar record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            current_grammar_id := safe_jsonb_extract_int(record_data, 'id');

            -- Insert main grammar point
            INSERT INTO grammar_points (id, key, base_form, level, structure)
            VALUES (
                current_grammar_id,
                safe_jsonb_extract_nested_text(record_data, ARRAY['key', 'text']),
                safe_jsonb_extract_nested_text(record_data, ARRAY['key', 'text']),
                safe_jsonb_extract_text(record_data, 'level'),
                safe_jsonb_extract_nested_text(record_data, ARRAY['structure', 'text'])
            )
            ON CONFLICT (id) DO UPDATE SET
                key = EXCLUDED.key,
                base_form = EXCLUDED.base_form,
                level = EXCLUDED.level,
                structure = EXCLUDED.structure;

            -- Insert grammar details
            INSERT INTO grammar_details (grammar_id, meaning, notes, caution, fun_fact)
            VALUES (
                current_grammar_id,
                safe_jsonb_extract_text(record_data, 'mean'),
                safe_jsonb_extract_text(record_data, 'note'),
                safe_jsonb_extract_text(record_data, 'caution'),
                safe_jsonb_extract_text(record_data, 'fun_fact')
            )
            ON CONFLICT (grammar_id) DO UPDATE SET
                meaning = EXCLUDED.meaning,
                notes = EXCLUDED.notes,
                caution = EXCLUDED.caution,
                fun_fact = EXCLUDED.fun_fact;

            -- Insert examples
            IF record_data ? 'examples' AND jsonb_array_length(record_data -> 'examples') > 0 THEN
                FOR example_data IN SELECT jsonb_array_elements(record_data -> 'examples')
                LOOP
                    INSERT INTO grammar_examples (grammar_id, japanese, english)
                    VALUES (
                        current_grammar_id,
                        safe_jsonb_extract_nested_text(example_data, ARRAY['example', 'text']),
                        safe_jsonb_extract_text(example_data, 'mean')
                    );
                END LOOP;
            END IF;

            -- Insert synonyms as relations
            IF record_data ? 'synonyms' AND jsonb_array_length(record_data -> 'synonyms') > 0 THEN
                FOR synonym_data IN SELECT jsonb_array_elements(record_data -> 'synonyms')
                LOOP
                    -- Note: This would require matching synonyms to existing grammar points
                    -- For now, we'll store them as examples with a special marker
                    INSERT INTO grammar_examples (grammar_id, japanese, english)
                    VALUES (
                        current_grammar_id,
                        '[SYNONYM] ' || safe_jsonb_extract_nested_text(synonym_data, ARRAY['example', 'text']),
                        safe_jsonb_extract_text(synonym_data, 'mean')
                    );
                END LOOP;
            END IF;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing grammar record ID %: %',
                    current_grammar_id, SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import grammar readings from furigana JSON
CREATE OR REPLACE FUNCTION import_grammar_readings(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each furigana record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            -- Insert grammar reading
            INSERT INTO grammar_readings (grammar_id, kanji, reading, position)
            VALUES (
                safe_jsonb_extract_int(record_data, 'grammar_id'),
                safe_jsonb_extract_text(record_data, 'base_text'),
                safe_jsonb_extract_text(record_data, 'furigana'),
                safe_jsonb_extract_int(record_data, 'start_pos')
            )
            ON CONFLICT (grammar_id, kanji, position) DO UPDATE SET
                reading = EXCLUDED.reading;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing grammar reading for grammar_id %: %',
                    safe_jsonb_extract_int(record_data, 'grammar_id'), SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import example sentences from cleaned JSON
CREATE OR REPLACE FUNCTION import_example_sentences(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each sentence record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            -- Insert sentence
            INSERT INTO sentences (id, japanese, english, source)
            VALUES (
                safe_jsonb_extract_int(record_data -> 'ID', 'String'),
                safe_jsonb_extract_text(record_data -> 'Content', 'String'),
                safe_jsonb_extract_text(record_data -> 'Mean', 'String'),
                'examples_clean.json'
            )
            ON CONFLICT (id) DO UPDATE SET
                japanese = EXCLUDED.japanese,
                english = EXCLUDED.english,
                source = EXCLUDED.source;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing sentence ID %: %',
                    safe_jsonb_extract_int(record_data -> 'ID', 'String'), SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Test import functions with sample data
CREATE OR REPLACE FUNCTION test_import_functions()
RETURNS TABLE(test_name TEXT, result TEXT) AS $$
BEGIN
    -- Test safe_jsonb_extract_text
    RETURN QUERY SELECT 'safe_jsonb_extract_text'::TEXT,
        CASE WHEN safe_jsonb_extract_text('{"name": "test"}'::jsonb, 'name') = 'test'
             THEN 'PASS' ELSE 'FAIL' END;

    -- Test safe_jsonb_extract_int
    RETURN QUERY SELECT 'safe_jsonb_extract_int'::TEXT,
        CASE WHEN safe_jsonb_extract_int('{"id": 123}'::jsonb, 'id') = 123
             THEN 'PASS' ELSE 'FAIL' END;

    -- Test safe_jsonb_extract_decimal
    RETURN QUERY SELECT 'safe_jsonb_extract_decimal'::TEXT,
        CASE WHEN safe_jsonb_extract_decimal('{"duration": 22.035}'::jsonb, 'duration') = 22.035
             THEN 'PASS' ELSE 'FAIL' END;

    -- Test safe_jsonb_extract_nested_decimal (audio_time case)
    RETURN QUERY SELECT 'safe_jsonb_extract_nested_decimal'::TEXT,
        CASE WHEN safe_jsonb_extract_nested_decimal('{"general": {"audios": {"audio_time": 22.035}}}'::jsonb, ARRAY['general', 'audios', 'audio_time']) = 22.035
             THEN 'PASS' ELSE 'FAIL' END;

    -- Test safe_jsonb_extract_text_array
    RETURN QUERY SELECT 'safe_jsonb_extract_text_array'::TEXT,
        CASE WHEN safe_jsonb_extract_text_array('{"items": ["a", "b"]}'::jsonb, 'items') = ARRAY['a', 'b']
             THEN 'PASS' ELSE 'FAIL' END;

    -- Test validate_jlpt_level
    RETURN QUERY SELECT 'validate_jlpt_level'::TEXT,
        CASE WHEN validate_jlpt_level('N3') = 3
             THEN 'PASS' ELSE 'FAIL' END;

    -- Test validate_part_of_speech
    RETURN QUERY SELECT 'validate_part_of_speech'::TEXT,
        CASE WHEN validate_part_of_speech('["noun"]'::jsonb) = 'noun'::pos_enum
             THEN 'PASS' ELSE 'FAIL' END;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the core import functions
COMMENT ON FUNCTION import_kanji_data (JSONB) IS 'Import kanji data from cleaned JSON with SVG stroke support and error handling';

COMMENT ON FUNCTION fix_kanji_meanings_detail () IS 'Fix inconsistencies between meanings and detail fields in kanji table';

COMMENT ON FUNCTION import_kanji_svg_strokes (JSONB) IS 'Import kanji SVG stroke data from separate JSON file with validation';

COMMENT ON FUNCTION import_words_data (JSONB) IS 'Import words data from cleaned JSON with validation';

COMMENT ON FUNCTION import_grammar_data (JSONB) IS 'Import grammar data from cleaned JSON with relationships';

COMMENT ON FUNCTION import_grammar_readings (JSONB) IS 'Import grammar readings from furigana JSON data';

COMMENT ON FUNCTION import_example_sentences (JSONB) IS 'Import example sentences from cleaned JSON data';

COMMENT ON FUNCTION test_import_functions () IS 'Test core import functions with sample data';

-- Word Builder Kanji Chain Functions
-- Functions and views to support 6-kanji chain building for Word Builder game
-- This moves heavy graph traversal computation from Go backend to PostgreSQL

/* ================================================================
KANJI ADJACENCY MAP (Materialized View)
================================================================ */

-- Materialized view that pre-computes kanji → word → neighbor kanji relationships
-- This eliminates the need for Go-side caching and adjacency map building
CREATE MATERIALIZED VIEW IF NOT EXISTS kanji_adjacency_map AS
WITH
    kanji_words AS (
        SELECT
            ir.to_id AS kanji_id,
            ir.from_id AS word_id,
            array_agg(DISTINCT ir2.to_id) AS neighbor_kanji_ids,
            k.jlpt AS kanji_jlpt
        FROM
            item_relations ir
            JOIN item_relations ir2 ON ir2.from_id = ir.from_id
            AND ir2.rel_type = 'USES_KANJI'
            AND ir2.to_type = 'kanji'
            JOIN words w ON w.id = ir.from_id
            JOIN kanji k ON k.id = ir.to_id
        WHERE
            ir.rel_type = 'USES_KANJI'
            AND ir.to_type = 'kanji'
            AND ir2.to_type = 'kanji'
            AND w.kanji IS NOT NULL
            AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
            AND LENGTH(w.kanji) BETWEEN 2 AND 4
            -- Removed frequency requirement to include all kanji used in words
        GROUP BY
            ir.to_id,
            ir.from_id,
            k.jlpt
    )
SELECT
    kanji_id,
    word_id,
    neighbor_kanji_ids,
    kanji_jlpt
FROM kanji_words;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_kanji_adjacency_kanji_id ON kanji_adjacency_map (kanji_id);

CREATE INDEX IF NOT EXISTS idx_kanji_adjacency_jlpt ON kanji_adjacency_map (kanji_jlpt);

CREATE INDEX IF NOT EXISTS idx_kanji_adjacency_kanji_jlpt ON kanji_adjacency_map (kanji_id, kanji_jlpt);

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_kanji_adjacency_unique ON kanji_adjacency_map (kanji_id, word_id);

-- Function to refresh the materialized view
-- Should be called after data imports or periodically
-- Drops and recreates the view to ensure it uses the latest definition
CREATE OR REPLACE FUNCTION refresh_kanji_adjacency_map()
RETURNS void AS $$
BEGIN
    -- Drop existing view and recreate with latest definition
    DROP MATERIALIZED VIEW IF EXISTS kanji_adjacency_map CASCADE;
    
    CREATE MATERIALIZED VIEW kanji_adjacency_map AS
    WITH
        kanji_words AS (
            SELECT
                ir.to_id AS kanji_id,
                ir.from_id AS word_id,
                array_agg(DISTINCT ir2.to_id) AS neighbor_kanji_ids,
                k.jlpt AS kanji_jlpt
            FROM
                item_relations ir
                JOIN item_relations ir2 ON ir2.from_id = ir.from_id
                AND ir2.rel_type = 'USES_KANJI'
                AND ir2.to_type = 'kanji'
                JOIN words w ON w.id = ir.from_id
                JOIN kanji k ON k.id = ir.to_id
            WHERE
                ir.rel_type = 'USES_KANJI'
                AND ir.to_type = 'kanji'
                AND ir2.to_type = 'kanji'
                AND w.kanji IS NOT NULL
                AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
                AND LENGTH(w.kanji) BETWEEN 2 AND 4
            GROUP BY
                ir.to_id,
                ir.from_id,
                k.jlpt
        )
    SELECT
        kanji_id,
        word_id,
        neighbor_kanji_ids,
        kanji_jlpt
    FROM kanji_words;
    
    -- Recreate indexes
    CREATE INDEX idx_kanji_adjacency_kanji_id ON kanji_adjacency_map (kanji_id);
    CREATE INDEX idx_kanji_adjacency_jlpt ON kanji_adjacency_map (kanji_jlpt);
    CREATE INDEX idx_kanji_adjacency_kanji_jlpt ON kanji_adjacency_map (kanji_id, kanji_jlpt);
    CREATE UNIQUE INDEX idx_kanji_adjacency_unique ON kanji_adjacency_map (kanji_id, word_id);
    
    RAISE NOTICE 'Kanji adjacency map refreshed (recreated with latest definition)';
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW kanji_adjacency_map IS 'Pre-computed kanji adjacency map: for each kanji, stores which words contain it and which other kanji those words introduce. Used by Word Builder chain building.';

COMMENT ON FUNCTION refresh_kanji_adjacency_map () IS 'Refresh the kanji_adjacency_map materialized view. Should be called after data imports.';

/* ================================================================
KANJI CHAIN BUILDING FUNCTION
================================================================ */

-- Function to build a chain of 6 kanji by traversing word relationships
-- Uses recursive CTE to traverse kanji → word → kanji graph
CREATE OR REPLACE FUNCTION build_kanji_chain(
    p_jlpt_level INT,
    p_target_count INT DEFAULT 6,
    p_exclude_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[]
)
RETURNS BIGINT[] AS $$
DECLARE
    v_kanji_chain BIGINT[] := ARRAY[]::BIGINT[];
    v_seed_kanji_id BIGINT;
    v_current_kanji_id BIGINT;
    v_next_kanji_id BIGINT;
    v_word_id BIGINT;
    v_attempts INT := 0;
    v_max_attempts INT := 10;  -- Increased from 5 to give more chances
    v_jlpt_min INT;
    v_jlpt_max INT;
    v_word_count INT;
BEGIN
    -- Log function call
    RAISE NOTICE 'build_kanji_chain called: jlpt_level=%, target_count=%, exclude_ids=%', 
        p_jlpt_level, p_target_count, p_exclude_ids;
    
    -- Calculate JLPT range (allow ±1 level flexibility)
    v_jlpt_min := GREATEST(1, p_jlpt_level - 1);
    v_jlpt_max := LEAST(5, p_jlpt_level + 1);
    RAISE NOTICE 'JLPT range: % to %', v_jlpt_min, v_jlpt_max;
    
    -- Try up to max_attempts times to build a chain
    WHILE v_attempts < v_max_attempts AND array_length(v_kanji_chain, 1) < p_target_count LOOP
        RAISE NOTICE 'Attempt % of %', v_attempts + 1, v_max_attempts;
        -- Reset chain for new attempt
        v_kanji_chain := ARRAY[]::BIGINT[];
        
        -- Pick seed kanji with good connectivity (high degree)
        -- Prefer kanji with many neighbors and frequency data
        -- Add randomization based on attempt number to avoid retrying same seed
        SELECT kam.kanji_id INTO v_seed_kanji_id
        FROM kanji_adjacency_map kam
        JOIN kanji k ON k.id = kam.kanji_id
        WHERE kam.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
          AND (kam.kanji_id != ALL(p_exclude_ids))
          AND k.frequency IS NOT NULL
        GROUP BY kam.kanji_id, k.frequency
        HAVING COUNT(DISTINCT kam.word_id) >= 2  -- At least 2 words
        ORDER BY 
            -- Add some randomization to avoid always picking same seed on retries
            (COUNT(DISTINCT kam.word_id) + (v_attempts * 17) % 5) DESC,
            k.frequency DESC NULLS LAST,
            RANDOM()  -- Additional randomization
        LIMIT 1;
        
        -- If no seed found, return empty array
        IF v_seed_kanji_id IS NULL THEN
            RAISE NOTICE 'No seed kanji found for JLPT % (range %-%)', p_jlpt_level, v_jlpt_min, v_jlpt_max;
            RETURN ARRAY[]::BIGINT[];
        END IF;
        
        RAISE NOTICE 'Seed kanji selected: %', v_seed_kanji_id;
        
        -- Start chain with seed
        v_kanji_chain := ARRAY[v_seed_kanji_id];
        v_current_kanji_id := v_seed_kanji_id;
        
        -- Build chain using recursive traversal
        WHILE array_length(v_kanji_chain, 1) < p_target_count LOOP
            -- Find next kanji: words containing current kanji → other kanji in those words
            -- Prefer words that use ONLY kanji already in chain + the new kanji (better mutual coverage)
            SELECT 
                kam2.kanji_id,
                kam.word_id
            INTO 
                v_next_kanji_id,
                v_word_id
            FROM kanji_adjacency_map kam
            JOIN kanji_adjacency_map kam2 
                ON kam2.word_id = kam.word_id
                AND kam2.kanji_id != kam.kanji_id  -- Don't select current kanji as neighbor
            JOIN kanji k ON k.id = kam2.kanji_id
            JOIN words w ON w.id = kam.word_id
            -- Check if this word uses ONLY kanji from current chain + the candidate
            LEFT JOIN LATERAL (
                SELECT array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) AS word_kanji_set
                FROM item_relations ir
                WHERE ir.from_id = w.id
                    AND ir.rel_type = 'USES_KANJI'
                    AND ir.to_type = 'kanji'
            ) word_kanji ON true
            WHERE kam.kanji_id = v_current_kanji_id
              AND kam.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
              AND kam2.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
              AND (kam2.kanji_id != ALL(v_kanji_chain))  -- Not already in chain
              AND (kam2.kanji_id != ALL(p_exclude_ids))   -- Not excluded
              AND k.frequency IS NOT NULL
              AND k.jlpt BETWEEN v_jlpt_min AND v_jlpt_max  -- Also check actual kanji JLPT
            -- Prefer words that use ONLY kanji from current chain + new kanji (better coverage)
            -- This ensures we build chains with good mutual word coverage
            AND (
                word_kanji.word_kanji_set <@ (v_kanji_chain || ARRAY[kam2.kanji_id])  -- Word uses only chain kanji
                OR array_length(v_kanji_chain, 1) >= p_target_count - 2  -- Last 2 kanji: allow any
            )
            -- Prefer neighbors with good future expansion potential (but don't require it for all hops)
            AND (
                array_length(v_kanji_chain, 1) >= p_target_count - 2  -- Last 2 kanji: allow any neighbor
                OR EXISTS (
                    SELECT 1
                    FROM kanji_adjacency_map kam3
                    WHERE kam3.kanji_id = kam2.kanji_id
                      AND kam3.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
                    GROUP BY kam3.kanji_id
                    HAVING COUNT(DISTINCT kam3.word_id) >= 2
                )
            )
            ORDER BY 
                CASE WHEN word_kanji.word_kanji_set <@ (v_kanji_chain || ARRAY[kam2.kanji_id]) THEN 0 ELSE 1 END,  -- Prefer words using only chain kanji
                k.frequency DESC NULLS LAST
            LIMIT 1;
            
            -- If no next kanji found, we've hit a dead end
            IF v_next_kanji_id IS NULL THEN
                RAISE NOTICE 'Dead end at kanji % (chain length: %)', v_current_kanji_id, array_length(v_kanji_chain, 1);
                EXIT;  -- Break inner loop, will retry with new seed
            END IF;
            
            -- Add to chain
            v_kanji_chain := array_append(v_kanji_chain, v_next_kanji_id);
            v_current_kanji_id := v_next_kanji_id;
            RAISE NOTICE 'Added kanji % to chain (length: %)', v_next_kanji_id, array_length(v_kanji_chain, 1);
        END LOOP;
        
        -- If we got enough kanji, validate mutual word coverage before returning
        IF array_length(v_kanji_chain, 1) >= p_target_count THEN
            RAISE NOTICE 'Chain built with % kanji: %', array_length(v_kanji_chain, 1), v_kanji_chain;
            
            -- Check if the final chain has mutual word coverage
            -- At least one word should use MULTIPLE kanji (2+) from the chain
            -- This ensures the kanji actually form words together, not just individually
            SELECT COUNT(*) INTO v_word_count
            FROM (
                SELECT ir.from_id AS word_id,
                    array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) AS word_kanji_set
                FROM item_relations ir
                WHERE ir.from_type = 'word'
                    AND ir.rel_type = 'USES_KANJI'
                    AND ir.to_type = 'kanji'
                    AND ir.to_id::BIGINT = ANY(v_kanji_chain)
                GROUP BY ir.from_id
                HAVING array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) <@ v_kanji_chain
                    AND cardinality(array_agg(DISTINCT ir.to_id::BIGINT)) >= 2  -- Require at least 2 kanji
            ) valid_words;
            
            RAISE NOTICE 'Validation: found % valid words (with 2+ kanji) for chain', v_word_count;
            
            -- If we found at least 1 valid word with multiple kanji, return the chain
            IF v_word_count > 0 THEN
                RAISE NOTICE 'Returning valid chain: %', v_kanji_chain;
                RETURN v_kanji_chain;
            ELSE
                RAISE NOTICE 'Chain has no valid words with 2+ kanji, retrying... (attempt %)', v_attempts + 1;
            END IF;
        ELSE
            RAISE NOTICE 'Chain incomplete: only % kanji (target: %)', array_length(v_kanji_chain, 1), p_target_count;
        END IF;
        
        -- Otherwise, increment attempts and try again
        v_attempts := v_attempts + 1;
    END LOOP;
    
    -- Return whatever we got (might be less than target if all attempts failed)
    IF array_length(v_kanji_chain, 1) > 0 THEN
        RAISE NOTICE 'Returning partial chain after % attempts: %', v_attempts, v_kanji_chain;
    ELSE
        RAISE NOTICE 'Failed to build chain after % attempts', v_attempts;
    END IF;
    RETURN v_kanji_chain;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_kanji_chain (INT, INT, BIGINT[]) IS 'Build a chain of kanji by traversing word relationships. Returns array of kanji IDs. Uses recursive graph traversal to find connected kanji through shared words.';

/* ================================================================
HELPER FUNCTION: Get Kanji Degree (connectivity)
================================================================ */

-- Helper function to get the degree (number of neighbors) for a kanji
-- Useful for seed selection and debugging
CREATE OR REPLACE FUNCTION get_kanji_degree(
    p_kanji_id BIGINT,
    p_jlpt_min INT DEFAULT 1,
    p_jlpt_max INT DEFAULT 5
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT kam.word_id)
        FROM kanji_adjacency_map kam
        WHERE kam.kanji_id = p_kanji_id
          AND kam.kanji_jlpt BETWEEN p_jlpt_min AND p_jlpt_max
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_kanji_degree (BIGINT, INT, INT) IS 'Get the degree (number of connected words) for a kanji. Higher degree = more connectivity = better seed candidate.';

/* ================================================================
INITIALIZATION
================================================================ */

-- Note: The materialized view will be empty until refresh_kanji_adjacency_map() is called
-- This should be called after graph relationships are built (item_relations populated)
-- The import client will call this automatically after buildGraphRelationships()
--
-- To manually refresh the view:
-- SELECT refresh_kanji_adjacency_map();

-- Multi-Kanji Compound Generation and Item Relations Wiring
-- Functions to generate multi-kanji compounds and create their relationships

/* ================================================================
MULTI-KANJI COMPOUND GENERATION
================================================================ */

-- Generate multi-kanji compounds from existing kanji
-- Only creates compounds with 2-4 kanji characters
CREATE OR REPLACE FUNCTION generate_multi_kanji_compounds()
RETURNS TABLE(
    compounds_created INT,
    total_compounds INT
) AS $$
DECLARE
    v_created INT := 0;
    v_total INT := 0;
BEGIN
    WITH kanji_list AS (
        SELECT
            id,
            "character",
            jlpt,
            ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM kanji
        WHERE "character" ~ '[\u4E00-\u9FFF]'
          AND "character" IS NOT NULL
    ),
    kanji_stats AS (
        SELECT COUNT(*) AS total_kanji FROM kanji_list
    ),
    sample_requests AS (
        SELECT
            gs AS sample_id,
            CASE (gs % 3)
                WHEN 1 THEN 2
                WHEN 2 THEN 3
                ELSE 4
            END AS compound_length
        FROM generate_series(1, 1000) gs
    ),
    expanded_samples AS (
        SELECT
            sr.sample_id,
            sr.compound_length,
            pos,
            ((sr.sample_id * 37 + pos * 11) % GREATEST(ks.total_kanji, 1)) + 1 AS target_rn
        FROM sample_requests sr
        CROSS JOIN kanji_stats ks
        CROSS JOIN LATERAL generate_series(1, sr.compound_length) AS pos
    ),
    sample_characters AS (
        SELECT
            es.sample_id,
            es.pos,
            kl."character",
            kl.jlpt
        FROM expanded_samples es
        JOIN kanji_list kl ON kl.rn = es.target_rn
    ),
    candidate_compounds AS (
        SELECT
            sc.sample_id,
            array_agg(sc."character" ORDER BY sc.pos) AS chars,
            COALESCE(MIN(sc.jlpt) FILTER (WHERE sc.jlpt IS NOT NULL), 0) AS jlpt_level
        FROM sample_characters sc
        GROUP BY sc.sample_id
    ),
    formatted_compounds AS (
        SELECT
            array_to_string(chars, '') AS kanji,
            array_to_string(chars, 'の') AS kana,
            'compound: ' || array_to_string(chars, ' + ') AS english,
            jlpt_level
        FROM candidate_compounds
    ),
    new_compounds AS (
        SELECT fc.*
        FROM formatted_compounds fc
        LEFT JOIN words w ON w.kanji = fc.kanji
        WHERE w.id IS NULL
    )
    INSERT INTO words (kanji, kana, english, part_of_speech, jlpt)
    SELECT kanji, kana, english, 'expression'::pos_enum, jlpt_level
    FROM new_compounds
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_created = ROW_COUNT;

    SELECT COUNT(*) INTO v_total
    FROM words
    WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$';

    RAISE NOTICE 'Generated % multi-kanji compounds, Total %', v_created, v_total;
    RETURN QUERY SELECT v_created, v_total;
END;
$$ LANGUAGE plpgsql;

/* ================================================================
WORD-KANJI RELATIONS WIRING
================================================================ */

-- Wire item_relations for multi-kanji words only (2-4 kanji)
-- Creates one relation per constituent kanji with position tracking
CREATE OR REPLACE FUNCTION wire_word_kanji_relations()
RETURNS TABLE(
    relations_created INT,
    total_relations INT
) AS $$
DECLARE
    v_created INT := 0;
    v_total INT := 0;
BEGIN
    -- Create item_relations entries for words with 2-4 kanji
    WITH word_kanji_positions AS (
        SELECT
            w.id as word_id,
            k.id as kanji_id,
            ROW_NUMBER() OVER (PARTITION BY w.id ORDER BY pos) as position
        FROM words w
        CROSS JOIN LATERAL (
            SELECT 
                substring(w.kanji FROM pos FOR 1) as char,
                pos
            FROM generate_series(1, length(w.kanji)) as pos
            WHERE substring(w.kanji FROM pos FOR 1) ~ '[\u4E00-\u9FFF]'
        ) chars
        JOIN kanji k ON k."character" = chars.char
        WHERE w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'  -- Only 2-4 kanji words
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 
        'word'::TEXT,
        word_id,
        'USES_KANJI'::relation_enum,
        'kanji'::TEXT,
        kanji_id,
        position
    FROM word_kanji_positions
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_created = ROW_COUNT;

    -- Count total relations for multi-kanji words
    SELECT COUNT(*) INTO v_total
    FROM item_relations
    WHERE rel_type = 'USES_KANJI'::relation_enum
      AND from_type = 'word'
      AND EXISTS (
        SELECT 1 FROM words w
        WHERE w.id = item_relations.from_id
          AND w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
      );

    RAISE NOTICE 'Created % word-kanji relations, Total % for multi-kanji words', v_created, v_total;
    RETURN QUERY SELECT v_created, v_total;
END;
$$ LANGUAGE plpgsql;

/* ================================================================
VERIFICATION HELPER
================================================================ */

-- Verify that all multi-kanji words have complete relation sets
CREATE OR REPLACE FUNCTION verify_word_kanji_relations()
RETURNS TABLE(
    total_multi_kanji_words INT,
    words_with_relations INT,
    words_without_relations INT,
    sample_verified_word TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH multi_kanji_words AS (
        SELECT id, kanji, char_length(kanji) AS expected_relations
        FROM words
        WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
    ),
    relation_counts AS (
        SELECT
            ir.from_id AS word_id,
            COUNT(*) AS relation_count
        FROM item_relations ir
        WHERE ir.from_type = 'word'
          AND ir.rel_type = 'USES_KANJI'
        GROUP BY ir.from_id
    ),
    summary AS (
        SELECT
            COUNT(*) AS total_words,
            COUNT(*) FILTER (
                WHERE COALESCE(rc.relation_count, 0) = mw.expected_relations
            ) AS complete_words,
            COUNT(*) FILTER (
                WHERE COALESCE(rc.relation_count, 0) <> mw.expected_relations
            ) AS incomplete_words
        FROM multi_kanji_words mw
        LEFT JOIN relation_counts rc ON rc.word_id = mw.id
    ),
    sample_word AS (
        SELECT mw.kanji
        FROM multi_kanji_words mw
        JOIN relation_counts rc ON rc.word_id = mw.id
        WHERE rc.relation_count = mw.expected_relations
        LIMIT 1
    )
    SELECT
        COALESCE((SELECT total_words FROM summary), 0)::INT,
        COALESCE((SELECT complete_words FROM summary), 0)::INT,
        COALESCE((SELECT incomplete_words FROM summary), 0)::INT,
        (SELECT kanji FROM sample_word LIMIT 1)::TEXT;
END;
$$ LANGUAGE plpgsql;


-- JLPT Questions Import System
-- Functions for importing JLPT exam questions from JSON data

/* ================================================================
JLPT QUESTIONS IMPORT SYSTEM
================================================================ */

-- Function to clean HTML content and extract plain text
CREATE OR REPLACE FUNCTION clean_html_content(html_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF html_text IS NULL OR html_text = '' THEN
        RETURN NULL;
    END IF;

    -- Remove HTML tags and decode common entities
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(html_text, '<[^>]*>', '', 'g'),
            '&nbsp;', ' ', 'g'
        ),
        '&[a-zA-Z0-9#]+;', '', 'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine question type enum from kind string
CREATE OR REPLACE FUNCTION get_grammar_question_type(kind TEXT)
RETURNS grammar_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'grammar_choice' THEN RETURN 'grammar_choice'::grammar_question_type_enum;
        WHEN 'passage_grammar' THEN RETURN 'passage_grammar'::grammar_question_type_enum;
        WHEN 'sentence_composition' THEN RETURN 'sentence_composition'::grammar_question_type_enum;
        ELSE RETURN 'grammar_choice'::grammar_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_listening_question_type(kind TEXT)
RETURNS listening_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'listening_comprehensive' THEN RETURN 'listening_comprehensive'::listening_question_type_enum;
        WHEN 'listening_expressions' THEN RETURN 'listening_expressions'::listening_question_type_enum;
        WHEN 'listening_main_points' THEN RETURN 'listening_main_points'::listening_question_type_enum;
        WHEN 'listening_overview' THEN RETURN 'listening_overview'::listening_question_type_enum;
        WHEN 'listening_topic' THEN RETURN 'listening_topic'::listening_question_type_enum;
        WHEN 'quick_response' THEN RETURN 'quick_response'::listening_question_type_enum;
        ELSE RETURN 'listening_comprehensive'::listening_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_reading_question_type(kind TEXT)
RETURNS reading_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'information_search' THEN RETURN 'information_search'::reading_question_type_enum;
        WHEN 'long_passage' THEN RETURN 'long_passage'::reading_question_type_enum;
        WHEN 'medium_passage' THEN RETURN 'medium_passage'::reading_question_type_enum;
        WHEN 'reading_comprehensive' THEN RETURN 'reading_comprehensive'::reading_question_type_enum;
        WHEN 'reading_topic' THEN RETURN 'reading_topic'::reading_question_type_enum;
        WHEN 'short_passage' THEN RETURN 'short_passage'::reading_question_type_enum;
        ELSE RETURN 'reading_comprehensive'::reading_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_word_question_type(kind TEXT)
RETURNS word_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'context_fill_in' THEN RETURN 'context_fill_in'::word_question_type_enum;
        WHEN 'expression_change' THEN RETURN 'expression_change'::word_question_type_enum;
        WHEN 'grammar_choice' THEN RETURN 'grammar_choice'::word_question_type_enum;
        WHEN 'kanji_reading' THEN RETURN 'kanji_reading'::word_question_type_enum;
        WHEN 'passage_grammar' THEN RETURN 'passage_grammar'::word_question_type_enum;
        WHEN 'sentence_composition' THEN RETURN 'sentence_composition'::word_question_type_enum;
        WHEN 'word_application' THEN RETURN 'word_application'::word_question_type_enum;
        WHEN 'word_formation' THEN RETURN 'word_formation'::word_question_type_enum;
        WHEN 'word_writing' THEN RETURN 'word_writing'::word_question_type_enum;
        ELSE RETURN 'context_fill_in'::word_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main function to import JLPT questions from JSON data
CREATE OR REPLACE FUNCTION import_jlpt_questions(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    question_data JSONB;
    base_question_id BIGINT;
    content_item JSONB;
    tag_value TEXT;
    kind_value TEXT;
BEGIN
    -- Validate input
    IF json_data IS NULL OR NOT json_data ? 'Questions' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected Questions array';
    END IF;

    -- Process each question in the Questions array
    FOR question_data IN SELECT jsonb_array_elements(json_data -> 'Questions')
    LOOP
        BEGIN
            tag_value := safe_jsonb_extract_text(question_data, 'tag');
            kind_value := safe_jsonb_extract_text(question_data, 'kind');

            -- Insert base question
            INSERT INTO jlpt_questions (
                original_id, title, title_trans, level, level_of_difficult,
                tag, score, kind, correct_answers, check_explain,
                created_at, updated_at, raw_data
            ) VALUES (
                safe_jsonb_extract_int(question_data, 'id'),
                -- Handle empty titles by providing a default based on question type
                COALESCE(
                    NULLIF(safe_jsonb_extract_text(question_data, 'title'), ''),
                    CASE tag_value
                        WHEN 'listen' THEN COALESCE(
                            NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                            'Listening Question'
                        )
                        WHEN 'read' THEN COALESCE(
                            NULLIF(safe_jsonb_extract_text(question_data -> 'content' -> 0, 'question'), ''),
                            'Reading Question'
                        )
                        WHEN 'grammar' THEN 'Grammar Question'
                        WHEN 'word' THEN 'Vocabulary Question'
                        ELSE 'JLPT Question'
                    END
                ),
                safe_jsonb_extract_text(question_data, 'title_trans'),
                safe_jsonb_extract_int(question_data, 'level'),
                safe_jsonb_extract_int(question_data, 'level_of_difficult'),
                tag_value,
                safe_jsonb_extract_int(question_data, 'score'),
                kind_value,
                CASE
                    WHEN question_data ? 'correct_answers' THEN
                        ARRAY(SELECT jsonb_array_elements_text(question_data -> 'correct_answers'))::INT[]
                    ELSE NULL
                END,
                safe_jsonb_extract_int(question_data, 'check_explain'),
                CASE
                    WHEN safe_jsonb_extract_text(question_data, 'created_at') IS NOT NULL
                    THEN safe_jsonb_extract_text(question_data, 'created_at')::TIMESTAMPTZ
                    ELSE NULL
                END,
                CASE
                    WHEN safe_jsonb_extract_text(question_data, 'updated_at') IS NOT NULL
                    THEN safe_jsonb_extract_text(question_data, 'updated_at')::TIMESTAMPTZ
                    ELSE NULL
                END,
                question_data
            )
            ON CONFLICT (original_id) DO UPDATE SET
                title = EXCLUDED.title,
                title_trans = EXCLUDED.title_trans,
                level = EXCLUDED.level,
                level_of_difficult = EXCLUDED.level_of_difficult,
                tag = EXCLUDED.tag,
                score = EXCLUDED.score,
                kind = EXCLUDED.kind,
                correct_answers = EXCLUDED.correct_answers,
                check_explain = EXCLUDED.check_explain,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                raw_data = EXCLUDED.raw_data
            RETURNING id INTO base_question_id;

            -- Get the question ID if it was an update
            IF base_question_id IS NULL THEN
                SELECT id INTO base_question_id
                FROM jlpt_questions
                WHERE original_id = safe_jsonb_extract_int(question_data, 'id');
            END IF;

            -- Process content array and insert type-specific data
            IF question_data ? 'content' AND jsonb_array_length(question_data -> 'content') > 0 THEN
                content_item := question_data -> 'content' -> 0; -- Take first content item

                -- Insert type-specific question data based on tag
                CASE tag_value
                    WHEN 'grammar' THEN
                        INSERT INTO jlpt_grammar_questions (
                            question_id, question_type, question_html, question_text,
                            image_url, answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_grammar_question_type(kind_value),
                            safe_jsonb_extract_text(content_item, 'question'),
                            clean_html_content(safe_jsonb_extract_text(content_item, 'question')),
                            safe_jsonb_extract_text(content_item, 'image'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );

                    WHEN 'listen' THEN
                        INSERT INTO jlpt_listening_questions (
                            question_id, question_type, question_html, question_text,
                            audio_url, audio_duration, image_url, transcript,
                            answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_listening_question_type(kind_value),
                            -- For listening questions, extract question from general.text_read_en
                            COALESCE(
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                                'Listening Question'
                            ),
                            -- Clean HTML from text_read_en
                            clean_html_content(COALESCE(
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                                'Listening Question'
                            )),
                            safe_jsonb_extract_text(question_data -> 'general', 'audio'),
                            -- Extract audio_time using nested decimal function for better error handling
                            safe_jsonb_extract_nested_decimal(question_data, ARRAY['general', 'audios', 'audio_time']),
                            safe_jsonb_extract_text(content_item, 'image'),
                            safe_jsonb_extract_text(question_data -> 'general', 'txt_read'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );

                    WHEN 'read' THEN
                        INSERT INTO jlpt_reading_questions (
                            question_id, question_type, question_html, question_text,
                            passage, image_url, answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_reading_question_type(kind_value),
                            -- Reading questions have the actual question in content[0].question
                            COALESCE(
                                NULLIF(safe_jsonb_extract_text(content_item, 'question'), ''),
                                'Reading Question'
                            ),
                            clean_html_content(COALESCE(
                                NULLIF(safe_jsonb_extract_text(content_item, 'question'), ''),
                                'Reading Question'
                            )),
                            -- The reading passage is in general.text_read_en (fallback to txt_read)
                            COALESCE(
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'txt_read'), ''),
                                'Reading Passage'
                            ),
                            safe_jsonb_extract_text(content_item, 'image'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );

                    WHEN 'word' THEN
                        INSERT INTO jlpt_word_questions (
                            question_id, question_type, question_html, question_text,
                            image_url, answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_word_question_type(kind_value),
                            safe_jsonb_extract_text(content_item, 'question'),
                            clean_html_content(safe_jsonb_extract_text(content_item, 'question')),
                            safe_jsonb_extract_text(content_item, 'image'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );
                END CASE;

                -- Insert multilingual text data
                PERFORM insert_question_multilingual_texts(base_question_id, question_data);
            END IF;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing JLPT question ID % (tag: %, kind: %): %',
                    safe_jsonb_extract_int(question_data, 'id'),
                    safe_jsonb_extract_text(question_data, 'tag'),
                    safe_jsonb_extract_text(question_data, 'kind'),
                    SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to insert multilingual text data
CREATE OR REPLACE FUNCTION insert_question_multilingual_texts(question_id BIGINT, question_data JSONB)
RETURNS VOID AS $$
DECLARE
    lang_codes TEXT[] := ARRAY['vn', 'en', 'cn', 'tw', 'es', 'ru', 'fr', 'id', 'ko', 'my', 'pt', 'de', 'th'];
    lang_code TEXT;
    text_content TEXT;
BEGIN
    -- Insert general reading passage translations
    FOREACH lang_code IN ARRAY lang_codes
    LOOP
        text_content := safe_jsonb_extract_text(question_data -> 'general', 'text_read_' || lang_code);
        IF text_content IS NOT NULL AND text_content != '' THEN
            INSERT INTO jlpt_question_texts (question_id, language_code, text_type, content)
            VALUES (question_id, lang_code, 'reading_passage', text_content);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Efficient batch import function for JLPT questions from file
CREATE OR REPLACE FUNCTION import_jlpt_questions_from_file(file_path TEXT)
RETURNS INTEGER AS $$
DECLARE
    json_content JSONB;
    result INTEGER;
BEGIN
    -- This function would be called from the shell script with proper file handling
    -- For now, it's a placeholder that expects the JSON to be loaded externally
    RAISE NOTICE 'Processing JLPT questions from file: %', file_path;

    -- The actual file reading would be done by the shell script using jq
    -- and the data would be passed to import_jlpt_questions function

    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get question statistics
CREATE OR REPLACE FUNCTION get_jlpt_import_stats()
RETURNS TABLE(
    question_type TEXT,
    total_questions BIGINT,
    by_level JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'Total Questions'::TEXT,
        COUNT(*),
        jsonb_object_agg(level::TEXT, level_count)
    FROM (
        SELECT level, COUNT(*) as level_count
        FROM jlpt_questions
        GROUP BY level
    ) level_stats;

    RETURN QUERY
    SELECT
        'Grammar Questions'::TEXT,
        COUNT(*),
        jsonb_object_agg(q.level::TEXT, level_count)
    FROM (
        SELECT q.level, COUNT(*) as level_count
        FROM jlpt_questions q
        JOIN jlpt_grammar_questions gq ON q.id = gq.question_id
        GROUP BY q.level
    ) level_stats, jlpt_questions q
    JOIN jlpt_grammar_questions gq ON q.id = gq.question_id;

    -- Similar queries for other question types...
END;
$$ LANGUAGE plpgsql;

-- Add comments for the JLPT import functions
COMMENT ON FUNCTION clean_html_content (TEXT) IS 'Remove HTML tags and decode entities from question content';

COMMENT ON FUNCTION get_grammar_question_type (TEXT) IS 'Convert grammar question kind string to enum';

COMMENT ON FUNCTION get_listening_question_type (TEXT) IS 'Convert listening question kind string to enum';

COMMENT ON FUNCTION get_reading_question_type (TEXT) IS 'Convert reading question kind string to enum';

COMMENT ON FUNCTION get_word_question_type (TEXT) IS 'Convert word question kind string to enum';

COMMENT ON FUNCTION import_jlpt_questions (JSONB) IS 'Import JLPT questions from JSON data with type-specific handling';

COMMENT ON FUNCTION insert_question_multilingual_texts (BIGINT, JSONB) IS 'Insert multilingual text data for JLPT questions';

COMMENT ON FUNCTION import_jlpt_questions_from_file (TEXT) IS 'Batch import JLPT questions from file (placeholder)';

COMMENT ON FUNCTION get_jlpt_import_stats () IS 'Get statistics about imported JLPT questions';

-- Graph Relationship System Functions
-- Functions to build and maintain kanji-word-grammar relationship graph

/* ================================================================
GRAPH RELATIONSHIP BUILDING FUNCTIONS
================================================================ */

-- Function to create kanji-word relationships (multi-kanji words only)
-- Only creates relations for words with 2-4 kanji characters
CREATE OR REPLACE FUNCTION build_kanji_word_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create USES_KANJI relationships for multi-kanji words only
    -- Skip single-kanji words as they're not needed for the use case
    WITH kanji_word_pairs AS (
        SELECT DISTINCT w.id as word_id, k.id as kanji_id
        FROM words w
        JOIN kanji k ON w.kanji LIKE '%' || k."character" || '%'
        WHERE w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'  -- Only 2-4 kanji words
          AND k."character" IS NOT NULL
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'word'::TEXT, word_id, 'USES_KANJI'::relation_enum, 'kanji'::TEXT, kanji_id, 0
    FROM kanji_word_pairs
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'USES_KANJI'::relation_enum;

    RAISE NOTICE 'Kanji-word relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to create word-word relationships (synonyms, related words)
-- This analyzes part of speech and JLPT level for relationship detection
CREATE OR REPLACE FUNCTION build_word_word_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create SIMILAR_TO relationships between words with same part of speech and JLPT level
    WITH similar_words AS (
        SELECT DISTINCT
            w1.id as word1_id,
            w2.id as word2_id
        FROM words w1
        JOIN words w2 ON w1.part_of_speech = w2.part_of_speech
            AND w1.jlpt = w2.jlpt
            AND w1.id < w2.id  -- Prevent duplicates
        WHERE w1.part_of_speech != 'unclassified'::pos_enum
          AND w1.jlpt > 0
          AND w2.jlpt > 0
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'word'::TEXT, word1_id, 'SIMILAR_TO'::relation_enum, 'word'::TEXT, word2_id, 0
    FROM similar_words
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'SIMILAR_TO'::relation_enum;

    RAISE NOTICE 'Word-word relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to create kanji-kanji relationships (shared components)
CREATE OR REPLACE FUNCTION build_kanji_kanji_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create SIMILAR_TO relationships between kanji with shared components
    -- Extract components from the 'components' field and match kanji
    WITH component_matches AS (
        SELECT DISTINCT
            k1.id as kanji1_id,
            k2.id as kanji2_id
        FROM kanji k1
        JOIN kanji k2 ON k1.components IS NOT NULL
            AND k2."character" IS NOT NULL
            AND k1.components LIKE '%' || k2."character" || '%'
            AND k1.id < k2.id  -- Prevent duplicates
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'kanji'::TEXT, kanji1_id, 'SIMILAR_TO'::relation_enum, 'kanji'::TEXT, kanji2_id, 0
    FROM component_matches
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'SIMILAR_TO'::relation_enum
      AND from_type = 'kanji'::TEXT AND to_type = 'kanji'::TEXT;

    RAISE NOTICE 'Kanji-kanji relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to create word-grammar relationships
CREATE OR REPLACE FUNCTION build_word_grammar_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create APPEARS_IN relationships: word -> grammar (word demonstrates this grammar pattern)
    -- This is based on JLPT level alignment
    WITH word_grammar_pairs AS (
        SELECT DISTINCT
            w.id as word_id,
            gp.id as grammar_id
        FROM words w
        JOIN grammar_points gp ON w.jlpt = CASE gp.level
            WHEN 'N1' THEN 1
            WHEN 'N2' THEN 2
            WHEN 'N3' THEN 3
            WHEN 'N4' THEN 4
            WHEN 'N5' THEN 5
            ELSE 0
        END
        WHERE w.jlpt > 0
          AND gp.level IS NOT NULL
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'word'::TEXT, word_id, 'APPEARS_IN'::relation_enum, 'grammar'::TEXT, grammar_id, 0
    FROM word_grammar_pairs
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'APPEARS_IN'::relation_enum;

    RAISE NOTICE 'Word-grammar relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to build all graph relationships
CREATE OR REPLACE FUNCTION build_complete_graph()
RETURNS TABLE(
    stage TEXT,
    relations_created INT,
    total_relationships INT
) AS $$
DECLARE
    v_created INT;
    v_total INT;
BEGIN
    RAISE NOTICE 'Starting complete graph relationship build...';

    -- Clear existing relationships (optional - comment out if you want to preserve)
    -- TRUNCATE item_relations;

    -- Stage 1: Kanji-Word relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_kanji_word_relations() AS r;
    RETURN QUERY SELECT 'KANJI_WORD'::TEXT, v_created, v_total;

    -- Stage 2: Word-Word relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_word_word_relations() AS r;
    RETURN QUERY SELECT 'WORD_WORD'::TEXT, v_created, v_total;

    -- Stage 3: Kanji-Kanji relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_kanji_kanji_relations() AS r;
    RETURN QUERY SELECT 'KANJI_KANJI'::TEXT, v_created, v_total;

    -- Stage 4: Word-Grammar relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_word_grammar_relations() AS r;
    RETURN QUERY SELECT 'WORD_GRAMMAR'::TEXT, v_created, v_total;

    RAISE NOTICE 'Graph relationship build completed!';
END;
$$ LANGUAGE plpgsql;

-- Function to get graph statistics
CREATE OR REPLACE FUNCTION get_graph_statistics()
RETURNS TABLE(
    relation_type TEXT,
    count BIGINT,
    from_type_breakdown TEXT,
    to_type_breakdown TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rel_type::TEXT,
        COUNT(*),
        string_agg(from_breakdown, ', ' ORDER BY from_breakdown),
        string_agg(to_breakdown, ', ' ORDER BY to_breakdown)
    FROM (
        SELECT
            rel_type,
            from_type || '(' || from_count::TEXT || ')' as from_breakdown,
            to_type || '(' || to_count::TEXT || ')' as to_breakdown,
            from_type,
            to_type
        FROM (
            SELECT
                rel_type,
                from_type,
                COUNT(DISTINCT from_id) as from_count,
                to_type,
                COUNT(DISTINCT to_id) as to_count
            FROM item_relations
            GROUP BY rel_type, from_type, to_type
        ) stats
    ) formatted
    GROUP BY rel_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get kanji-word relationships for a specific kanji
CREATE OR REPLACE FUNCTION get_kanji_words(kanji_char TEXT)
RETURNS TABLE(
    word_id INT,
    word TEXT,
    kana TEXT,
    english TEXT,
    jlpt INT,
    part_of_speech TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.kanji,
        w.kana,
        w.english,
        w.jlpt,
        w.part_of_speech::TEXT
    FROM item_relations ir
    JOIN kanji k ON ir.to_id = k.id AND ir.to_type = 'kanji'
    JOIN words w ON ir.from_id = w.id AND ir.from_type = 'word'
    WHERE k."character" = kanji_char
      AND ir.rel_type = 'USES_KANJI'::relation_enum
    ORDER BY w.jlpt, w.english;
END;
$$ LANGUAGE plpgsql;

-- Function to get related words
CREATE OR REPLACE FUNCTION get_related_words(word_id_param INT)
RETURNS TABLE(
    related_word_id INT,
    word TEXT,
    english TEXT,
    part_of_speech TEXT,
    jlpt INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.kanji,
        w.english,
        w.part_of_speech::TEXT,
        w.jlpt
    FROM item_relations ir
    JOIN words w ON ir.to_id = w.id AND ir.to_type = 'word'
    WHERE ir.from_id = word_id_param
      AND ir.from_type = 'word'
      AND ir.rel_type = 'SIMILAR_TO'::relation_enum
    ORDER BY w.jlpt, w.english;
END;
$$ LANGUAGE plpgsql;

-- Function to get words using specific kanji combination
CREATE OR REPLACE FUNCTION get_words_with_kanji(kanji_list TEXT[])
RETURNS TABLE(
    word_id INT,
    word TEXT,
    english TEXT,
    jlpt INT,
    kanji_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.kanji,
        w.english,
        w.jlpt,
        array_length(kanji_list, 1) as kanji_count
    FROM words w
    WHERE CASE WHEN array_length(kanji_list, 1) > 0 THEN
        EXISTS (
            SELECT 1 FROM item_relations ir
            JOIN kanji k ON ir.to_id = k.id
            WHERE ir.from_id = w.id
              AND ir.from_type = 'word'
              AND ir.rel_type = 'USES_KANJI'::relation_enum
              AND k."character" = ANY(kanji_list)
        )
    ELSE TRUE END
    ORDER BY w.jlpt, w.english;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION build_kanji_word_relations () IS 'Create USES_KANJI relationships between words and kanji they contain';

COMMENT ON FUNCTION build_word_word_relations () IS 'Create SIMILAR_TO relationships between words with same POS and JLPT level';

COMMENT ON FUNCTION build_kanji_kanji_relations () IS 'Create SIMILAR_TO relationships between kanji with shared components';

COMMENT ON FUNCTION build_word_grammar_relations () IS 'Create APPEARS_IN relationships between words and grammar patterns';

COMMENT ON FUNCTION build_complete_graph () IS 'Build all graph relationships in correct order';

COMMENT ON FUNCTION get_graph_statistics () IS 'Get statistics about graph relationships';

COMMENT ON FUNCTION get_kanji_words (TEXT) IS 'Get all words containing a specific kanji';

COMMENT ON FUNCTION get_related_words (INT) IS 'Get words similar to a given word';

COMMENT ON FUNCTION get_words_with_kanji (TEXT []) IS 'Get words containing any of the specified kanji';


-- Course Import Functions
-- Functions for importing courses, units, and their relationships

/* ================================================================
COURSE IMPORT FUNCTIONS
================================================================ */

-- Import book sets (courses) from JSON
CREATE OR REPLACE FUNCTION import_book_sets(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each book set record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO courses (
                id, name, description, level, total_words, version
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'id'),
                safe_jsonb_extract_text(record_data, 'name'),
                'Book set: ' || safe_jsonb_extract_text(record_data, 'name') || ' (Level ' || safe_jsonb_extract_text(record_data, 'level') || ')',
                safe_jsonb_extract_text(record_data, 'level'),
                safe_jsonb_extract_int(record_data, 'total_word'),
                safe_jsonb_extract_int(record_data, 'version')
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                level = EXCLUDED.level,
                total_words = EXCLUDED.total_words,
                version = EXCLUDED.version;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing book set ID %: %',
                    safe_jsonb_extract_int(record_data, 'id'), SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import units from JSON
CREATE OR REPLACE FUNCTION import_units(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each unit record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO units (
                id, course_id, path, title, description, total_words
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'id'),
                safe_jsonb_extract_int(record_data, 'book_set_id'),
                safe_jsonb_extract_int(record_data, 'id')::text::ltree,
                safe_jsonb_extract_text(record_data, 'name'),
                'Unit: ' || safe_jsonb_extract_text(record_data, 'name'),
                safe_jsonb_extract_int(record_data, 'total_word')
            )
            ON CONFLICT (id) DO UPDATE SET
                course_id = EXCLUDED.course_id,
                path = EXCLUDED.path,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                total_words = EXCLUDED.total_words;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing unit ID %: %',
                    safe_jsonb_extract_int(record_data, 'id'), SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import unit-word relationships from JSON
CREATE OR REPLACE FUNCTION import_unit_word_relations(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;

    -- Process each relationship record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO unit_items (
                unit_id, item_type, item_id, position
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'unit_id'),
                'word'::unit_item_enum,
                safe_jsonb_extract_int(record_data, 'word_id'),
                safe_jsonb_extract_int(record_data, 'id')
            )
            ON CONFLICT (unit_id, item_type, item_id) DO UPDATE SET
                position = EXCLUDED.position;

            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing unit-word relation (unit: %, word: %): %',
                    safe_jsonb_extract_int(record_data, 'unit_id'),
                    safe_jsonb_extract_int(record_data, 'word_id'),
                    SQLERRM;
        END;
    END LOOP;

    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the course import functions
COMMENT ON FUNCTION import_book_sets (JSONB) IS 'Import book sets courses from cleaned JSON data';

COMMENT ON FUNCTION import_units (JSONB) IS 'Import units from cleaned JSON data with hierarchical paths';

COMMENT ON FUNCTION import_unit_word_relations (JSONB) IS 'Import unit word relationships from cleaned JSON data';

-- Text Processing Functions for Japanese Language Support
-- Functions for converting and detecting Japanese text types

/* ================================================================
TEXT PROCESSING FUNCTIONS
================================================================ */

-- Function to convert katakana to hiragana
CREATE OR REPLACE FUNCTION katakana_to_hiragana(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    i INTEGER := 1;
    char_code INTEGER;
    new_char TEXT;
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    WHILE i <= length(input_text) LOOP
        char_code := ascii(substring(input_text, i, 1));
        -- Katakana range: 0x30A1 to 0x30F6
        IF char_code >= 12449 AND char_code <= 12534 THEN
            new_char := chr(char_code - 96);
        ELSE
            new_char := substring(input_text, i, 1);
        END IF;
        result := result || new_char;
        i := i + 1;
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if text is katakana
CREATE OR REPLACE FUNCTION is_katakana(input_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    i INTEGER := 1;
    char_code INTEGER;
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN FALSE;
    END IF;

    WHILE i <= length(input_text) LOOP
        char_code := ascii(substring(input_text, i, 1));
        -- Katakana range: 0x30A1 to 0x30F6, plus some punctuation
        IF NOT (char_code >= 12449 AND char_code <= 12534 OR char_code IN (12539, 12540, 12541)) THEN
            RETURN FALSE;
        END IF;
        i := i + 1;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if text is hiragana
CREATE OR REPLACE FUNCTION is_hiragana(input_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    i INTEGER := 1;
    char_code INTEGER;
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN FALSE;
    END IF;

    WHILE i <= length(input_text) LOOP
        char_code := ascii(substring(input_text, i, 1));
        -- Hiragana range: 0x3041 to 0x3096
        IF NOT (char_code >= 12353 AND char_code <= 12438 OR char_code IN (12443, 12444)) THEN
            RETURN FALSE;
        END IF;
        i := i + 1;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if text contains kanji
CREATE OR REPLACE FUNCTION contains_kanji(input_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    i INTEGER := 1;
    char_code INTEGER;
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN FALSE;
    END IF;

    WHILE i <= length(input_text) LOOP
        char_code := ascii(substring(input_text, i, 1));
        -- Kanji range: 0x4E00 to 0x9FFF
        IF char_code >= 19968 AND char_code <= 40959 THEN
            RETURN TRUE;
        END IF;
        i := i + 1;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to convert hiragana to romaji (assuming this exists elsewhere)
-- Note: This function is referenced but not defined in the original file
-- It should be imported from hiragana_to_romaji.sql

-- Add comments for the text processing functions
COMMENT ON FUNCTION katakana_to_hiragana (TEXT) IS 'Convert katakana characters to hiragana equivalents';

COMMENT ON FUNCTION is_katakana (TEXT) IS 'Check if input text consists entirely of katakana characters';

COMMENT ON FUNCTION is_hiragana (TEXT) IS 'Check if input text consists entirely of hiragana characters';

COMMENT ON FUNCTION contains_kanji (TEXT) IS 'Check if input text contains any kanji characters';

-- Validation Functions for Data Import
-- Functions to validate and convert JLPT levels and parts of speech

/* ================================================================
VALIDATION FUNCTIONS
================================================================ */

-- Validate JLPT level and convert to integer (0-5, where 0 = no level)
CREATE OR REPLACE FUNCTION validate_jlpt_level(level_text TEXT)
RETURNS INTEGER AS $$
BEGIN
    IF level_text IS NULL OR level_text = '' THEN
        RETURN NULL; -- Will be converted to 0 by COALESCE in import function
    END IF;

    -- Handle N1-N5 format
    CASE upper(trim(level_text))
        WHEN 'N1' THEN RETURN 1;
        WHEN 'N2' THEN RETURN 2;
        WHEN 'N3' THEN RETURN 3;
        WHEN 'N4' THEN RETURN 4;
        WHEN 'N5' THEN RETURN 5;
        -- Handle numeric format
        WHEN '0' THEN RETURN 0; -- No level
        WHEN '1' THEN RETURN 1;
        WHEN '2' THEN RETURN 2;
        WHEN '3' THEN RETURN 3;
        WHEN '4' THEN RETURN 4;
        WHEN '5' THEN RETURN 5;
        ELSE
            RAISE WARNING 'Invalid JLPT level: %, defaulting to 0 (no level)', level_text;
            RETURN 0; -- Default to 0 for unknown levels
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JLPT level extraction for kanji (handles level 0)
CREATE OR REPLACE FUNCTION safe_jsonb_extract_jlpt_level(json_data JSONB, key TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract and validate JLPT level
    DECLARE
        text_value TEXT := json_data ->> key;
        result INTEGER;
    BEGIN
        -- Handle empty or null string values
        IF text_value IS NULL OR text_value = '' THEN
            RETURN NULL;
        END IF;

        -- Convert to integer
        result := text_value::INTEGER;

        -- For kanji, level 0 means "not in JLPT" - set to NULL
        IF result = 0 THEN
            RETURN NULL;
        END IF;

        -- Validate range for JLPT levels
        IF result >= 1 AND result <= 5 THEN
            RETURN result;
        ELSE
            RAISE WARNING 'Invalid JLPT level: % (must be 1-5)', result;
            RETURN NULL;
        END IF;
    END;
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE WARNING 'Invalid JLPT level value for key "%": %', key, json_data ->> key;
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting JLPT level key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Validate and convert part of speech to enum
CREATE OR REPLACE FUNCTION validate_part_of_speech(pos_array JSONB)
RETURNS pos_enum AS $$
BEGIN
    -- Handle null, missing or non-array values
    IF pos_array IS NULL OR pos_array = 'null'::jsonb OR jsonb_typeof(pos_array) != 'array' THEN
        RETURN 'unclassified'::pos_enum; -- Use unclassified for null/non-array values
    END IF;

    -- Handle empty arrays
    IF jsonb_array_length(pos_array) = 0 THEN
        RETURN 'unclassified'::pos_enum; -- Use unclassified for empty arrays
    END IF;

    -- Get first part of speech from array
    DECLARE
        first_pos TEXT := pos_array ->> 0;
    BEGIN
        -- Map common Japanese parts of speech to our enum
        CASE lower(trim(first_pos))
            WHEN 'noun', 'n', '名詞' THEN RETURN 'noun'::pos_enum;
            WHEN 'verb', 'v', '動詞', 'verb_godan', 'verb_ichidan', 'verb_suru', 'verb_special' THEN RETURN 'verb'::pos_enum;
            WHEN 'adjective', 'adj', 'i-adj', 'na-adj', '形容詞', 'i_adjective', 'na_adjective', 'no_adjective', 'pn_adjective', 'auxiliary_adjective' THEN RETURN 'adjective'::pos_enum;
            WHEN 'adverb', 'adv', '副詞', 'adverb_to' THEN RETURN 'adverb'::pos_enum;
            WHEN 'particle', 'part', '助詞' THEN RETURN 'particle'::pos_enum;
            WHEN 'conjunction', 'conj', '接続詞' THEN RETURN 'conjunction'::pos_enum;
            WHEN 'interjection', 'interj', '感動詞' THEN RETURN 'interjection'::pos_enum;
            WHEN 'auxiliary', 'aux', '助動詞', 'auxiliary_verb' THEN RETURN 'auxiliary'::pos_enum;
            WHEN 'prefix', 'pref', '接頭辞' THEN RETURN 'prefix'::pos_enum;
            WHEN 'suffix', 'suff', '接尾辞', 'noun_suffix' THEN RETURN 'suffix'::pos_enum;
            WHEN 'counter', 'count', '助数詞' THEN RETURN 'counter'::pos_enum;
            WHEN 'expression', 'exp', '表現' THEN RETURN 'expression'::pos_enum;
            WHEN 'unclassified' THEN RETURN 'unclassified'::pos_enum;
            ELSE
                RAISE WARNING 'Unknown part of speech: %, defaulting to unclassified', first_pos;
                RETURN 'unclassified'::pos_enum;
        END CASE;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments for validation functions
COMMENT ON FUNCTION validate_jlpt_level (TEXT) IS 'Validate and convert JLPT level string to integer (1-5)';

COMMENT ON FUNCTION safe_jsonb_extract_jlpt_level (JSONB, TEXT) IS 'Safely extract JLPT level for kanji with special handling for level 0';

COMMENT ON FUNCTION validate_part_of_speech (JSONB) IS 'Validate and convert part of speech array to enum value';

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

-- Comprehensive Import Functions
-- Complete import workflows and statistics functions

/* ================================================================
COMPREHENSIVE IMPORT FUNCTIONS
================================================================ */

-- Comprehensive kanji import function that handles both regular data and SVG strokes
CREATE OR REPLACE FUNCTION import_kanji_complete(json_data JSONB, svg_data JSONB DEFAULT NULL)
RETURNS TABLE(
    regular_imported INTEGER,
    svg_imported INTEGER,
    total_kanji INTEGER
) AS $$
DECLARE
    regular_count INTEGER := 0;
    svg_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    -- Import regular kanji data
    IF json_data IS NOT NULL THEN
        regular_count := import_kanji_data(json_data);
    END IF;

    -- Import SVG stroke data if provided
    IF svg_data IS NOT NULL THEN
        svg_count := import_kanji_svg_strokes(svg_data);
    END IF;

    -- Get total count of kanji with SVG data
    SELECT COUNT(*) INTO total_count
    FROM kanji
    WHERE strokes_svg IS NOT NULL AND strokes_svg != '';

    RETURN QUERY SELECT
        regular_count::INTEGER,
        svg_count::INTEGER,
        total_count::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to get SVG stroke import statistics
CREATE OR REPLACE FUNCTION get_svg_import_stats()
RETURNS TABLE(
    total_kanji INTEGER,
    kanji_with_svg INTEGER,
    kanji_without_svg INTEGER,
    svg_coverage_percent NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_kanji,
        COUNT(CASE WHEN strokes_svg IS NOT NULL AND strokes_svg != '' THEN 1 END)::INTEGER as kanji_with_svg,
        COUNT(CASE WHEN strokes_svg IS NULL OR strokes_svg = '' THEN 1 END)::INTEGER as kanji_without_svg,
        ROUND(
            (COUNT(CASE WHEN strokes_svg IS NOT NULL AND strokes_svg != '' THEN 1 END)::NUMERIC / COUNT(*)) * 100,
            2
        ) as svg_coverage_percent
    FROM kanji;
END;
$$ LANGUAGE plpgsql;

-- Function to validate SVG content and return validation results
CREATE OR REPLACE FUNCTION validate_kanji_svg_data()
RETURNS TABLE(
    kanji_id INTEGER,
    "character" TEXT,
    has_svg BOOLEAN,
    svg_length INTEGER,
    is_valid_svg BOOLEAN,
    validation_notes TEXT
) AS $$
DECLARE
    kanji_record RECORD;
    svg_content TEXT;
    is_valid BOOLEAN;
    notes TEXT;
BEGIN
    FOR kanji_record IN SELECT id, "character", strokes_svg FROM kanji ORDER BY id
    LOOP
        svg_content := kanji_record.strokes_svg;

        -- Check if SVG exists
        IF svg_content IS NULL OR svg_content = '' THEN
            is_valid := FALSE;
            notes := 'No SVG data';
        ELSE
            -- Basic SVG validation
            is_valid := (svg_content LIKE '%<svg%' AND svg_content LIKE '%</svg>%');

            IF is_valid THEN
                notes := 'Valid SVG content';
            ELSE
                notes := 'Invalid SVG format';
            END IF;
        END IF;

        RETURN QUERY SELECT
            kanji_record.id,
            kanji_record."character",
            (svg_content IS NOT NULL AND svg_content != '')::BOOLEAN,
            COALESCE(length(svg_content), 0),
            is_valid,
            notes;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the comprehensive functions
COMMENT ON FUNCTION import_kanji_complete (JSONB, JSONB) IS 'Comprehensive kanji import that handles both regular data and SVG stroke data';

COMMENT ON FUNCTION get_svg_import_stats () IS 'Get statistics about SVG stroke data coverage in kanji table';

COMMENT ON FUNCTION validate_kanji_svg_data () IS 'Validate SVG stroke data for all kanji and return detailed validation results';


GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;
/* =
===============================================================
JLPT QUESTIONS IMPORT SYSTEM
================================================================ */

-- Function to clean HTML content and extract plain text
CREATE OR REPLACE FUNCTION clean_html_content(html_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF html_text IS NULL OR html_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove HTML tags and decode common entities
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(html_text, '<[^>]*>', '', 'g'),
            '&nbsp;', ' ', 'g'
        ),
        '&[a-zA-Z0-9#]+;', '', 'g'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine question type enum from kind string
CREATE OR REPLACE FUNCTION get_grammar_question_type(kind TEXT)
RETURNS grammar_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'grammar_choice' THEN RETURN 'grammar_choice'::grammar_question_type_enum;
        WHEN 'passage_grammar' THEN RETURN 'passage_grammar'::grammar_question_type_enum;
        WHEN 'sentence_composition' THEN RETURN 'sentence_composition'::grammar_question_type_enum;
        ELSE RETURN 'grammar_choice'::grammar_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_listening_question_type(kind TEXT)
RETURNS listening_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'listening_comprehensive' THEN RETURN 'listening_comprehensive'::listening_question_type_enum;
        WHEN 'listening_expressions' THEN RETURN 'listening_expressions'::listening_question_type_enum;
        WHEN 'listening_main_points' THEN RETURN 'listening_main_points'::listening_question_type_enum;
        WHEN 'listening_overview' THEN RETURN 'listening_overview'::listening_question_type_enum;
        WHEN 'listening_topic' THEN RETURN 'listening_topic'::listening_question_type_enum;
        WHEN 'quick_response' THEN RETURN 'quick_response'::listening_question_type_enum;
        ELSE RETURN 'listening_comprehensive'::listening_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_reading_question_type(kind TEXT)
RETURNS reading_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'information_search' THEN RETURN 'information_search'::reading_question_type_enum;
        WHEN 'long_passage' THEN RETURN 'long_passage'::reading_question_type_enum;
        WHEN 'medium_passage' THEN RETURN 'medium_passage'::reading_question_type_enum;
        WHEN 'reading_comprehensive' THEN RETURN 'reading_comprehensive'::reading_question_type_enum;
        WHEN 'reading_topic' THEN RETURN 'reading_topic'::reading_question_type_enum;
        WHEN 'short_passage' THEN RETURN 'short_passage'::reading_question_type_enum;
        ELSE RETURN 'reading_comprehensive'::reading_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_word_question_type(kind TEXT)
RETURNS word_question_type_enum AS $$
BEGIN
    CASE lower(trim(kind))
        WHEN 'context_fill_in' THEN RETURN 'context_fill_in'::word_question_type_enum;
        WHEN 'expression_change' THEN RETURN 'expression_change'::word_question_type_enum;
        WHEN 'grammar_choice' THEN RETURN 'grammar_choice'::word_question_type_enum;
        WHEN 'kanji_reading' THEN RETURN 'kanji_reading'::word_question_type_enum;
        WHEN 'passage_grammar' THEN RETURN 'passage_grammar'::word_question_type_enum;
        WHEN 'sentence_composition' THEN RETURN 'sentence_composition'::word_question_type_enum;
        WHEN 'word_application' THEN RETURN 'word_application'::word_question_type_enum;
        WHEN 'word_formation' THEN RETURN 'word_formation'::word_question_type_enum;
        WHEN 'word_writing' THEN RETURN 'word_writing'::word_question_type_enum;
        ELSE RETURN 'context_fill_in'::word_question_type_enum; -- Default fallback
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main function to import JLPT questions from JSON data
CREATE OR REPLACE FUNCTION import_jlpt_questions(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    question_data JSONB;
    base_question_id BIGINT;
    content_item JSONB;
    tag_value TEXT;
    kind_value TEXT;
BEGIN
    -- Validate input
    IF json_data IS NULL OR NOT json_data ? 'Questions' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected Questions array';
    END IF;
    
    -- Process each question in the Questions array
    FOR question_data IN SELECT jsonb_array_elements(json_data -> 'Questions')
    LOOP
        BEGIN
            tag_value := safe_jsonb_extract_text(question_data, 'tag');
            kind_value := safe_jsonb_extract_text(question_data, 'kind');
            
            -- Insert base question
            INSERT INTO jlpt_questions (
                original_id, title, title_trans, level, level_of_difficult,
                tag, score, kind, correct_answers, check_explain,
                created_at, updated_at, raw_data
            ) VALUES (
                safe_jsonb_extract_int(question_data, 'id'),
                -- Handle empty titles by providing a default based on question type
                COALESCE(
                    NULLIF(safe_jsonb_extract_text(question_data, 'title'), ''),
                    CASE tag_value
                        WHEN 'listen' THEN COALESCE(
                            NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                            'Listening Question'
                        )
                        WHEN 'read' THEN COALESCE(
                            NULLIF(safe_jsonb_extract_text(question_data -> 'content' -> 0, 'question'), ''),
                            'Reading Question'
                        )
                        WHEN 'grammar' THEN 'Grammar Question'
                        WHEN 'word' THEN 'Vocabulary Question'
                        ELSE 'JLPT Question'
                    END
                ),
                safe_jsonb_extract_text(question_data, 'title_trans'),
                safe_jsonb_extract_int(question_data, 'level'),
                safe_jsonb_extract_int(question_data, 'level_of_difficult'),
                tag_value,
                safe_jsonb_extract_int(question_data, 'score'),
                kind_value,
                CASE 
                    WHEN question_data ? 'correct_answers' THEN 
                        ARRAY(SELECT jsonb_array_elements_text(question_data -> 'correct_answers'))::INT[]
                    ELSE NULL
                END,
                safe_jsonb_extract_int(question_data, 'check_explain'),
                CASE 
                    WHEN safe_jsonb_extract_text(question_data, 'created_at') IS NOT NULL 
                    THEN safe_jsonb_extract_text(question_data, 'created_at')::TIMESTAMPTZ
                    ELSE NULL
                END,
                CASE 
                    WHEN safe_jsonb_extract_text(question_data, 'updated_at') IS NOT NULL 
                    THEN safe_jsonb_extract_text(question_data, 'updated_at')::TIMESTAMPTZ
                    ELSE NULL
                END,
                question_data
            )
            ON CONFLICT (original_id) DO UPDATE SET
                title = EXCLUDED.title,
                title_trans = EXCLUDED.title_trans,
                level = EXCLUDED.level,
                level_of_difficult = EXCLUDED.level_of_difficult,
                tag = EXCLUDED.tag,
                score = EXCLUDED.score,
                kind = EXCLUDED.kind,
                correct_answers = EXCLUDED.correct_answers,
                check_explain = EXCLUDED.check_explain,
                created_at = EXCLUDED.created_at,
                updated_at = EXCLUDED.updated_at,
                raw_data = EXCLUDED.raw_data
            RETURNING id INTO base_question_id;
            
            -- Get the question ID if it was an update
            IF base_question_id IS NULL THEN
                SELECT id INTO base_question_id 
                FROM jlpt_questions 
                WHERE original_id = safe_jsonb_extract_int(question_data, 'id');
            END IF;
            
            -- Process content array and insert type-specific data
            IF question_data ? 'content' AND jsonb_array_length(question_data -> 'content') > 0 THEN
                content_item := question_data -> 'content' -> 0; -- Take first content item
                
                -- Insert type-specific question data based on tag
                CASE tag_value
                    WHEN 'grammar' THEN
                        INSERT INTO jlpt_grammar_questions (
                            question_id, question_type, question_html, question_text,
                            image_url, answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_grammar_question_type(kind_value),
                            safe_jsonb_extract_text(content_item, 'question'),
                            clean_html_content(safe_jsonb_extract_text(content_item, 'question')),
                            safe_jsonb_extract_text(content_item, 'image'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );
                    
                    WHEN 'listen' THEN
                        INSERT INTO jlpt_listening_questions (
                            question_id, question_type, question_html, question_text,
                            audio_url, audio_duration, image_url, transcript,
                            answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_listening_question_type(kind_value),
                            -- For listening questions, extract question from general.text_read_en
                            COALESCE(
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                                'Listening Question'
                            ),
                            -- Clean HTML from text_read_en
                            clean_html_content(COALESCE(
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                                'Listening Question'
                            )),
                            safe_jsonb_extract_text(question_data -> 'general', 'audio'),
                            -- Extract audio_time using nested decimal function for better error handling
                            safe_jsonb_extract_nested_decimal(question_data, ARRAY['general', 'audios', 'audio_time']),
                            safe_jsonb_extract_text(content_item, 'image'),
                            safe_jsonb_extract_text(question_data -> 'general', 'txt_read'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );
                    
                    WHEN 'read' THEN
                        INSERT INTO jlpt_reading_questions (
                            question_id, question_type, question_html, question_text,
                            passage, image_url, answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_reading_question_type(kind_value),
                            -- Reading questions have the actual question in content[0].question
                            COALESCE(
                                NULLIF(safe_jsonb_extract_text(content_item, 'question'), ''),
                                'Reading Question'
                            ),
                            clean_html_content(COALESCE(
                                NULLIF(safe_jsonb_extract_text(content_item, 'question'), ''),
                                'Reading Question'
                            )),
                            -- The reading passage is in general.text_read_en (fallback to txt_read)
                            COALESCE(
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'text_read_en'), ''),
                                NULLIF(safe_jsonb_extract_text(question_data -> 'general', 'txt_read'), ''),
                                'Reading Passage'
                            ),
                            safe_jsonb_extract_text(content_item, 'image'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );
                    
                    WHEN 'word' THEN
                        INSERT INTO jlpt_word_questions (
                            question_id, question_type, question_html, question_text,
                            image_url, answers, correct_answer_index, explanation, explanations
                        ) VALUES (
                            base_question_id,
                            get_word_question_type(kind_value),
                            safe_jsonb_extract_text(content_item, 'question'),
                            clean_html_content(safe_jsonb_extract_text(content_item, 'question')),
                            safe_jsonb_extract_text(content_item, 'image'),
                            content_item -> 'answers',
                            safe_jsonb_extract_int(content_item, 'correctAnswer'),
                            safe_jsonb_extract_text(content_item, 'explain'),
                            content_item -> 'explainAll'
                        );
                END CASE;
                
                -- Insert multilingual text data
                PERFORM insert_question_multilingual_texts(base_question_id, question_data);
            END IF;
            
            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing JLPT question ID % (tag: %, kind: %): %', 
                    safe_jsonb_extract_int(question_data, 'id'), 
                    safe_jsonb_extract_text(question_data, 'tag'),
                    safe_jsonb_extract_text(question_data, 'kind'),
                    SQLERRM;
        END;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to insert multilingual text data
CREATE OR REPLACE FUNCTION insert_question_multilingual_texts(question_id BIGINT, question_data JSONB)
RETURNS VOID AS $$
DECLARE
    lang_codes TEXT[] := ARRAY['vn', 'en', 'cn', 'tw', 'es', 'ru', 'fr', 'id', 'ko', 'my', 'pt', 'de', 'th'];
    lang_code TEXT;
    text_content TEXT;
BEGIN
    -- Insert general reading passage translations
    FOREACH lang_code IN ARRAY lang_codes
    LOOP
        text_content := safe_jsonb_extract_text(question_data -> 'general', 'text_read_' || lang_code);
        IF text_content IS NOT NULL AND text_content != '' THEN
            INSERT INTO jlpt_question_texts (question_id, language_code, text_type, content)
            VALUES (question_id, lang_code, 'reading_passage', text_content);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Efficient batch import function for JLPT questions from file
CREATE OR REPLACE FUNCTION import_jlpt_questions_from_file(file_path TEXT)
RETURNS INTEGER AS $$
DECLARE
    json_content JSONB;
    result INTEGER;
BEGIN
    -- This function would be called from the shell script with proper file handling
    -- For now, it's a placeholder that expects the JSON to be loaded externally
    RAISE NOTICE 'Processing JLPT questions from file: %', file_path;
    
    -- The actual file reading would be done by the shell script using jq
    -- and the data would be passed to import_jlpt_questions function
    
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get question statistics
CREATE OR REPLACE FUNCTION get_jlpt_import_stats()
RETURNS TABLE(
    question_type TEXT,
    total_questions BIGINT,
    by_level JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Total Questions'::TEXT,
        COUNT(*),
        jsonb_object_agg(level::TEXT, level_count)
    FROM (
        SELECT level, COUNT(*) as level_count
        FROM jlpt_questions
        GROUP BY level
    ) level_stats;
    
    RETURN QUERY
    SELECT 
        'Grammar Questions'::TEXT,
        COUNT(*),
        jsonb_object_agg(q.level::TEXT, level_count)
    FROM (
        SELECT q.level, COUNT(*) as level_count
        FROM jlpt_questions q
        JOIN jlpt_grammar_questions gq ON q.id = gq.question_id
        GROUP BY q.level
    ) level_stats, jlpt_questions q
    JOIN jlpt_grammar_questions gq ON q.id = gq.question_id;
    
    -- Similar queries for other question types...
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new functions
COMMENT ON FUNCTION clean_html_content (TEXT) IS 'Remove HTML tags and decode entities from question content';

COMMENT ON FUNCTION import_jlpt_questions (JSONB) IS 'Import JLPT questions from JSON data with type-specific handling';

COMMENT ON FUNCTION insert_question_multilingual_texts (BIGINT, JSONB) IS 'Insert multilingual text data for JLPT questions';

COMMENT ON FUNCTION get_jlpt_import_stats () IS 'Get statistics about imported JLPT questions';

-- Import book sets (courses) from JSON
CREATE OR REPLACE FUNCTION import_book_sets(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;
    
    -- Process each book set record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO courses (
                id, name, description, level, total_words, version
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'id'),
                safe_jsonb_extract_text(record_data, 'name'),
                'Book set: ' || safe_jsonb_extract_text(record_data, 'name') || ' (Level ' || safe_jsonb_extract_text(record_data, 'level') || ')',
                safe_jsonb_extract_text(record_data, 'level'),
                safe_jsonb_extract_int(record_data, 'total_word'),
                safe_jsonb_extract_int(record_data, 'version')
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                level = EXCLUDED.level,
                total_words = EXCLUDED.total_words,
                version = EXCLUDED.version;
            
            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing book set ID %: %', 
                    safe_jsonb_extract_int(record_data, 'id'), SQLERRM;
        END;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import units from JSON
CREATE OR REPLACE FUNCTION import_units(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;
    
    -- Process each unit record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO units (
                id, course_id, path, title, description, total_words
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'id'),
                safe_jsonb_extract_int(record_data, 'book_set_id'),
                safe_jsonb_extract_int(record_data, 'id')::text::ltree,
                safe_jsonb_extract_text(record_data, 'name'),
                'Unit: ' || safe_jsonb_extract_text(record_data, 'name'),
                safe_jsonb_extract_int(record_data, 'total_word')
            )
            ON CONFLICT (id) DO UPDATE SET
                course_id = EXCLUDED.course_id,
                path = EXCLUDED.path,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                total_words = EXCLUDED.total_words;
            
            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing unit ID %: %', 
                    safe_jsonb_extract_int(record_data, 'id'), SQLERRM;
        END;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Import unit-word relationships from JSON
CREATE OR REPLACE FUNCTION import_unit_word_relations(json_data JSONB)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER := 0;
    record_data JSONB;
BEGIN
    -- Validate input
    IF json_data IS NULL OR jsonb_typeof(json_data) != 'array' THEN
        RAISE EXCEPTION 'Invalid JSON data: expected array';
    END IF;
    
    -- Process each relationship record
    FOR record_data IN SELECT jsonb_array_elements(json_data)
    LOOP
        BEGIN
            INSERT INTO unit_items (
                unit_id, item_type, item_id, position
            ) VALUES (
                safe_jsonb_extract_int(record_data, 'unit_id'),
                'word'::unit_item_enum,
                safe_jsonb_extract_int(record_data, 'word_id'),
                safe_jsonb_extract_int(record_data, 'id')
            )
            ON CONFLICT (unit_id, item_type, item_id) DO UPDATE SET
                position = EXCLUDED.position;
            
            inserted_count := inserted_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error importing unit-word relation (unit: %, word: %): %', 
                    safe_jsonb_extract_int(record_data, 'unit_id'),
                    safe_jsonb_extract_int(record_data, 'word_id'),
                    SQLERRM;
        END;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new functions
COMMENT ON FUNCTION import_book_sets (JSONB) IS 'Import book sets courses from cleaned JSON data';

COMMENT ON FUNCTION import_units (JSONB) IS 'Import units from cleaned JSON data with hierarchical paths';

COMMENT ON FUNCTION import_unit_word_relations (JSONB) IS 'Import unit word relationships from cleaned JSON data';

-- Comprehensive kanji import function that handles both regular data and SVG strokes
CREATE OR REPLACE FUNCTION import_kanji_complete(json_data JSONB, svg_data JSONB DEFAULT NULL)
RETURNS TABLE(
    regular_imported INTEGER,
    svg_imported INTEGER,
    total_kanji INTEGER
) AS $$
DECLARE
    regular_count INTEGER := 0;
    svg_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    -- Import regular kanji data
    IF json_data IS NOT NULL THEN
        regular_count := import_kanji_data(json_data);
    END IF;
    
    -- Import SVG stroke data if provided
    IF svg_data IS NOT NULL THEN
        svg_count := import_kanji_svg_strokes(svg_data);
    END IF;
    
    -- Get total count of kanji with SVG data
    SELECT COUNT(*) INTO total_count 
    FROM kanji 
    WHERE strokes_svg IS NOT NULL AND strokes_svg != '';
    
    RETURN QUERY SELECT 
        regular_count::INTEGER,
        svg_count::INTEGER,
        total_count::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to get SVG stroke import statistics
CREATE OR REPLACE FUNCTION get_svg_import_stats()
RETURNS TABLE(
    total_kanji INTEGER,
    kanji_with_svg INTEGER,
    kanji_without_svg INTEGER,
    svg_coverage_percent NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_kanji,
        COUNT(CASE WHEN strokes_svg IS NOT NULL AND strokes_svg != '' THEN 1 END)::INTEGER as kanji_with_svg,
        COUNT(CASE WHEN strokes_svg IS NULL OR strokes_svg = '' THEN 1 END)::INTEGER as kanji_without_svg,
        ROUND(
            (COUNT(CASE WHEN strokes_svg IS NOT NULL AND strokes_svg != '' THEN 1 END)::NUMERIC / COUNT(*)) * 100, 
            2
        ) as svg_coverage_percent
    FROM kanji;
END;
$$ LANGUAGE plpgsql;

-- Function to validate SVG content and return validation results
CREATE OR REPLACE FUNCTION validate_kanji_svg_data()
RETURNS TABLE(
    kanji_id INTEGER,
    "character" TEXT,
    has_svg BOOLEAN,
    svg_length INTEGER,
    is_valid_svg BOOLEAN,
    validation_notes TEXT
) AS $$
DECLARE
    kanji_record RECORD;
    svg_content TEXT;
    is_valid BOOLEAN;
    notes TEXT;
BEGIN
    FOR kanji_record IN SELECT id, "character", strokes_svg FROM kanji ORDER BY id
    LOOP
        svg_content := kanji_record.strokes_svg;
        
        -- Check if SVG exists
        IF svg_content IS NULL OR svg_content = '' THEN
            is_valid := FALSE;
            notes := 'No SVG data';
        ELSE
            -- Basic SVG validation
            is_valid := (svg_content LIKE '%<svg%' AND svg_content LIKE '%</svg>%');
            
            IF is_valid THEN
                notes := 'Valid SVG content';
            ELSE
                notes := 'Invalid SVG format';
            END IF;
        END IF;
        
        RETURN QUERY SELECT 
            kanji_record.id,
            kanji_record."character",
            (svg_content IS NOT NULL AND svg_content != '')::BOOLEAN,
            COALESCE(length(svg_content), 0),
            is_valid,
            notes;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for the new comprehensive functions
COMMENT ON FUNCTION import_kanji_complete (JSONB, JSONB) IS 'Comprehensive kanji import that handles both regular data and SVG stroke data';

COMMENT ON FUNCTION get_svg_import_stats () IS 'Get statistics about SVG stroke data coverage in kanji table';

COMMENT ON FUNCTION validate_kanji_svg_data () IS 'Validate SVG stroke data for all kanji and return detailed validation results';

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

COMMENT ON FUNCTION analyze_words_data_quality (JSONB) IS 'Analyze data quality issues in words JSON data before import';

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


-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop all import functions (list would be very long, handled by CASCADE if needed)
-- +goose StatementEnd
