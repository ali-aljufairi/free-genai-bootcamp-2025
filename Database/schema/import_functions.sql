
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