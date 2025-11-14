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