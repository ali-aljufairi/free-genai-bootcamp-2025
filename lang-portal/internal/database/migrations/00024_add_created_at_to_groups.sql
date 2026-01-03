-- +goose Up
-- +goose StatementBegin

/* Add created_at column to groups table (required by GORM model) */

-- Add created_at column with default timestamp
ALTER TABLE groups ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to have a reasonable timestamp (use current time)
-- This ensures existing groups have a created_at value
UPDATE groups SET created_at = now() WHERE created_at IS NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove created_at column
ALTER TABLE groups DROP COLUMN IF EXISTS created_at;

-- +goose StatementEnd













