-- +goose Up
-- +goose StatementBegin

/* Create PostgreSQL function to safely fix groups_id_seq sequence */

-- This function can be called from application code to fix sequence synchronization issues
-- It ensures the sequence is at least MAX(id) + 1 and never decreases
CREATE OR REPLACE FUNCTION fix_groups_sequence()
RETURNS void AS $$
DECLARE
    max_id BIGINT;
    current_seq_value BIGINT;
    new_seq_value BIGINT;
BEGIN
    -- Get the maximum ID from the groups table
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM groups;
    
    -- Get the current sequence value
    SELECT last_value INTO current_seq_value FROM groups_id_seq;
    
    -- Calculate the new sequence value (ensure it's at least max_id + 1 and never decreases)
    new_seq_value := GREATEST(max_id + 1, current_seq_value);
    
    -- Set the sequence value and mark it as consumed (true parameter)
    PERFORM setval('groups_id_seq', new_seq_value, true);
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION fix_groups_sequence () IS 'Safely fixes groups_id_seq sequence to be in sync with actual data. Can be called from application code when sequence issues are detected.';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop the function
DROP FUNCTION IF EXISTS fix_groups_sequence ();

-- +goose StatementEnd