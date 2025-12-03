-- +goose Up
-- +goose StatementBegin
-- Comprehensive Import Functions
-- Complete import workflows and statistics functions
-- NOTE: This file contains only unique functions not duplicated in earlier migrations

/* ================================================================
COMPREHENSIVE IMPORT FUNCTIONS (Unique Only)
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

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS validate_kanji_svg_data() CASCADE;
DROP FUNCTION IF EXISTS get_svg_import_stats() CASCADE;
DROP FUNCTION IF EXISTS import_kanji_complete(JSONB, JSONB) CASCADE;

-- +goose StatementEnd

