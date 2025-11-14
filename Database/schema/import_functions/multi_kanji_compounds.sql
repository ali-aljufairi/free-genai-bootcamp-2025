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
    -- Generate 2-4 kanji compounds from existing kanji
    WITH kanji_list AS (
        SELECT id, "character", jlpt 
        FROM kanji 
        WHERE "character" ~ '[\u4E00-\u9FFF]'
          AND "character" IS NOT NULL
    ),
    compound_pairs AS (
        SELECT DISTINCT
            k1."character" as char1,
            k2."character" as char2,
            CASE 
                WHEN k1.jlpt IS NOT NULL AND k2.jlpt IS NOT NULL 
                THEN LEAST(k1.jlpt, k2.jlpt)
                ELSE COALESCE(k1.jlpt, k2.jlpt, 0)
            END as compound_jlpt
        FROM kanji_list k1
        CROSS JOIN kanji_list k2
        WHERE k1.id < k2.id
    ),
    new_compounds AS (
        SELECT DISTINCT
            cp.char1 || cp.char2 as kanji,
            cp.char1 || 'の' || cp.char2 as kana,
            'compound: ' || cp.char1 || ' + ' || cp.char2 as english,
            'expression'::pos_enum as pos,
            cp.compound_jlpt as jlpt_level
        FROM compound_pairs cp
        LEFT JOIN words w ON w.kanji = cp.char1 || cp.char2
        WHERE w.id IS NULL  -- Only insert if not already exists
        LIMIT 1000  -- Limit to prevent excessive generation
    )
    INSERT INTO words (kanji, kana, english, part_of_speech, jlpt)
    SELECT kanji, kana, english, pos, jlpt_level
    FROM new_compounds
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_created = ROW_COUNT;

    -- Count total compounds
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
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id) DO NOTHING;

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
        SELECT id, kanji
        FROM words
        WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
    ),
    words_with_rels AS (
        SELECT DISTINCT m.id
        FROM multi_kanji_words m
        JOIN item_relations ir ON ir.from_id = m.id 
          AND ir.from_type = 'word'
          AND ir.rel_type = 'USES_KANJI'
    ),
    sample_word AS (
        SELECT m.kanji
        FROM multi_kanji_words m
        JOIN words_with_rels w ON m.id = w.id
        LIMIT 1
    )
    SELECT
        (SELECT COUNT(*) FROM multi_kanji_words)::INT,
        (SELECT COUNT(*) FROM words_with_rels)::INT,
        ((SELECT COUNT(*) FROM multi_kanji_words) - (SELECT COUNT(*) FROM words_with_rels))::INT,
        (SELECT kanji FROM sample_word LIMIT 1)::TEXT;
END;
$$ LANGUAGE plpgsql;
