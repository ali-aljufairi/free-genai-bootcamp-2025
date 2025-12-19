-- +goose Up
-- +goose StatementBegin

/*
Drop redundant non-unique index on users.clerk_id.

The unique index users_clerk_id_key already exists and is used by queries
filtering on clerk_id. The additional idx_users_clerk_id index is fully
covered by that unique index and only adds write overhead.
*/
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   pg_class c
        JOIN   pg_namespace n ON n.oid = c.relnamespace
        WHERE  c.relkind = 'i'
        AND    c.relname = 'idx_users_clerk_id'
        AND    n.nspname = 'public'
    ) THEN
        EXECUTE 'DROP INDEX CONCURRENTLY public.idx_users_clerk_id';
    END IF;
END
$$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

/*
Recreate the non-unique idx_users_clerk_id index if needed.
Note: this index is redundant with users_clerk_id_key and normally
should not be required in production.
*/
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_clerk_id ON public.users USING btree (clerk_id);

-- +goose StatementEnd