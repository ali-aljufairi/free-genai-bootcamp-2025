-- +goose Up
-- +goose StatementBegin
/* Normalize and deduplicate word readings ----------------------------------- */
DO $$
DECLARE
    before_whitespace INTEGER;
    after_whitespace INTEGER;
    normalized_rows INTEGER;
    deleted_dupes INTEGER;
BEGIN
    -- Snapshot rows containing whitespace before mutation
    SELECT COUNT(*) INTO before_whitespace
    FROM words w
    WHERE (w.kana ~ '\s' OR w.romaji ~ '\s');

    -- Normalize kana / romaji: trim, collapse whitespace, keep first token
    WITH normalized AS (
        SELECT
            w.id,
            NULLIF(split_part(trim(BOTH FROM regexp_replace(w.kana, '\s+', ' ', 'g')), ' ', 1), '') AS nkana,
            NULLIF(split_part(trim(BOTH FROM regexp_replace(w.romaji, '\s+', ' ', 'g')), ' ', 1), '') AS nromaji
        FROM words w
    )
    UPDATE words w
    SET
        kana = n.nkana,
        romaji = n.nromaji
    FROM normalized n
    WHERE w.id = n.id
      AND (
        w.kana IS DISTINCT FROM n.nkana
        OR w.romaji IS DISTINCT FROM n.nromaji
      );

    GET DIAGNOSTICS normalized_rows = ROW_COUNT;

    -- Post-mutation whitespace snapshot
    SELECT COUNT(*) INTO after_whitespace
    FROM words w
    WHERE (w.kana ~ '\s' OR w.romaji ~ '\s');

    RAISE NOTICE 'Words normalization: % rows updated; before whitespace=% after whitespace=%',
        normalized_rows, before_whitespace, after_whitespace;

    -- Deduplicate unreferenced duplicates after normalization
    WITH refs AS (
        SELECT
            w.id,
            (
                EXISTS (SELECT 1 FROM word_groups wg WHERE wg.word_id = w.id) OR
                EXISTS (SELECT 1 FROM word_tags wt WHERE wt.word_id = w.id) OR
                EXISTS (SELECT 1 FROM study_group_words sg WHERE sg.word_id = w.id) OR
                EXISTS (SELECT 1 FROM vocabulary_learning_progress vlp WHERE vlp.word_id = w.id)
            ) AS referenced
        FROM words w
    ),
    ranked AS (
        SELECT
            w.id,
            w.kana,
            w.romaji,
            r.referenced,
            ROW_NUMBER() OVER (
                PARTITION BY w.kana, w.romaji
                ORDER BY r.referenced DESC, w.id
            ) AS rn
        FROM words w
        JOIN refs r ON r.id = w.id
        WHERE w.kana IS NOT NULL OR w.romaji IS NOT NULL
    ),
    to_delete AS (
        SELECT id
        FROM ranked
        WHERE rn > 1
          AND referenced = FALSE
    )
    DELETE FROM words w
    USING to_delete d
    WHERE w.id = d.id;

    GET DIAGNOSTICS deleted_dupes = ROW_COUNT;
    RAISE NOTICE 'Words dedupe: % unreferenced duplicate rows deleted', deleted_dupes;

    -- If no duplicates remain, enforce uniqueness on kana/romaji pairs
    PERFORM 1
    FROM (
        SELECT kana, romaji, COUNT(*) AS c
        FROM words
        GROUP BY kana, romaji
        HAVING COUNT(*) > 1
        LIMIT 1
    ) dup_exists;

    IF NOT FOUND THEN
        BEGIN
            CREATE UNIQUE INDEX IF NOT EXISTS idx_words_kana_romaji_unique
                ON words (kana, romaji)
                WHERE kana IS NOT NULL AND romaji IS NOT NULL;
            RAISE NOTICE 'Created unique index idx_words_kana_romaji_unique (kana, romaji)';
        EXCEPTION
            WHEN duplicate_table THEN
                NULL; -- Index already present
        END;
    ELSE
        RAISE NOTICE 'Skipped unique index creation because duplicates remain';
    END IF;
END$$;
-- +goose StatementEnd

/* Enforce normalization on future writes ------------------------------------ */
-- +goose StatementBegin
DO $$
BEGIN
    IF to_regprocedure('normalize_words_fields()') IS NULL THEN
        CREATE FUNCTION normalize_words_fields() RETURNS trigger AS $fn$
        BEGIN
            IF NEW.kana IS NOT NULL THEN
                NEW.kana := NULLIF(
                    split_part(
                        trim(BOTH FROM regexp_replace(NEW.kana, '\s+', ' ', 'g')),
                        ' ',
                        1
                    ),
                    ''
                );

END IF;

IF NEW.romaji IS NOT NULL THEN NEW.romaji := NULLIF(
    split_part(
        trim(
            BOTH
            FROM regexp_replace(NEW.romaji, '\s+', ' ', 'g')
        ),
        ' ',
        1
    ),
    ''
);

END IF;

RETURN NEW;

END;

$fn$ LANGUAGE plpgsql;

END IF;

END$$;
-- +goose StatementEnd

-- +goose StatementBegin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_words_normalize'
    ) THEN
        CREATE TRIGGER trg_words_normalize
        BEFORE INSERT OR UPDATE ON words
        FOR EACH ROW
        EXECUTE FUNCTION normalize_words_fields();
    END IF;
END$$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Irreversible data changes; cleanup objects only
DROP TRIGGER IF EXISTS trg_words_normalize ON words;
DROP FUNCTION IF EXISTS normalize_words_fields();
DROP INDEX IF EXISTS idx_words_kana_romaji_unique;
-- +goose StatementEnd