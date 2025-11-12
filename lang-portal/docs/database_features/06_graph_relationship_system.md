# Graph Relationship System Features

## Overview
Advanced graph database functionality built on PostgreSQL for discovering relationships between language learning content, enabling recommendations, connections, and network analysis.

## Core Tables
- `item_relations` - Flexible relationships between any content items
- `grammar_relations` - Specific grammar pattern relationships
- `kanji_components` - Kanji component relationships
- `word_families` - Word family groupings

## Key Features

### 1. Flexible Item Relations
```sql
-- Get all relationships for an item
SELECT ir.*, 
       CASE ir.from_type 
         WHEN 'word' THEN w1.english
         WHEN 'kanji' THEN k1.character
         WHEN 'grammar' THEN gp1.key
       END as from_content,
       CASE ir.to_type 
         WHEN 'word' THEN w2.english
         WHEN 'kanji' THEN k2.character
         WHEN 'grammar' THEN gp2.key
       END as to_content
FROM item_relations ir
LEFT JOIN words w1 ON ir.from_type = 'word' AND ir.from_id = w1.id
LEFT JOIN kanji k1 ON ir.from_type = 'kanji' AND ir.from_id = k1.id
LEFT JOIN grammar_points gp1 ON ir.from_type = 'grammar' AND ir.from_id = gp1.id
LEFT JOIN words w2 ON ir.to_type = 'word' AND ir.to_id = w2.id
LEFT JOIN kanji k2 ON ir.to_type = 'kanji' AND ir.to_id = k2.id
LEFT JOIN grammar_points gp2 ON ir.to_type = 'grammar' AND ir.to_id = gp2.id
WHERE ir.from_id = $1 AND ir.from_type = $2;
```

### 2. Word Network Analysis
```sql
-- Find words that start with specific kanji
SELECT DISTINCT w.kanji, w.kana, w.english, w.jlpt
FROM words w
WHERE w.kanji LIKE $1 || '%'
ORDER BY w.jlpt, w.kanji;

-- Get related words (synonyms, antonyms, etc.)
SELECT w2.*, ir.rel_type, ir.strength
FROM item_relations ir
JOIN words w1 ON ir.from_id = w1.id
JOIN words w2 ON ir.to_id = w2.id
WHERE ir.from_type = 'word' AND ir.to_type = 'word'
  AND w1.id = $1
ORDER BY ir.strength DESC;
```

### 3. Grammar Pattern Connections
```sql
-- Get related grammar patterns
SELECT gp2.*, gr.rel_type, gr.explanation
FROM grammar_relations gr
JOIN grammar_points gp1 ON gr.from_grammar_id = gp1.id
JOIN grammar_points gp2 ON gr.to_grammar_id = gp2.id
WHERE gp1.id = $1
ORDER BY gr.strength DESC;

-- Find grammar patterns that commonly appear together
SELECT gp1.key as pattern1, gp2.key as pattern2, COUNT(*) as co_occurrence
FROM grammar_relations gr
JOIN grammar_points gp1 ON gr.from_grammar_id = gp1.id
JOIN grammar_points gp2 ON gr.to_grammar_id = gp2.id
WHERE gr.rel_type = 'co_occurs'
GROUP BY gp1.key, gp2.key
HAVING COUNT(*) > 1
ORDER BY co_occurrence DESC;
```

### 4. Kanji Component Analysis
```sql
-- Get kanji components and their relationships
SELECT k1.character as main_kanji, k2.character as component,
       kc.relationship_type, kc.position
FROM kanji_components kc
JOIN kanji k1 ON kc.kanji_id = k1.id
JOIN kanji k2 ON kc.component_id = k2.id
WHERE k1.character = $1
ORDER BY kc.position;

-- Find kanji with similar components
SELECT k2.character, COUNT(*) as shared_components
FROM kanji_components kc1
JOIN kanji_components kc2 ON kc1.component_id = kc2.component_id
JOIN kanji k1 ON kc1.kanji_id = k1.id
JOIN kanji k2 ON kc2.kanji_id = k2.id
WHERE k1.character = $1 AND k1.id != k2.id
GROUP BY k2.character
HAVING COUNT(*) >= 2
ORDER BY shared_components DESC;
```

### 5. Network Traversal
```sql
-- Find connected content within N degrees
WITH RECURSIVE content_network AS (
    -- Base case: starting item
    SELECT from_id, from_type, to_id, to_type, rel_type, 1 as depth
    FROM item_relations
    WHERE from_id = $1 AND from_type = $2
    
    UNION ALL
    
    -- Recursive case: find connected items
    SELECT ir.from_id, ir.from_type, ir.to_id, ir.to_type, ir.rel_type, cn.depth + 1
    FROM item_relations ir
    JOIN content_network cn ON ir.from_id = cn.to_id AND ir.from_type = cn.to_type
    WHERE cn.depth < $3
)
SELECT DISTINCT to_id, to_type, MIN(depth) as shortest_path
FROM content_network
GROUP BY to_id, to_type
ORDER BY shortest_path;
```

## API Endpoints (Example)

### Graph Queries
```javascript
// GET /api/graph/connections/:type/:id - Get item connections
// GET /api/graph/network/:type/:id - Get network within N degrees
// GET /api/graph/recommendations/:type/:id - Get recommendations
// POST /api/graph/search - Search relationships
```

### Network Analysis
```javascript
// GET /api/graph/centrality - Get most connected items
// GET /api/graph/clusters - Get content clusters
// GET /api/graph/paths/:from/:to - Find paths between items
// GET /api/graph/communities - Get content communities
```

## Advanced Graph Features

### 1. Content Recommendations
```sql
-- Recommend content based on user's current learning
WITH user_progress AS (
    SELECT item_id, item_type, correct_cnt::numeric / seen_cnt as mastery
    FROM progress 
    WHERE user_id = $1 AND seen_cnt > 0
),
related_content AS (
    SELECT ir.to_id, ir.to_type, ir.rel_type, ir.strength,
           up.mastery
    FROM item_relations ir
    JOIN user_progress up ON ir.from_id = up.item_id AND ir.from_type = up.item_type
    WHERE up.mastery >= 0.8  -- User knows this well
)
SELECT rc.to_id, rc.to_type, rc.rel_type,
       CASE rc.to_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
       END as content,
       rc.strength * rc.mastery as recommendation_score
FROM related_content rc
LEFT JOIN words w ON rc.to_type = 'word' AND rc.to_id = w.id
LEFT JOIN kanji k ON rc.to_type = 'kanji' AND rc.to_id = k.id
LEFT JOIN grammar_points gp ON rc.to_type = 'grammar' AND rc.to_id = gp.id
WHERE rc.to_id NOT IN (
    SELECT item_id FROM progress WHERE user_id = $1
)
ORDER BY recommendation_score DESC
LIMIT 10;
```

### 2. Learning Path Generation
```sql
-- Generate optimal learning path through related content
WITH RECURSIVE learning_path AS (
    -- Start with user's current level
    SELECT id, character, jlpt, 0 as path_length, ARRAY[id] as path
    FROM kanji 
    WHERE jlpt = $1 AND id IN (
        SELECT item_id FROM progress 
        WHERE user_id = $2 AND item_type = 'kanji' AND correct_cnt >= 3
    )
    
    UNION ALL
    
    -- Find next kanji with shared components
    SELECT k.id, k.character, k.jlpt, lp.path_length + 1, 
           lp.path || k.id
    FROM kanji k
    JOIN kanji_components kc1 ON k.id = kc1.kanji_id
    JOIN kanji_components kc2 ON kc1.component_id = kc2.component_id
    JOIN learning_path lp ON kc2.kanji_id = lp.id
    WHERE k.jlpt <= $1 + 1
      AND k.id != ALL(lp.path)
      AND lp.path_length < 5
)
SELECT * FROM learning_path
WHERE path_length > 0
ORDER BY path_length, jlpt;
```

### 3. Content Clustering
```sql
-- Find content clusters based on relationships
WITH content_clusters AS (
    SELECT from_id, from_type, to_id, to_type,
           dense_rank() OVER (ORDER BY from_id) as cluster_id
    FROM item_relations
    WHERE rel_type IN ('synonym', 'related', 'component')
),
cluster_sizes AS (
    SELECT cluster_id, COUNT(*) as size
    FROM content_clusters
    GROUP BY cluster_id
    HAVING COUNT(*) >= 3
)
SELECT cs.cluster_id, cs.size,
       array_agg(DISTINCT 
           CASE cc.from_type 
             WHEN 'word' THEN w.english
             WHEN 'kanji' THEN k.character
             WHEN 'grammar' THEN gp.key
           END
       ) as cluster_content
FROM cluster_sizes cs
JOIN content_clusters cc ON cs.cluster_id = cc.cluster_id
LEFT JOIN words w ON cc.from_type = 'word' AND cc.from_id = w.id
LEFT JOIN kanji k ON cc.from_type = 'kanji' AND cc.from_id = k.id
LEFT JOIN grammar_points gp ON cc.from_type = 'grammar' AND cc.from_id = gp.id
GROUP BY cs.cluster_id, cs.size
ORDER BY cs.size DESC;
```

### 4. Centrality Analysis
```sql
-- Find most central content items
SELECT 
    CASE ir.from_type 
        WHEN 'word' THEN w.english
        WHEN 'kanji' THEN k.character
        WHEN 'grammar' THEN gp.key
    END as content,
    ir.from_type,
    COUNT(*) as connection_count,
    COUNT(DISTINCT ir.rel_type) as relationship_types
FROM item_relations ir
LEFT JOIN words w ON ir.from_type = 'word' AND ir.from_id = w.id
LEFT JOIN kanji k ON ir.from_type = 'kanji' AND ir.from_id = k.id
LEFT JOIN grammar_points gp ON ir.from_type = 'grammar' AND ir.from_id = gp.id
GROUP BY ir.from_id, ir.from_type, w.english, k.character, gp.key
ORDER BY connection_count DESC
LIMIT 20;
```

## Graph Analytics

### 1. Relationship Strength Analysis
```sql
-- Analyze relationship strength distribution
SELECT rel_type, 
       COUNT(*) as relationship_count,
       AVG(strength) as avg_strength,
       MIN(strength) as min_strength,
       MAX(strength) as max_strength
FROM item_relations
GROUP BY rel_type
ORDER BY relationship_count DESC;
```

### 2. Content Connectivity
```sql
-- Measure content connectivity
SELECT 
    'words' as content_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN connection_count > 0 THEN 1 END) as connected_items,
    ROUND(COUNT(CASE WHEN connection_count > 0 THEN 1 END)::numeric / COUNT(*) * 100, 2) as connectivity_percentage
FROM (
    SELECT w.id, COUNT(ir.to_id) as connection_count
    FROM words w
    LEFT JOIN item_relations ir ON w.id = ir.from_id AND ir.from_type = 'word'
    GROUP BY w.id
) word_connections;
```

### 3. Network Metrics
```sql
-- Calculate network density and other metrics
WITH network_stats AS (
    SELECT 
        COUNT(*) as total_relationships,
        COUNT(DISTINCT from_id || from_type) as unique_from_nodes,
        COUNT(DISTINCT to_id || to_type) as unique_to_nodes
    FROM item_relations
)
SELECT 
    total_relationships,
    unique_from_nodes,
    unique_to_nodes,
    ROUND(total_relationships::numeric / (unique_from_nodes * unique_to_nodes), 4) as network_density
FROM network_stats;
```

## Performance Optimization

### 1. Graph Indexes
```sql
-- Indexes for efficient graph queries
CREATE INDEX idx_item_relations_from ON item_relations(from_type, from_id);
CREATE INDEX idx_item_relations_to ON item_relations(to_type, to_id);
CREATE INDEX idx_item_relations_type ON item_relations(rel_type);
CREATE INDEX idx_grammar_relations ON grammar_relations(from_grammar_id, to_grammar_id);
```

### 2. Materialized Views
```sql
-- Materialized view for frequently accessed relationships
CREATE MATERIALIZED VIEW word_relationships AS
SELECT w1.english as word1, w2.english as word2, ir.rel_type, ir.strength
FROM item_relations ir
JOIN words w1 ON ir.from_id = w1.id
JOIN words w2 ON ir.to_id = w2.id
WHERE ir.from_type = 'word' AND ir.to_type = 'word';
```

### 3. Graph Algorithms
- Shortest path algorithms
- Community detection
- Centrality calculations
- Clustering algorithms 