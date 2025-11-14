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