-- +goose Up
-- +goose StatementBegin
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

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS import_example_sentences (JSONB) CASCADE;

DROP FUNCTION IF EXISTS import_grammar_readings (JSONB) CASCADE;

DROP FUNCTION IF EXISTS import_grammar_data (JSONB) CASCADE;

DROP FUNCTION IF EXISTS import_words_data (JSONB) CASCADE;

DROP FUNCTION IF EXISTS import_kanji_svg_strokes (JSONB) CASCADE;

DROP FUNCTION IF EXISTS fix_kanji_meanings_detail () CASCADE;

DROP FUNCTION IF EXISTS import_kanji_data (JSONB) CASCADE;

-- +goose StatementEnd