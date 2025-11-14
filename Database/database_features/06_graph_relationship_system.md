# Graph Relationship System Features

## Overview
Advanced graph database functionality built on PostgreSQL for discovering relationships between language learning content (kanji, words, grammar), enabling recommendations, connections, and network analysis.

## Core Tables
- `item_relations` - Flexible relationships between any content items (kanji ↔ words, kanji ↔ kanji, words ↔ grammar, etc.)

## Key Features

### 1. Automatic Graph Building

The graph is automatically populated during data import via the `build_complete_graph()` function, which creates relationships in these stages:

#### Stage 1: Kanji-Word Relationships (USES_KANJI)
```sql
-- Words that contain specific kanji
SELECT w.*, ir.rel_type
FROM item_relations ir
JOIN words w ON ir.from_id = w.id
JOIN kanji k ON ir.to_id = k.id
WHERE k."character" = '漢' 
  AND ir.rel_type = 'USES_KANJI';
```

**How it works:**
- Analyzes each word's kanji field
- Matches against all kanji characters
- Creates USES_KANJI relationship: word → kanji
- Example: 漢字 (kanji) contains 漢 and 字

#### Stage 2: Word-Word Relationships (SIMILAR_TO)
```sql
-- Words with same part of speech and JLPT level
SELECT w2.*, ir.rel_type
FROM item_relations ir
JOIN words w1 ON ir.from_id = w1.id
JOIN words w2 ON ir.to_id = w2.id
WHERE w1.id = 123
  AND ir.rel_type = 'SIMILAR_TO'
  AND ir.from_type = 'word'
ORDER BY w2.english;
```

**How it works:**
- Compares words with identical part_of_speech enum
- Groups by JLPT level (1-5)
- Creates SIMILAR_TO relationship: word ↔ word
- Example: 食べる (eat/verb/N4) ↔ 飲む (drink/verb/N4)

#### Stage 3: Kanji-Kanji Relationships (SIMILAR_TO)
```sql
-- Kanji with shared components
SELECT k2.*, COUNT(*) as shared_components
FROM item_relations ir
JOIN kanji k1 ON ir.from_id = k1.id
JOIN kanji k2 ON ir.to_id = k2.id
WHERE k1."character" = '漢'
  AND ir.rel_type = 'SIMILAR_TO'
  AND ir.from_type = 'kanji'
GROUP BY k2.id;
```

**How it works:**
- Extracts component characters from kanji.components field
- Matches components between kanji
- Creates SIMILAR_TO relationship: kanji ↔ kanji
- Example: 漢 (kanji) shares 廾 with 共 (together)

#### Stage 4: Word-Grammar Relationships (APPEARS_IN)
```sql
-- Words that demonstrate grammar patterns
SELECT gp.*, ir.rel_type
FROM item_relations ir
JOIN words w ON ir.from_id = w.id
JOIN grammar_points gp ON ir.to_id = gp.id
WHERE w.id = 456
  AND ir.rel_type = 'APPEARS_IN'
ORDER BY gp.level;
```

**How it works:**
- Aligns words with grammar patterns by JLPT level
- Creates APPEARS_IN relationship: word → grammar
- Example: N4 words relate to N4 grammar patterns

## API Endpoints (Example)

### Graph Building
```javascript
// POST /api/graph/build - Build complete graph (run after import)
// GET /api/graph/stats - Get graph statistics
```

### Graph Queries
```javascript
// GET /api/graph/kanji/:character/words - Get all words containing a kanji
// GET /api/graph/word/:id/related - Get related words
// GET /api/graph/word/:id/kanji - Get kanji used in a word
// GET /api/graph/search - Search relationships
```

### Query Examples
```sql
-- Get all words containing kanji 漢
SELECT * FROM get_kanji_words('漢');

-- Get words similar to word #123
SELECT * FROM get_related_words(123);

-- Get words containing any of these kanji
SELECT * FROM get_words_with_kanji(ARRAY['漢', '字', '用']);

-- Get graph statistics
SELECT * FROM get_graph_statistics();
```

## Why Item_Relations Was Empty

**Root Cause:** The table had no automatic population mechanism. It was waiting for:
1. ✅ Data to be imported (kanji, words, grammar)
2. ✅ Relationship functions to be created
3. ✅ Import client to call the graph building function

**Solution Implemented:**
- Created `graph_building_functions.sql` with 4 relationship builders
- Updated import client to call `build_complete_graph()` after data import
- Added graph building to Dockerfile initialization sequence

## Complete Import Flow

```
1. Database initialization (pg.sql)
2. Migrations & functions setup
3. Hiragana conversion functions
4. JSON extraction & validation functions
5. Text processing functions
6. Validation functions
7. Core import functions
8. JLPT questions import functions
9. Course import functions
10. Comprehensive import functions
11. Data quality functions
12. ✅ GRAPH BUILDING FUNCTIONS (NEW)
13. User tracking functions
14. Indexes
15. SRS functions
16. Study activities
17. ↓
18. Import client runs:
    - Import kanji data
    - Import kanji SVG strokes
    - Create kanji groups by JLPT
    - Import words data
    - Create word groups by JLPT
    - Import grammar data
    - Import example sentences
    - Import JLPT questions
    - Import books and units
    - ✅ BUILD GRAPH RELATIONSHIPS (NEW)
```

## Graph Function Reference

### Building Functions

```sql
-- Build kanji-word relationships
SELECT * FROM build_kanji_word_relations();
-- Returns: (relations_created, relationships_found)

-- Build word-word relationships
SELECT * FROM build_word_word_relations();

-- Build kanji-kanji relationships
SELECT * FROM build_kanji_kanji_relations();

-- Build word-grammar relationships
SELECT * FROM build_word_grammar_relations();

-- Build all relationships at once
SELECT * FROM build_complete_graph();
-- Returns: (stage, relations_created, total_relationships) for each stage
```

### Query Functions

```sql
-- Get all words using a kanji
SELECT * FROM get_kanji_words('漢');
-- Returns: word_id, word, kana, english, jlpt, part_of_speech

-- Get words similar to given word
SELECT * FROM get_related_words(123);
-- Returns: related_word_id, word, english, part_of_speech, jlpt

-- Get words containing any of specified kanji
SELECT * FROM get_words_with_kanji(ARRAY['漢', '字']);
-- Returns: word_id, word, english, jlpt, kanji_count

-- Get graph statistics
SELECT * FROM get_graph_statistics();
-- Returns: relation_type, count, from_type_breakdown, to_type_breakdown
```

## Advanced Graph Features

### 1. Content Recommendations (Future Enhancement)
Based on user's mastered content, recommend related items they haven't learned:
```sql
-- Recommend kanji based on learned words
WITH learned_words AS (
    SELECT DISTINCT ir.to_id
    FROM item_relations ir
    JOIN words w ON ir.from_id = w.id
    WHERE w.jlpt <= $1  -- User's current level
      AND ir.rel_type = 'USES_KANJI'::relation_enum
)
SELECT k.*, COUNT(lw.to_id) as appears_in_words
FROM learned_words lw
JOIN kanji k ON lw.to_id = k.id
GROUP BY k.id
ORDER BY appears_in_words DESC;
```

### 2. Learning Path Generation
```sql
-- Find kanji progression path within a level
WITH ordered_kanji AS (
    SELECT id, "character", stroke_count,
           ROW_NUMBER() OVER (ORDER BY stroke_count, id) as learning_order
    FROM kanji
    WHERE jlpt = $1
)
SELECT * FROM ordered_kanji
ORDER BY learning_order;
```

### 3. Network Traversal
```sql
-- Find all content connected to a word within 2 degrees
WITH RECURSIVE word_network AS (
    -- Get kanji used in word
    SELECT ir.to_id, ir.to_type, 1 as depth
    FROM item_relations ir
    WHERE ir.from_id = $1 AND ir.from_type = 'word'
    
    UNION ALL
    
    -- Get words using those kanji
    SELECT ir.to_id, ir.to_type, wn.depth + 1
    FROM item_relations ir
    JOIN word_network wn ON ir.from_id = wn.to_id 
        AND ir.from_type = wn.to_type
    WHERE wn.depth < 2
)
SELECT DISTINCT to_id, to_type, MIN(depth) as closest_depth
FROM word_network
GROUP BY to_id, to_type
ORDER BY closest_depth;
```

### 4. Centrality Analysis
```sql
-- Find most connected kanji (used in most words)
SELECT ir.to_id, k."character", COUNT(*) as word_count
FROM item_relations ir
JOIN kanji k ON ir.to_id = k.id AND ir.to_type = 'kanji'
WHERE ir.rel_type = 'USES_KANJI'::relation_enum
GROUP BY ir.to_id, k."character"
ORDER BY word_count DESC
LIMIT 20;
``` 