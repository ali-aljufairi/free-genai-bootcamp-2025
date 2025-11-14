-- Graph Relationship Indexes
-- Indexes for optimizing graph relationship queries

-- Index for kanji-word relationships (USES_KANJI)
-- Optimizes queries that find words using specific kanji
CREATE INDEX IF NOT EXISTS idx_rel_to_kanji_uses
ON item_relations (to_type, to_id, rel_type, from_type)
WHERE to_type = 'kanji' AND rel_type = 'USES_KANJI';

-- Index for word-kanji relationships (USES_KANJI)
-- Optimizes queries that find kanji used by specific words
CREATE INDEX IF NOT EXISTS idx_rel_from_word_uses
ON item_relations (from_type, from_id, rel_type, to_type)
WHERE from_type = 'word' AND rel_type = 'USES_KANJI';

-- Index for similar relationships (SIMILAR_TO)
-- Optimizes queries finding similar words or kanji
CREATE INDEX IF NOT EXISTS idx_rel_similar_to
ON item_relations (rel_type, from_type, to_type)
WHERE rel_type = 'SIMILAR_TO';

-- Index for grammar relationships (APPEARS_IN)
-- Optimizes queries finding words that appear in grammar patterns
CREATE INDEX IF NOT EXISTS idx_rel_appears_in
ON item_relations (rel_type, to_type, to_id)
WHERE rel_type = 'APPEARS_IN' AND to_type = 'grammar';

-- Composite index for general relationship queries
-- Optimizes most common relationship lookups
CREATE INDEX IF NOT EXISTS idx_rel_composite
ON item_relations (rel_type, from_type, to_type, from_id, to_id);

-- Index for relationship type statistics
-- Optimizes queries that aggregate by relationship type
CREATE INDEX IF NOT EXISTS idx_rel_type_stats
ON item_relations (rel_type);