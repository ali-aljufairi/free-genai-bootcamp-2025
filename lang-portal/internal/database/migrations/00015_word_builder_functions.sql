-- +goose Up
-- +goose StatementBegin

-- Word Builder Kanji Chain Functions
-- Functions and views to support 6-kanji chain building for Word Builder game
-- This moves heavy graph traversal computation from Go backend to PostgreSQL

/* ================================================================
KANJI ADJACENCY MAP (Materialized View)
================================================================ */

-- Materialized view that pre-computes kanji → word → neighbor kanji relationships
-- This eliminates the need for Go-side caching and adjacency map building
CREATE MATERIALIZED VIEW IF NOT EXISTS kanji_adjacency_map AS
WITH
    kanji_words AS (
        SELECT
            ir.to_id AS kanji_id,
            ir.from_id AS word_id,
            array_agg(DISTINCT ir2.to_id) AS neighbor_kanji_ids,
            k.jlpt AS kanji_jlpt
        FROM
            item_relations ir
            JOIN item_relations ir2 ON ir2.from_id = ir.from_id
            AND ir2.rel_type = 'USES_KANJI'
            AND ir2.to_type = 'kanji'
            JOIN words w ON w.id = ir.from_id
            JOIN kanji k ON k.id = ir.to_id
        WHERE
            ir.rel_type = 'USES_KANJI'
            AND ir.to_type = 'kanji'
            AND ir2.to_type = 'kanji'
            AND w.kanji IS NOT NULL
            AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
            AND LENGTH(w.kanji) BETWEEN 2 AND 4
            -- Removed frequency requirement to include all kanji used in words
        GROUP BY
            ir.to_id,
            ir.from_id,
            k.jlpt
    )
SELECT
    kanji_id,
    word_id,
    neighbor_kanji_ids,
    kanji_jlpt
FROM kanji_words;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_kanji_adjacency_kanji_id ON kanji_adjacency_map (kanji_id);

CREATE INDEX IF NOT EXISTS idx_kanji_adjacency_jlpt ON kanji_adjacency_map (kanji_jlpt);

CREATE INDEX IF NOT EXISTS idx_kanji_adjacency_kanji_jlpt ON kanji_adjacency_map (kanji_id, kanji_jlpt);

-- Unique index required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_kanji_adjacency_unique ON kanji_adjacency_map (kanji_id, word_id);

-- Function to refresh the materialized view
-- Should be called after data imports or periodically
-- Drops and recreates the view to ensure it uses the latest definition
CREATE OR REPLACE FUNCTION refresh_kanji_adjacency_map()
RETURNS void AS $$
BEGIN
    -- Drop existing view and recreate with latest definition
    DROP MATERIALIZED VIEW IF EXISTS kanji_adjacency_map CASCADE;
    
    CREATE MATERIALIZED VIEW kanji_adjacency_map AS
    WITH
        kanji_words AS (
            SELECT
                ir.to_id AS kanji_id,
                ir.from_id AS word_id,
                array_agg(DISTINCT ir2.to_id) AS neighbor_kanji_ids,
                k.jlpt AS kanji_jlpt
            FROM
                item_relations ir
                JOIN item_relations ir2 ON ir2.from_id = ir.from_id
                AND ir2.rel_type = 'USES_KANJI'
                AND ir2.to_type = 'kanji'
                JOIN words w ON w.id = ir.from_id
                JOIN kanji k ON k.id = ir.to_id
            WHERE
                ir.rel_type = 'USES_KANJI'
                AND ir.to_type = 'kanji'
                AND ir2.to_type = 'kanji'
                AND w.kanji IS NOT NULL
                AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
                AND LENGTH(w.kanji) BETWEEN 2 AND 4
            GROUP BY
                ir.to_id,
                ir.from_id,
                k.jlpt
        )
    SELECT
        kanji_id,
        word_id,
        neighbor_kanji_ids,
        kanji_jlpt
    FROM kanji_words;
    
    -- Recreate indexes
    CREATE INDEX idx_kanji_adjacency_kanji_id ON kanji_adjacency_map (kanji_id);
    CREATE INDEX idx_kanji_adjacency_jlpt ON kanji_adjacency_map (kanji_jlpt);
    CREATE INDEX idx_kanji_adjacency_kanji_jlpt ON kanji_adjacency_map (kanji_id, kanji_jlpt);
    CREATE UNIQUE INDEX idx_kanji_adjacency_unique ON kanji_adjacency_map (kanji_id, word_id);
    
    RAISE NOTICE 'Kanji adjacency map refreshed (recreated with latest definition)';
END;
$$ LANGUAGE plpgsql;

COMMENT ON MATERIALIZED VIEW kanji_adjacency_map IS 'Pre-computed kanji adjacency map: for each kanji, stores which words contain it and which other kanji those words introduce. Used by Word Builder chain building.';

COMMENT ON FUNCTION refresh_kanji_adjacency_map () IS 'Refresh the kanji_adjacency_map materialized view. Should be called after data imports.';

/* ================================================================
KANJI CHAIN BUILDING FUNCTION
================================================================ */

-- Function to build a chain of 6 kanji by traversing word relationships
-- Uses recursive CTE to traverse kanji → word → kanji graph
CREATE OR REPLACE FUNCTION build_kanji_chain(
    p_jlpt_level INT,
    p_target_count INT DEFAULT 6,
    p_exclude_ids BIGINT[] DEFAULT ARRAY[]::BIGINT[]
)
RETURNS BIGINT[] AS $$
DECLARE
    v_kanji_chain BIGINT[] := ARRAY[]::BIGINT[];
    v_seed_kanji_id BIGINT;
    v_current_kanji_id BIGINT;
    v_next_kanji_id BIGINT;
    v_word_id BIGINT;
    v_attempts INT := 0;
    v_max_attempts INT := 10;  -- Increased from 5 to give more chances
    v_jlpt_min INT;
    v_jlpt_max INT;
    v_word_count INT;
BEGIN
    -- Log function call
    RAISE NOTICE 'build_kanji_chain called: jlpt_level=%, target_count=%, exclude_ids=%', 
        p_jlpt_level, p_target_count, p_exclude_ids;
    
    -- Calculate JLPT range (allow ±1 level flexibility)
    v_jlpt_min := GREATEST(1, p_jlpt_level - 1);
    v_jlpt_max := LEAST(5, p_jlpt_level + 1);
    RAISE NOTICE 'JLPT range: % to %', v_jlpt_min, v_jlpt_max;
    
    -- Try up to max_attempts times to build a chain
    WHILE v_attempts < v_max_attempts AND array_length(v_kanji_chain, 1) < p_target_count LOOP
        RAISE NOTICE 'Attempt % of %', v_attempts + 1, v_max_attempts;
        -- Reset chain for new attempt
        v_kanji_chain := ARRAY[]::BIGINT[];
        
        -- Pick seed kanji with good connectivity (high degree)
        -- Prefer kanji with many neighbors and frequency data
        -- Add randomization based on attempt number to avoid retrying same seed
        SELECT kam.kanji_id INTO v_seed_kanji_id
        FROM kanji_adjacency_map kam
        JOIN kanji k ON k.id = kam.kanji_id
        WHERE kam.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
          AND (kam.kanji_id != ALL(p_exclude_ids))
          AND k.frequency IS NOT NULL
        GROUP BY kam.kanji_id, k.frequency
        HAVING COUNT(DISTINCT kam.word_id) >= 2  -- At least 2 words
        ORDER BY 
            -- Add some randomization to avoid always picking same seed on retries
            (COUNT(DISTINCT kam.word_id) + (v_attempts * 17) % 5) DESC,
            k.frequency DESC NULLS LAST,
            RANDOM()  -- Additional randomization
        LIMIT 1;
        
        -- If no seed found, return empty array
        IF v_seed_kanji_id IS NULL THEN
            RAISE NOTICE 'No seed kanji found for JLPT % (range %-%)', p_jlpt_level, v_jlpt_min, v_jlpt_max;
            RETURN ARRAY[]::BIGINT[];
        END IF;
        
        RAISE NOTICE 'Seed kanji selected: %', v_seed_kanji_id;
        
        -- Start chain with seed
        v_kanji_chain := ARRAY[v_seed_kanji_id];
        v_current_kanji_id := v_seed_kanji_id;
        
        -- Build chain using recursive traversal
        WHILE array_length(v_kanji_chain, 1) < p_target_count LOOP
            -- Find next kanji: words containing current kanji → other kanji in those words
            -- Prefer words that use ONLY kanji already in chain + the new kanji (better mutual coverage)
            SELECT 
                kam2.kanji_id,
                kam.word_id
            INTO 
                v_next_kanji_id,
                v_word_id
            FROM kanji_adjacency_map kam
            JOIN kanji_adjacency_map kam2 
                ON kam2.word_id = kam.word_id
                AND kam2.kanji_id != kam.kanji_id  -- Don't select current kanji as neighbor
            JOIN kanji k ON k.id = kam2.kanji_id
            JOIN words w ON w.id = kam.word_id
            -- Check if this word uses ONLY kanji from current chain + the candidate
            LEFT JOIN LATERAL (
                SELECT array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) AS word_kanji_set
                FROM item_relations ir
                WHERE ir.from_id = w.id
                    AND ir.rel_type = 'USES_KANJI'
                    AND ir.to_type = 'kanji'
            ) word_kanji ON true
            WHERE kam.kanji_id = v_current_kanji_id
              AND kam.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
              AND kam2.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
              AND (kam2.kanji_id != ALL(v_kanji_chain))  -- Not already in chain
              AND (kam2.kanji_id != ALL(p_exclude_ids))   -- Not excluded
              AND k.frequency IS NOT NULL
              AND k.jlpt BETWEEN v_jlpt_min AND v_jlpt_max  -- Also check actual kanji JLPT
            -- Prefer words that use ONLY kanji from current chain + new kanji (better coverage)
            -- This ensures we build chains with good mutual word coverage
            AND (
                word_kanji.word_kanji_set <@ (v_kanji_chain || ARRAY[kam2.kanji_id])  -- Word uses only chain kanji
                OR array_length(v_kanji_chain, 1) >= p_target_count - 2  -- Last 2 kanji: allow any
            )
            -- Prefer neighbors with good future expansion potential (but don't require it for all hops)
            AND (
                array_length(v_kanji_chain, 1) >= p_target_count - 2  -- Last 2 kanji: allow any neighbor
                OR EXISTS (
                    SELECT 1
                    FROM kanji_adjacency_map kam3
                    WHERE kam3.kanji_id = kam2.kanji_id
                      AND kam3.kanji_jlpt BETWEEN v_jlpt_min AND v_jlpt_max
                    GROUP BY kam3.kanji_id
                    HAVING COUNT(DISTINCT kam3.word_id) >= 2
                )
            )
            ORDER BY 
                CASE WHEN word_kanji.word_kanji_set <@ (v_kanji_chain || ARRAY[kam2.kanji_id]) THEN 0 ELSE 1 END,  -- Prefer words using only chain kanji
                k.frequency DESC NULLS LAST
            LIMIT 1;
            
            -- If no next kanji found, we've hit a dead end
            IF v_next_kanji_id IS NULL THEN
                RAISE NOTICE 'Dead end at kanji % (chain length: %)', v_current_kanji_id, array_length(v_kanji_chain, 1);
                EXIT;  -- Break inner loop, will retry with new seed
            END IF;
            
            -- Add to chain
            v_kanji_chain := array_append(v_kanji_chain, v_next_kanji_id);
            v_current_kanji_id := v_next_kanji_id;
            RAISE NOTICE 'Added kanji % to chain (length: %)', v_next_kanji_id, array_length(v_kanji_chain, 1);
        END LOOP;
        
        -- If we got enough kanji, validate mutual word coverage before returning
        IF array_length(v_kanji_chain, 1) >= p_target_count THEN
            RAISE NOTICE 'Chain built with % kanji: %', array_length(v_kanji_chain, 1), v_kanji_chain;
            
            -- Check if the final chain has mutual word coverage
            -- At least one word should use MULTIPLE kanji (2+) from the chain
            -- This ensures the kanji actually form words together, not just individually
            SELECT COUNT(*) INTO v_word_count
            FROM (
                SELECT ir.from_id AS word_id,
                    array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) AS word_kanji_set
                FROM item_relations ir
                WHERE ir.from_type = 'word'
                    AND ir.rel_type = 'USES_KANJI'
                    AND ir.to_type = 'kanji'
                    AND ir.to_id::BIGINT = ANY(v_kanji_chain)
                GROUP BY ir.from_id
                HAVING array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) <@ v_kanji_chain
                    AND cardinality(array_agg(DISTINCT ir.to_id::BIGINT)) >= 2  -- Require at least 2 kanji
            ) valid_words;
            
            RAISE NOTICE 'Validation: found % valid words (with 2+ kanji) for chain', v_word_count;
            
            -- If we found at least 1 valid word with multiple kanji, return the chain
            IF v_word_count > 0 THEN
                RAISE NOTICE 'Returning valid chain: %', v_kanji_chain;
                RETURN v_kanji_chain;
            ELSE
                RAISE NOTICE 'Chain has no valid words with 2+ kanji, retrying... (attempt %)', v_attempts + 1;
            END IF;
        ELSE
            RAISE NOTICE 'Chain incomplete: only % kanji (target: %)', array_length(v_kanji_chain, 1), p_target_count;
        END IF;
        
        -- Otherwise, increment attempts and try again
        v_attempts := v_attempts + 1;
    END LOOP;
    
    -- Return whatever we got (might be less than target if all attempts failed)
    IF array_length(v_kanji_chain, 1) > 0 THEN
        RAISE NOTICE 'Returning partial chain after % attempts: %', v_attempts, v_kanji_chain;
    ELSE
        RAISE NOTICE 'Failed to build chain after % attempts', v_attempts;
    END IF;
    RETURN v_kanji_chain;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_kanji_chain (INT, INT, BIGINT[]) IS 'Build a chain of kanji by traversing word relationships. Returns array of kanji IDs. Uses recursive graph traversal to find connected kanji through shared words.';

/* ================================================================
HELPER FUNCTION: Get Kanji Degree (connectivity)
================================================================ */

-- Helper function to get the degree (number of neighbors) for a kanji
-- Useful for seed selection and debugging
CREATE OR REPLACE FUNCTION get_kanji_degree(
    p_kanji_id BIGINT,
    p_jlpt_min INT DEFAULT 1,
    p_jlpt_max INT DEFAULT 5
)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT kam.word_id)
        FROM kanji_adjacency_map kam
        WHERE kam.kanji_id = p_kanji_id
          AND kam.kanji_jlpt BETWEEN p_jlpt_min AND p_jlpt_max
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_kanji_degree (BIGINT, INT, INT) IS 'Get the degree (number of connected words) for a kanji. Higher degree = more connectivity = better seed candidate.';

/* ================================================================
INITIALIZATION
================================================================ */

-- Note: The materialized view will be empty until refresh_kanji_adjacency_map() is called
-- This should be called after graph relationships are built (item_relations populated)
-- The import client will call this automatically after buildGraphRelationships()
--
-- To manually refresh the view:
-- SELECT refresh_kanji_adjacency_map();

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

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS verify_word_kanji_relations() CASCADE;
DROP FUNCTION IF EXISTS wire_word_kanji_relations() CASCADE;
DROP FUNCTION IF EXISTS generate_multi_kanji_compounds() CASCADE;
DROP FUNCTION IF EXISTS refresh_kanji_adjacency_map() CASCADE;

-- +goose StatementEnd