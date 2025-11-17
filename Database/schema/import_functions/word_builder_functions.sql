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
            AND k.frequency IS NOT NULL
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
CREATE OR REPLACE FUNCTION refresh_kanji_adjacency_map()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY kanji_adjacency_map;
    RAISE NOTICE 'Kanji adjacency map refreshed';
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