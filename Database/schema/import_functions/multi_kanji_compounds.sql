-- Multi-Kanji Compound Generation and Item Relations Wiring
-- Functions to generate multi-kanji compounds and create their relationships

/* ================================================================
MULTI-KANJI COMPOUND GENERATION
================================================================ */

-- Generate multi-kanji compounds from existing kanji
-- Only creates compounds with 2-4 kanji characters
CREATE OR REPLACE FUNCTION generate_multi_kanji_compounds()
RETURNS TABLE(
    compounds_created INT,
    total_compounds INT
) AS $$
DECLARE
    v_created INT := 0;
    v_total INT := 0;
BEGIN
    WITH kanji_list AS (
        SELECT
            id,
            "character",
            jlpt,
            ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM kanji
        WHERE "character" ~ '[\u4E00-\u9FFF]'
          AND "character" IS NOT NULL
    ),
    kanji_stats AS (
        SELECT COUNT(*) AS total_kanji FROM kanji_list
    ),
    sample_requests AS (
        SELECT
            gs AS sample_id,
            CASE (gs % 3)
                WHEN 1 THEN 2
                WHEN 2 THEN 3
                ELSE 4
            END AS compound_length
        FROM generate_series(1, 1000) gs
    ),
    expanded_samples AS (
        SELECT
            sr.sample_id,
            sr.compound_length,
            pos,
            ((sr.sample_id * 37 + pos * 11) % GREATEST(ks.total_kanji, 1)) + 1 AS target_rn
        FROM sample_requests sr
        CROSS JOIN kanji_stats ks
        CROSS JOIN LATERAL generate_series(1, sr.compound_length) AS pos
    ),
    sample_characters AS (
        SELECT
            es.sample_id,
            es.pos,
            kl."character",
            kl.jlpt
        FROM expanded_samples es
        JOIN kanji_list kl ON kl.rn = es.target_rn
    ),
    candidate_compounds AS (
        SELECT
            sc.sample_id,
            array_agg(sc."character" ORDER BY sc.pos) AS chars,
            COALESCE(MIN(sc.jlpt) FILTER (WHERE sc.jlpt IS NOT NULL), 0) AS jlpt_level
        FROM sample_characters sc
        GROUP BY sc.sample_id
    ),
    formatted_compounds AS (
        SELECT
            array_to_string(chars, '') AS kanji,
            array_to_string(chars, 'の') AS kana,
            'compound: ' || array_to_string(chars, ' + ') AS english,
            jlpt_level
        FROM candidate_compounds
    ),
    new_compounds AS (
        SELECT fc.*
        FROM formatted_compounds fc
        LEFT JOIN words w ON w.kanji = fc.kanji
        WHERE w.id IS NULL
    )
    INSERT INTO words (kanji, kana, english, part_of_speech, jlpt)
    SELECT kanji, kana, english, 'expression'::pos_enum, jlpt_level
    FROM new_compounds
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_created = ROW_COUNT;

    SELECT COUNT(*) INTO v_total
    FROM words
    WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$';

    RAISE NOTICE 'Generated % multi-kanji compounds, Total %', v_created, v_total;
    RETURN QUERY SELECT v_created, v_total;
END;
$$ LANGUAGE plpgsql;

/* ================================================================
WORD-KANJI RELATIONS WIRING
================================================================ */

-- Wire item_relations for multi-kanji words only (2-4 kanji)
-- Creates one relation per constituent kanji with position tracking
CREATE OR REPLACE FUNCTION wire_word_kanji_relations()
RETURNS TABLE(
    relations_created INT,
    total_relations INT
) AS $$
DECLARE
    v_created INT := 0;
    v_total INT := 0;
BEGIN
    -- Create item_relations entries for words with 2-4 kanji
    WITH word_kanji_positions AS (
        SELECT
            w.id as word_id,
            k.id as kanji_id,
            ROW_NUMBER() OVER (PARTITION BY w.id ORDER BY pos) as position
        FROM words w
        CROSS JOIN LATERAL (
            SELECT 
                substring(w.kanji FROM pos FOR 1) as char,
                pos
            FROM generate_series(1, length(w.kanji)) as pos
            WHERE substring(w.kanji FROM pos FOR 1) ~ '[\u4E00-\u9FFF]'
        ) chars
        JOIN kanji k ON k."character" = chars.char
        WHERE w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'  -- Only 2-4 kanji words
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 
        'word'::TEXT,
        word_id,
        'USES_KANJI'::relation_enum,
        'kanji'::TEXT,
        kanji_id,
        position
    FROM word_kanji_positions
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_created = ROW_COUNT;

    -- Count total relations for multi-kanji words
    SELECT COUNT(*) INTO v_total
    FROM item_relations
    WHERE rel_type = 'USES_KANJI'::relation_enum
      AND from_type = 'word'
      AND EXISTS (
        SELECT 1 FROM words w
        WHERE w.id = item_relations.from_id
          AND w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
      );

    RAISE NOTICE 'Created % word-kanji relations, Total % for multi-kanji words', v_created, v_total;
    RETURN QUERY SELECT v_created, v_total;
END;
$$ LANGUAGE plpgsql;

/* ================================================================
VERIFICATION HELPER
================================================================ */

-- Verify that all multi-kanji words have complete relation sets
CREATE OR REPLACE FUNCTION verify_word_kanji_relations()
RETURNS TABLE(
    total_multi_kanji_words INT,
    words_with_relations INT,
    words_without_relations INT,
    sample_verified_word TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH multi_kanji_words AS (
        SELECT id, kanji, char_length(kanji) AS expected_relations
        FROM words
        WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
    ),
    relation_counts AS (
        SELECT
            ir.from_id AS word_id,
            COUNT(*) AS relation_count
        FROM item_relations ir
        WHERE ir.from_type = 'word'
          AND ir.rel_type = 'USES_KANJI'
        GROUP BY ir.from_id
    ),
    summary AS (
        SELECT
            COUNT(*) AS total_words,
            COUNT(*) FILTER (
                WHERE COALESCE(rc.relation_count, 0) = mw.expected_relations
            ) AS complete_words,
            COUNT(*) FILTER (
                WHERE COALESCE(rc.relation_count, 0) <> mw.expected_relations
            ) AS incomplete_words
        FROM multi_kanji_words mw
        LEFT JOIN relation_counts rc ON rc.word_id = mw.id
    ),
    sample_word AS (
        SELECT mw.kanji
        FROM multi_kanji_words mw
        JOIN relation_counts rc ON rc.word_id = mw.id
        WHERE rc.relation_count = mw.expected_relations
        LIMIT 1
    )
    SELECT
        COALESCE((SELECT total_words FROM summary), 0)::INT,
        COALESCE((SELECT complete_words FROM summary), 0)::INT,
        COALESCE((SELECT incomplete_words FROM summary), 0)::INT,
        (SELECT kanji FROM sample_word LIMIT 1)::TEXT;
END;
$$ LANGUAGE plpgsql;
