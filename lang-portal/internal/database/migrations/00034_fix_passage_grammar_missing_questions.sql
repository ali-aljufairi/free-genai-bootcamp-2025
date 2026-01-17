-- +goose Up
-- +goose StatementBegin

ALTER TABLE jlpt_grammar_questions 
DROP CONSTRAINT IF EXISTS jlpt_grammar_questions_question_id_key;

ALTER TABLE jlpt_grammar_questions
ADD CONSTRAINT jlpt_grammar_questions_question_id_text_unique 
UNIQUE (question_id, question_text);

-- Main migration: Insert missing passage_grammar questions
DO $$
DECLARE
    question_record RECORD;
    content_item JSONB;
    content_index INTEGER;
    content_count INTEGER;
    existing_texts TEXT[];
    q_text TEXT;
    q_html TEXT;
    base_question_id BIGINT;
    kind_val TEXT;
    new_grammar_id BIGINT;
    inserted_count INTEGER := 0;
    processed_count INTEGER := 0;
BEGIN
    -- Loop through all passage_grammar questions that have missing content items
    FOR question_record IN
        SELECT 
            q.id,
            q.original_id,
            q.raw_data,
            q.raw_data->>'kind' as kind_value,
            jsonb_array_length(q.raw_data->'content') as total_content_items,
            COALESCE(ARRAY_AGG(gq.question_text ORDER BY gq.id) FILTER (WHERE gq.id IS NOT NULL), ARRAY[]::TEXT[]) as existing_texts
        FROM jlpt_questions q
        LEFT JOIN jlpt_grammar_questions gq ON q.id = gq.question_id AND gq.question_type = 'passage_grammar'
        WHERE q.tag = 'grammar'
        AND q.raw_data->>'kind' = 'passage_grammar'
        AND jsonb_array_length(q.raw_data->'content') > 0
        GROUP BY q.id, q.original_id, q.raw_data, q.raw_data->>'kind', jsonb_array_length(q.raw_data->'content')
        HAVING jsonb_array_length(q.raw_data->'content') > COALESCE(COUNT(gq.id), 0)
    LOOP
        base_question_id := question_record.id;
        existing_texts := question_record.existing_texts;
        content_count := question_record.total_content_items;
        kind_val := question_record.kind_value;
        processed_count := processed_count + 1;
        FOR content_index IN 0..(content_count - 1) LOOP
            content_item := question_record.raw_data->'content'->content_index;
            q_html := safe_jsonb_extract_text(content_item, 'question');
            q_text := clean_html_content(q_html);
            
            -- Skip if q_text is null or empty
            IF q_text IS NULL OR q_text = '' THEN
                CONTINUE;
            END IF;
            
            IF q_text = ANY(existing_texts) THEN
                CONTINUE;
            END IF;
            BEGIN
                INSERT INTO jlpt_grammar_questions (
                    question_id,
                    question_type,
                    question_html,
                    question_text,
                    image_url,
                    answers,
                    correct_answer_index,
                    explanation,
                    explanations
                ) VALUES (
                    base_question_id,
                    get_grammar_question_type(kind_val),
                    q_html,
                    q_text,
                    safe_jsonb_extract_text(content_item, 'image'),
                    content_item->'answers',
                    safe_jsonb_extract_int(content_item, 'correctAnswer'),
                    safe_jsonb_extract_text(content_item, 'explain'),
                    content_item->'explainAll'
                )
                RETURNING id INTO new_grammar_id;
                
                inserted_count := inserted_count + 1;
                    
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Error inserting content_index=%, q_text=%: %',
                        content_index, q_text, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END;
$$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DO $$
DECLARE
    question_record RECORD;
    deleted_count INTEGER := 0;
BEGIN
    -- For each passage_grammar question group, keep only the first one (lowest ID)
    FOR question_record IN
        SELECT 
            q.id as jlpt_question_id,
            ARRAY_AGG(gq.id ORDER BY gq.id) as grammar_question_ids
        FROM jlpt_questions q
        JOIN jlpt_grammar_questions gq ON q.id = gq.question_id
        WHERE gq.question_type = 'passage_grammar'
        AND q.tag = 'grammar'
        GROUP BY q.id
        HAVING COUNT(gq.id) > 1
    LOOP
        -- Delete all except the first one (lowest ID)
        DELETE FROM jlpt_grammar_questions
        WHERE id = ANY(question_record.grammar_question_ids[2:array_length(question_record.grammar_question_ids, 1)]);
        
        deleted_count := deleted_count + (array_length(question_record.grammar_question_ids, 1) - 1);
    END LOOP;
END;
$$;

ALTER TABLE jlpt_grammar_questions
DROP CONSTRAINT IF EXISTS jlpt_grammar_questions_question_id_text_unique;

ALTER TABLE jlpt_grammar_questions
ADD CONSTRAINT jlpt_grammar_questions_question_id_key 
UNIQUE (question_id);

-- +goose StatementEnd
