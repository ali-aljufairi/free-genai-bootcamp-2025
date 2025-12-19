-- +goose NO TRANSACTION

-- +goose Up

/*
Second attempt to drop redundant non-unique index on users.clerk_id.

The unique index users_clerk_id_key already exists and is used by queries
filtering on clerk_id. The additional idx_users_clerk_id index is fully
covered by that unique index and only adds write overhead.
*/
DROP INDEX CONCURRENTLY IF EXISTS public.idx_users_clerk_id;

-- +goose Down

/*
Recreate the non-unique idx_users_clerk_id index if needed.
Note: this index is redundant with users_clerk_id_key and normally
should not be required in production.
*/
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_clerk_id ON public.users USING btree (clerk_id);