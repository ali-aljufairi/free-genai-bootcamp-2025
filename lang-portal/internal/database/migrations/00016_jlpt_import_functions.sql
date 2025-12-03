-- +goose Up
-- +goose StatementBegin

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

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS get_jlpt_import_stats() CASCADE;
DROP FUNCTION IF EXISTS import_jlpt_questions_from_file(TEXT) CASCADE;
DROP FUNCTION IF EXISTS insert_question_multilingual_texts(INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS import_jlpt_questions(JSONB) CASCADE;
DROP FUNCTION IF EXISTS get_word_question_type(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_reading_question_type(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_listening_question_type(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_grammar_question_type(TEXT) CASCADE;
DROP FUNCTION IF EXISTS clean_html_content(TEXT) CASCADE;

-- +goose StatementEnd