-- +goose Up
-- +goose StatementBegin
/*
Ensure JLPT reading passages in jlpt_reading_questions use the Japanese
source text instead of the English version.

The import pipeline in 00016_jlpt_import_functions.sql originally preferred
general.text_read_en (English) over general.txt_read (Japanese) when
populating jlpt_reading_questions.passage, which led to English passages
being shown in the Reading Quiz UI.

We have now updated the import function to prefer general.txt_read first.
This migration updates existing rows to match that behaviour, using the
Japanese text from jlpt_questions.raw_data->'general'->'txt_read' whenever
it is present.
*/

UPDATE jlpt_reading_questions rq
SET passage = safe_jsonb_extract_text(q.raw_data -> 'general', 'txt_read')
FROM jlpt_questions q
WHERE rq.question_id = q.id
  AND safe_jsonb_extract_text(q.raw_data -> 'general', 'txt_read') IS NOT NULL
  AND safe_jsonb_extract_text(q.raw_data -> 'general', 'txt_read') <> '';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
/*
Approximate rollback: restore passages to prefer the English text_read_en
when available, falling back to the current passage.

Note: This may not exactly match the original import state if further
data corrections were applied after this migration.
*/

UPDATE jlpt_reading_questions rq
SET passage = COALESCE(
        NULLIF(safe_jsonb_extract_text(q.raw_data -> 'general', 'text_read_en'), ''),
        passage
    )
FROM jlpt_questions q
WHERE rq.question_id = q.id;

-- +goose StatementEnd

