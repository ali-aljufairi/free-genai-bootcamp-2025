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