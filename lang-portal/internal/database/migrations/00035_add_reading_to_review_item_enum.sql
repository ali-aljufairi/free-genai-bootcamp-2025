-- +goose Up
-- +goose StatementBegin
-- Add 'reading' to review_item_enum for reading quiz SRS tracking
ALTER TYPE review_item_enum ADD VALUE IF NOT EXISTS 'reading';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Note: PostgreSQL does not support removing enum values directly
-- This would require recreating the enum type, which is complex and risky
-- For safety, we'll leave this as a no-op in the down migration
-- If you need to remove 'reading', you'll need to:
-- 1. Create a new enum without 'reading'
-- 2. Update all columns using the enum
-- 3. Drop the old enum
-- 4. Rename the new enum
-- This is a destructive operation and should be done carefully
-- +goose StatementEnd
