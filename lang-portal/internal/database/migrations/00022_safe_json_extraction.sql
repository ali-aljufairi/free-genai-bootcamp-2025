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

-- Safe JSON text array extraction
CREATE OR REPLACE FUNCTION safe_jsonb_extract_text_array(json_data JSONB, key TEXT)
RETURNS TEXT[] AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract and validate array value
    DECLARE
        array_value JSONB := json_data -> key;
        result TEXT[];
    BEGIN
        -- Handle null or non-array values
        IF array_value IS NULL OR jsonb_typeof(array_value) != 'array' THEN
            RETURN NULL;
        END IF;

        -- Convert JSONB array to PostgreSQL text array
        SELECT ARRAY(
            SELECT jsonb_array_elements_text(array_value)
        ) INTO result;

        RETURN result;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting text array key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JSON nested decimal extraction
CREATE OR REPLACE FUNCTION safe_jsonb_extract_nested_decimal(json_data JSONB, path TEXT[])
RETURNS DECIMAL AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR path IS NULL OR array_length(path, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- Extract and validate nested decimal value
    DECLARE
        nested_value JSONB := json_data;
        text_value TEXT;
        result DECIMAL;
        path_element TEXT;
    BEGIN
        -- Traverse the path
        FOREACH path_element IN ARRAY path
        LOOP
            IF nested_value IS NULL OR jsonb_typeof(nested_value) != 'object' THEN
                RETURN NULL;
            END IF;
            nested_value := nested_value -> path_element;
        END LOOP;

        -- Extract text value
        IF nested_value IS NULL OR jsonb_typeof(nested_value) != 'string' AND jsonb_typeof(nested_value) != 'number' THEN
            RETURN NULL;
        END IF;

        text_value := nested_value::TEXT;

        -- Convert to decimal with validation
        result := text_value::DECIMAL;
        RETURN result;
    END;
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE WARNING 'Invalid decimal value at path %: %', array_to_string(path, '.'), nested_value;
        RETURN NULL;
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting nested decimal at path %: %', array_to_string(path, '.'), SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JSON nested text extraction
CREATE OR REPLACE FUNCTION safe_jsonb_extract_nested_text(json_data JSONB, path TEXT[])
RETURNS TEXT AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR path IS NULL OR array_length(path, 1) = 0 THEN
        RETURN NULL;
    END IF;

    -- Extract and validate nested text value
    DECLARE
        nested_value JSONB := json_data;
        result TEXT;
        path_element TEXT;
    BEGIN
        -- Traverse the path
        FOREACH path_element IN ARRAY path
        LOOP
            IF nested_value IS NULL OR jsonb_typeof(nested_value) != 'object' THEN
                RETURN NULL;
            END IF;
            nested_value := nested_value -> path_element;
        END LOOP;

        -- Extract text value
        IF nested_value IS NULL OR jsonb_typeof(nested_value) != 'string' THEN
            RETURN NULL;
        END IF;

        result := nested_value::TEXT;

        -- Return null for empty strings
        IF result = '' THEN
            RETURN NULL;
        END IF;

        RETURN result;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting nested text at path %: %', array_to_string(path, '.'), SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Safe JSON SVG extraction with HTML entity decoding
CREATE OR REPLACE FUNCTION safe_jsonb_extract_svg(json_data JSONB, key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Handle null or invalid JSON
    IF json_data IS NULL OR json_data = 'null'::jsonb OR NOT json_data ? key THEN
        RETURN NULL;
    END IF;

    -- Extract and validate SVG content
    DECLARE
        result TEXT := json_data ->> key;
    BEGIN
        -- Return null for empty strings
        IF result IS NULL OR result = '' THEN
            RETURN NULL;
        END IF;

        -- Decode HTML entities (basic common ones)
        result := REPLACE(result, '&lt;', '<');
        result := REPLACE(result, '&gt;', '>');
        result := REPLACE(result, '&amp;', '&');
        result := REPLACE(result, '&quot;', '"');
        result := REPLACE(result, '&#39;', E'\'');

        RETURN result;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error extracting SVG key "%" from JSON: %', key, SQLERRM;
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION safe_jsonb_extract_text (JSONB, TEXT) IS 'Safely extract text value from JSONB with validation';

COMMENT ON FUNCTION safe_jsonb_extract_int (JSONB, TEXT) IS 'Safely extract integer value from JSONB with validation';

COMMENT ON FUNCTION safe_jsonb_extract_decimal (JSONB, TEXT) IS 'Safely extract decimal value from JSONB with validation';

COMMENT ON FUNCTION safe_jsonb_extract_text_array (JSONB, TEXT) IS 'Safely extract and convert JSONB array to PostgreSQL text array';

COMMENT ON FUNCTION safe_jsonb_extract_nested_decimal (JSONB, TEXT []) IS 'Safely extract decimal value from nested JSON path with error handling';

COMMENT ON FUNCTION safe_jsonb_extract_nested_text (JSONB, TEXT []) IS 'Safely extract text value from nested JSON path with error handling';

COMMENT ON FUNCTION safe_jsonb_extract_svg (JSONB, TEXT) IS 'Safely extract and validate SVG content from JSONB with HTML entity decoding';

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS safe_jsonb_extract_svg(JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS safe_jsonb_extract_nested_text(JSONB, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS safe_jsonb_extract_nested_decimal(JSONB, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS safe_jsonb_extract_text_array(JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS safe_jsonb_extract_decimal(JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS safe_jsonb_extract_int(JSONB, TEXT) CASCADE;
DROP FUNCTION IF EXISTS safe_jsonb_extract_text(JSONB, TEXT) CASCADE;

-- +goose StatementEnd

