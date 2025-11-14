# Graph Relationship System - Implementation Guide

## Overview

The Graph Relationship System automatically discovers and maintains relationships between kanji, words, and grammar patterns in the Sorami language learning platform. It populates the `item_relations` table during the import process.

## Why It Was Empty

**Previous State:** The `item_relations` table existed but had no data because:
1. ❌ No functions to detect relationships between content
2. ❌ No mechanism in the import client to trigger relationship building
3. ❌ No visibility into what relationships should be created

**Root Cause:** The feature was designed but never implemented.

## Solution Implemented

### 1. Graph Building Functions (`graph_building_functions.sql`)

Four independent relationship builders, each creating specific types of connections:

#### `build_kanji_word_relations()`
Creates **USES_KANJI** relationships
- Analyzes each word's kanji field
- Matches characters against all kanji in database
- **Example:** 漢字 → uses 漢 AND uses 字

```sql
SELECT * FROM build_kanji_word_relations();
-- Returns: (relations_created INT, relationships_found INT)
```

#### `build_word_word_relations()`
Creates **SIMILAR_TO** relationships between words
- Groups words by part_of_speech enum
- Groups by JLPT level (1-5)
- **Example:** 食べる (eat/verb/N4) ↔ 飲む (drink/verb/N4)

```sql
SELECT * FROM build_word_word_relations();
```

#### `build_kanji_kanji_relations()`
Creates **SIMILAR_TO** relationships between kanji
- Extracts components from kanji.components field
- Matches shared components between kanji
- **Example:** 漢 shares component with 共

```sql
SELECT * FROM build_kanji_kanji_relations();
```

#### `build_word_grammar_relations()`
Creates **APPEARS_IN** relationships
- Links words to grammar patterns by JLPT level
- **Example:** N4 words ↔ N4 grammar patterns

```sql
SELECT * FROM build_word_grammar_relations();
```

#### `build_complete_graph()`
Orchestrates all four builders in sequence
- Runs each builder
- Tracks results
- Logs progress

```sql
SELECT * FROM build_complete_graph();
-- Returns: (stage TEXT, relations_created INT, total_relationships INT)
```

### 2. Import Client Integration

Updated `import-client/main.go` to call graph building after data import:

```go
// 4. Build graph relationships
log.Println("Building graph relationships...")
if err := buildGraphRelationships(db); err != nil {
    log.Printf("Warning: Failed to build graph relationships: %v", err)
} else {
    log.Println("Graph relationships built successfully!")
}
```

The `buildGraphRelationships()` function:
- Calls `build_complete_graph()` PostgreSQL function
- Displays progress for each stage
- Shows final statistics

**Sample Output:**
```
Building graph relationships...
  KANJI_WORD: Created 5432 relations, Total 5432
  WORD_WORD: Created 8234 relations, Total 8234
  KANJI_KANJI: Created 1203 relations, Total 1203
  WORD_GRAMMAR: Created 3421 relations, Total 3421

Graph Statistics:
  USES_KANJI: 5432 total (from: word(2156), to: kanji(1043))
  SIMILAR_TO: 9437 total (from: word(2156), kanji(892), to: word(2156), kanji(892))
  APPEARS_IN: 3421 total (from: word(2156), to: grammar(234))
```

### 3. Query Functions

Three utility functions to query the graph:

#### `get_kanji_words(kanji_char TEXT)`
Returns all words containing a specific kanji

```sql
SELECT * FROM get_kanji_words('漢');
-- Returns: word_id, word, kana, english, jlpt, part_of_speech
```

#### `get_related_words(word_id_param INT)`
Returns words similar to a given word

```sql
SELECT * FROM get_related_words(123);
-- Returns: related_word_id, word, english, part_of_speech, jlpt
```

#### `get_words_with_kanji(kanji_list TEXT[])`
Returns words containing any of the specified kanji

```sql
SELECT * FROM get_words_with_kanji(ARRAY['漢', '字']);
-- Returns: word_id, word, english, jlpt, kanji_count
```

#### `get_graph_statistics()`
Returns statistics about relationships

```sql
SELECT * FROM get_graph_statistics();
-- Returns: relation_type, count, from_type_breakdown, to_type_breakdown
```

## Complete Import Flow

```
┌─────────────────────────────────────────┐
│ 1. Docker Initialization                │
│    ↓                                    │
│ 2. Database Schema (pg.sql)             │
│    ↓                                    │
│ 3. Migrations & Setup                   │
│    ↓                                    │
│ 4. Import Functions                     │
│    • JSON extraction                    │
│    • Text processing                    │
│    • Validation                         │
│    • Core imports                       │
│    • JLPT questions                     │
│    • Courses & units                    │
│    • Data quality                       │
│    • ✅ GRAPH BUILDING (NEW)            │
│    ↓                                    │
│ 5. Other Functions & Indexes            │
└─────────────────────────────────────────┘
         Database Ready ✅
             ↓
┌──────────────────────────────────────┐
│ 6. Import Client (Go)                │
│    ↓                                 │
│ 7. Load Kanji Data                   │
│    Load Kanji SVG Strokes            │
│    Create Kanji Groups               │
│    ↓                                 │
│ 8. Load Words Data                   │
│    Create Word Groups                │
│    ↓                                 │
│ 9. Load Grammar Data                 │
│    Load Example Sentences             │
│    ↓                                 │
│ 10. Load JLPT Questions              │
│     Load Books & Units               │
│     ↓                                │
│ 11. ✅ BUILD GRAPH (NEW)             │
│     ↓ build_complete_graph()         │
│     ├─ Kanji-Word relationships      │
│     ├─ Word-Word relationships       │
│     ├─ Kanji-Kanji relationships     │
│     └─ Word-Grammar relationships    │
│                                      │
│     Result: item_relations populated │
└──────────────────────────────────────┘
     Import Complete! ✅
```

## Execution

### During Docker Setup
The graph building functions are automatically loaded as part of the initialization scripts:

```dockerfile
COPY ../schema/import_functions/graph_building_functions.sql \
    /docker-entrypoint-initdb.d/13-graph-building-functions.sql
```

### During Data Import
```bash
cd import-client
go run main.go
```

The import client automatically:
1. Imports all content data
2. Creates word/kanji groups
3. **Builds graph relationships** ← New!
4. Displays statistics

### Manual Graph Rebuild
If you need to rebuild the graph after import:

```sql
-- Clear existing relationships (optional)
TRUNCATE item_relations;

-- Rebuild everything
SELECT * FROM build_complete_graph();

-- Check results
SELECT * FROM get_graph_statistics();
```

## Querying the Graph

### Example Queries

```sql
-- Find all words containing 漢
SELECT word, english, jlpt FROM get_kanji_words('漢');

-- Find words similar to '食べる'
SELECT * FROM get_related_words(123);

-- Find words containing any of these kanji
SELECT * FROM get_words_with_kanji(ARRAY['漢', '字', '用']);

-- Show graph statistics
SELECT * FROM get_graph_statistics();

-- Raw SQL: Find kanji-word relationships
SELECT k.character, COUNT(*) as word_count
FROM item_relations ir
JOIN kanji k ON ir.to_id = k.id
WHERE ir.rel_type = 'USES_KANJI'::relation_enum
GROUP BY k.character
ORDER BY word_count DESC;
```

## Performance Considerations

### Indexes Already Created
```sql
CREATE INDEX idx_rel_from ON item_relations (from_type, from_id);
CREATE INDEX idx_rel_to ON item_relations (to_type, to_id);
```

These are automatically created in `pg.sql` and support all graph queries efficiently.

### Expected Data Sizes
- **Kanji-Word Relations:** ~5,000-10,000 relationships
- **Word-Word Relations:** ~5,000-15,000 relationships
- **Kanji-Kanji Relations:** ~1,000-3,000 relationships
- **Word-Grammar Relations:** ~2,000-5,000 relationships

**Total:** ~15,000-35,000 relationships depending on data size

## Future Enhancements

### 1. Relationship Strength
Add a `strength` field to weight relationships:
- More connections = stronger relationship
- User mastery patterns can influence strength

### 2. Community Detection
Identify clusters of related content:
- Find "topic clusters" of related words
- Group kanji by component families

### 3. Recommendation Engine
Use graph traversal to suggest next items:
- "After learning this kanji, learn these words"
- "This grammar pattern uses these words"

### 4. Spaced Repetition Enhancement
Use graph relationships in SRS:
- Review related words together
- Build kanji families as units

## Troubleshooting

### Graph is Empty
1. Check import client log for graph building output
2. Verify data was imported (check kanji, words, grammar counts)
3. Run `SELECT COUNT(*) FROM item_relations;`
4. Manually trigger: `SELECT * FROM build_complete_graph();`

### Slow Graph Queries
1. Verify indexes exist: `\di item_relations*`
2. Run `ANALYZE item_relations;` to update statistics
3. Check relationship counts: `SELECT COUNT(*) FROM item_relations GROUP BY rel_type;`

### Missing Relationships
1. Check data quality: are kanji fields populated in words?
2. Verify JLPT levels are set correctly
3. Check part_of_speech enum values in words table

## References

- Schema: `/schema/pg.sql` (item_relations table)
- Functions: `/schema/import_functions/graph_building_functions.sql`
- Import Client: `/import-client/main.go` (buildGraphRelationships function)
- Documentation: `/database_features/06_graph_relationship_system.md`