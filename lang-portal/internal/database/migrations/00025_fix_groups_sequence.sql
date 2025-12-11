-- +goose Up
-- +goose StatementBegin

/* Fix groups_id_seq sequence to be in sync with actual data in groups table */

-- Reset the sequence to be at least max(id) + 1 to prevent primary key collisions
-- This fixes the "duplicate key value violates unique constraint groups_pkey" error
SELECT setval('groups_id_seq', 
    COALESCE((SELECT MAX(id) FROM groups), 0) + 1, 
    false);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Note: There's no safe way to rollback a sequence fix without knowing the original value
-- This migration is idempotent and safe to run multiple times

-- +goose StatementEnd










