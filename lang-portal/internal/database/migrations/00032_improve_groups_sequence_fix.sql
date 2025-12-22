-- +goose Up
-- +goose StatementBegin

/* Improve groups_id_seq sequence fix to use setval with true parameter and prevent decreasing */

-- This migration improves upon 00025_fix_groups_sequence.sql by:
-- 1. Using setval with true parameter to mark the value as consumed
-- 2. Using GREATEST to ensure we never decrease the sequence value (important for concurrent operations)
-- 3. Adding a safety margin to ensure we're always ahead of the max ID

-- Reset the sequence to be at least max(id) + 1 to prevent primary key collisions
-- Using GREATEST ensures we never decrease the sequence value (important for concurrent operations)
-- Using true as the third parameter marks the value as consumed, so nextval() will return the next value
SELECT setval('groups_id_seq', 
    GREATEST(
        COALESCE((SELECT MAX(id) FROM groups), 0) + 1,
        (SELECT last_value FROM groups_id_seq)
    ),
    true);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Note: There's no safe way to rollback a sequence fix without knowing the original value
-- This migration is idempotent and safe to run multiple times
-- Rolling back would require restoring the sequence to its previous state, which we don't track

-- +goose StatementEnd

