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