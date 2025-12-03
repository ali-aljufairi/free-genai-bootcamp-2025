-- +goose Up
-- +goose StatementBegin

-- Graph Relationship System Functions
-- Functions to build and maintain kanji-word-grammar relationship graph

/* ================================================================
GRAPH RELATIONSHIP BUILDING FUNCTIONS
================================================================ */

-- Function to create kanji-word relationships (multi-kanji words only)
-- Only creates relations for words with 2-4 kanji characters
CREATE OR REPLACE FUNCTION build_kanji_word_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create USES_KANJI relationships for multi-kanji words only
    -- Skip single-kanji words as they're not needed for the use case
    WITH kanji_word_pairs AS (
        SELECT DISTINCT w.id as word_id, k.id as kanji_id
        FROM words w
        JOIN kanji k ON w.kanji LIKE '%' || k."character" || '%'
        WHERE w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'  -- Only 2-4 kanji words
          AND k."character" IS NOT NULL
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'word'::TEXT, word_id, 'USES_KANJI'::relation_enum, 'kanji'::TEXT, kanji_id, 0
    FROM kanji_word_pairs
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'USES_KANJI'::relation_enum;

    RAISE NOTICE 'Kanji-word relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to create word-word relationships (synonyms, related words)
-- This analyzes part of speech and JLPT level for relationship detection
CREATE OR REPLACE FUNCTION build_word_word_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create SIMILAR_TO relationships between words with same part of speech and JLPT level
    WITH similar_words AS (
        SELECT DISTINCT
            w1.id as word1_id,
            w2.id as word2_id
        FROM words w1
        JOIN words w2 ON w1.part_of_speech = w2.part_of_speech
            AND w1.jlpt = w2.jlpt
            AND w1.id < w2.id  -- Prevent duplicates
        WHERE w1.part_of_speech != 'unclassified'::pos_enum
          AND w1.jlpt > 0
          AND w2.jlpt > 0
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'word'::TEXT, word1_id, 'SIMILAR_TO'::relation_enum, 'word'::TEXT, word2_id, 0
    FROM similar_words
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'SIMILAR_TO'::relation_enum;

    RAISE NOTICE 'Word-word relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to create kanji-kanji relationships (shared components)
CREATE OR REPLACE FUNCTION build_kanji_kanji_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create SIMILAR_TO relationships between kanji with shared components
    -- Extract components from the 'components' field and match kanji
    WITH component_matches AS (
        SELECT DISTINCT
            k1.id as kanji1_id,
            k2.id as kanji2_id
        FROM kanji k1
        JOIN kanji k2 ON k1.components IS NOT NULL
            AND k2."character" IS NOT NULL
            AND k1.components LIKE '%' || k2."character" || '%'
            AND k1.id < k2.id  -- Prevent duplicates
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'kanji'::TEXT, kanji1_id, 'SIMILAR_TO'::relation_enum, 'kanji'::TEXT, kanji2_id, 0
    FROM component_matches
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'SIMILAR_TO'::relation_enum
      AND from_type = 'kanji'::TEXT AND to_type = 'kanji'::TEXT;

    RAISE NOTICE 'Kanji-kanji relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to create word-grammar relationships
CREATE OR REPLACE FUNCTION build_word_grammar_relations()
RETURNS TABLE(
    relations_created INT,
    relationships_found INT
) AS $$
DECLARE
    v_relations_created INT := 0;
    v_relationships_found INT := 0;
BEGIN
    -- Create APPEARS_IN relationships: word -> grammar (word demonstrates this grammar pattern)
    -- This is based on JLPT level alignment
    WITH word_grammar_pairs AS (
        SELECT DISTINCT
            w.id as word_id,
            gp.id as grammar_id
        FROM words w
        JOIN grammar_points gp ON w.jlpt = CASE gp.level
            WHEN 'N1' THEN 1
            WHEN 'N2' THEN 2
            WHEN 'N3' THEN 3
            WHEN 'N4' THEN 4
            WHEN 'N5' THEN 5
            ELSE 0
        END
        WHERE w.jlpt > 0
          AND gp.level IS NOT NULL
    )
    INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
    SELECT 'word'::TEXT, word_id, 'APPEARS_IN'::relation_enum, 'grammar'::TEXT, grammar_id, 0
    FROM word_grammar_pairs
    ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING;

    GET DIAGNOSTICS v_relations_created = ROW_COUNT;

    -- Count total relationships found
    SELECT COUNT(*) INTO v_relationships_found
    FROM item_relations
    WHERE rel_type = 'APPEARS_IN'::relation_enum;

    RAISE NOTICE 'Word-grammar relations: Created %, Total %', v_relations_created, v_relationships_found;

    RETURN QUERY SELECT v_relations_created, v_relationships_found;
END;
$$ LANGUAGE plpgsql;

-- Function to build all graph relationships
CREATE OR REPLACE FUNCTION build_complete_graph()
RETURNS TABLE(
    stage TEXT,
    relations_created INT,
    total_relationships INT
) AS $$
DECLARE
    v_created INT;
    v_total INT;
BEGIN
    RAISE NOTICE 'Starting complete graph relationship build...';

    -- Clear existing relationships (optional - comment out if you want to preserve)
    -- TRUNCATE item_relations;

    -- Stage 1: Kanji-Word relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_kanji_word_relations() AS r;
    RETURN QUERY SELECT 'KANJI_WORD'::TEXT, v_created, v_total;

    -- Stage 2: Word-Word relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_word_word_relations() AS r;
    RETURN QUERY SELECT 'WORD_WORD'::TEXT, v_created, v_total;

    -- Stage 3: Kanji-Kanji relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_kanji_kanji_relations() AS r;
    RETURN QUERY SELECT 'KANJI_KANJI'::TEXT, v_created, v_total;

    -- Stage 4: Word-Grammar relationships
    SELECT r.relations_created, r.relationships_found INTO v_created, v_total
    FROM build_word_grammar_relations() AS r;
    RETURN QUERY SELECT 'WORD_GRAMMAR'::TEXT, v_created, v_total;

    RAISE NOTICE 'Graph relationship build completed!';
END;
$$ LANGUAGE plpgsql;

-- Function to get graph statistics
CREATE OR REPLACE FUNCTION get_graph_statistics()
RETURNS TABLE(
    relation_type TEXT,
    count BIGINT,
    from_type_breakdown TEXT,
    to_type_breakdown TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rel_type::TEXT,
        COUNT(*),
        string_agg(from_breakdown, ', ' ORDER BY from_breakdown),
        string_agg(to_breakdown, ', ' ORDER BY to_breakdown)
    FROM (
        SELECT
            rel_type,
            from_type || '(' || from_count::TEXT || ')' as from_breakdown,
            to_type || '(' || to_count::TEXT || ')' as to_breakdown,
            from_type,
            to_type
        FROM (
            SELECT
                rel_type,
                from_type,
                COUNT(DISTINCT from_id) as from_count,
                to_type,
                COUNT(DISTINCT to_id) as to_count
            FROM item_relations
            GROUP BY rel_type, from_type, to_type
        ) stats
    ) formatted
    GROUP BY rel_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get kanji-word relationships for a specific kanji
CREATE OR REPLACE FUNCTION get_kanji_words(kanji_char TEXT)
RETURNS TABLE(
    word_id INT,
    word TEXT,
    kana TEXT,
    english TEXT,
    jlpt INT,
    part_of_speech TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.kanji,
        w.kana,
        w.english,
        w.jlpt,
        w.part_of_speech::TEXT
    FROM item_relations ir
    JOIN kanji k ON ir.to_id = k.id AND ir.to_type = 'kanji'
    JOIN words w ON ir.from_id = w.id AND ir.from_type = 'word'
    WHERE k."character" = kanji_char
      AND ir.rel_type = 'USES_KANJI'::relation_enum
    ORDER BY w.jlpt, w.english;
END;
$$ LANGUAGE plpgsql;

-- Function to get related words
CREATE OR REPLACE FUNCTION get_related_words(word_id_param INT)
RETURNS TABLE(
    related_word_id INT,
    word TEXT,
    english TEXT,
    part_of_speech TEXT,
    jlpt INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.kanji,
        w.english,
        w.part_of_speech::TEXT,
        w.jlpt
    FROM item_relations ir
    JOIN words w ON ir.to_id = w.id AND ir.to_type = 'word'
    WHERE ir.from_id = word_id_param
      AND ir.from_type = 'word'
      AND ir.rel_type = 'SIMILAR_TO'::relation_enum
    ORDER BY w.jlpt, w.english;
END;
$$ LANGUAGE plpgsql;

-- Function to get words using specific kanji combination
CREATE OR REPLACE FUNCTION get_words_with_kanji(kanji_list TEXT[])
RETURNS TABLE(
    word_id INT,
    word TEXT,
    english TEXT,
    jlpt INT,
    kanji_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.kanji,
        w.english,
        w.jlpt,
        array_length(kanji_list, 1) as kanji_count
    FROM words w
    WHERE CASE WHEN array_length(kanji_list, 1) > 0 THEN
        EXISTS (
            SELECT 1 FROM item_relations ir
            JOIN kanji k ON ir.to_id = k.id
            WHERE ir.from_id = w.id
              AND ir.from_type = 'word'
              AND ir.rel_type = 'USES_KANJI'::relation_enum
              AND k."character" = ANY(kanji_list)
        )
    ELSE TRUE END
    ORDER BY w.jlpt, w.english;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION build_kanji_word_relations () IS 'Create USES_KANJI relationships between words and kanji they contain';

COMMENT ON FUNCTION build_word_word_relations () IS 'Create SIMILAR_TO relationships between words with same POS and JLPT level';

COMMENT ON FUNCTION build_kanji_kanji_relations () IS 'Create SIMILAR_TO relationships between kanji with shared components';

COMMENT ON FUNCTION build_word_grammar_relations () IS 'Create APPEARS_IN relationships between words and grammar patterns';

COMMENT ON FUNCTION build_complete_graph () IS 'Build all graph relationships in correct order';

COMMENT ON FUNCTION get_graph_statistics () IS 'Get statistics about graph relationships';

COMMENT ON FUNCTION get_kanji_words (TEXT) IS 'Get all words containing a specific kanji';

COMMENT ON FUNCTION get_related_words (INT) IS 'Get words similar to a given word';

COMMENT ON FUNCTION get_words_with_kanji (TEXT []) IS 'Get words containing any of the specified kanji';


-- Course Import Functions

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS get_words_with_kanji(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_related_words(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_kanji_words(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_graph_statistics() CASCADE;
DROP FUNCTION IF EXISTS build_complete_graph() CASCADE;
DROP FUNCTION IF EXISTS build_word_grammar_relations() CASCADE;
DROP FUNCTION IF EXISTS build_kanji_kanji_relations() CASCADE;
DROP FUNCTION IF EXISTS build_word_word_relations() CASCADE;
DROP FUNCTION IF EXISTS build_kanji_word_relations() CASCADE;

-- +goose StatementEnd