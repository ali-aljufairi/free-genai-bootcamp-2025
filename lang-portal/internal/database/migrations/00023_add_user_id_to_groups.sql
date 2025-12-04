-- +goose Up
-- +goose StatementBegin

/* Add user_id column to groups table to support both system groups (user_id = NULL) and user groups (user_id set) */

-- Add user_id column (nullable to support system groups)
ALTER TABLE groups ADD COLUMN user_id BIGINT;

-- Add foreign key constraint to users table (nullable FK is allowed)
ALTER TABLE groups
ADD CONSTRAINT fk_groups_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

-- Drop the existing unique constraint on name
-- PostgreSQL creates this constraint when using UNIQUE inline
-- We'll find and drop it dynamically to handle any naming convention
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the unique constraint on the name column
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'groups'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) = 'name';
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE groups DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Create partial unique index for system groups (user_id IS NULL)
-- Ensures unique names among system groups
CREATE UNIQUE INDEX idx_groups_name_system ON groups (name)
WHERE
    user_id IS NULL;

-- Create partial unique index for user groups (user_id IS NOT NULL)
-- Ensures unique names per user
CREATE UNIQUE INDEX idx_groups_user_name ON groups (user_id, name)
WHERE
    user_id IS NOT NULL;

-- Create index on user_id for efficient filtering
CREATE INDEX idx_groups_user_id ON groups (user_id);

-- Existing groups will have user_id = NULL (treated as system groups)
-- This is the default behavior for nullable columns

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Drop indexes
DROP INDEX IF EXISTS idx_groups_user_id;

DROP INDEX IF EXISTS idx_groups_user_name;

DROP INDEX IF EXISTS idx_groups_name_system;

-- Drop foreign key constraint
ALTER TABLE groups DROP CONSTRAINT IF EXISTS fk_groups_user_id;

-- Remove user_id column
ALTER TABLE groups DROP COLUMN IF EXISTS user_id;

-- Restore original unique constraint on name
ALTER TABLE groups ADD CONSTRAINT groups_name_key UNIQUE (name);

-- +goose StatementEnd