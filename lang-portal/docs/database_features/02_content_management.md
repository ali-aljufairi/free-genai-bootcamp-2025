# Content Management Features

## Overview
Complete content management system for Japanese language learning materials including kanji, vocabulary, grammar, and example sentences.

## Core Tables
- `kanji` - Japanese characters with stroke data
- `words` - Vocabulary with readings and meanings
- `grammar_points` - Grammar patterns and structures
- `grammar_readings` - Furigana readings for grammar
- `grammar_examples` - Example sentences for grammar
- `grammar_details` - Detailed explanations
- `sentences` - Example sentences for study

## Key Features

### 1. Kanji Management
```sql
-- Get kanji with stroke data
SELECT id, character, meanings, stroke_count, strokes_svg 
FROM kanji WHERE jlpt = $1 ORDER BY frequency;

-- Search kanji by meaning
SELECT * FROM kanji 
WHERE $1 = ANY(meanings);

-- Get kanji by stroke count
SELECT * FROM kanji 
WHERE stroke_count BETWEEN $1 AND $2;

-- Get kanji with SVG stroke data
SELECT * FROM kanji 
WHERE strokes_svg IS NOT NULL AND strokes_svg != '';
```

### 2. Vocabulary Management
```sql
-- Search words by kanji
SELECT * FROM words WHERE kanji LIKE '%' || $1 || '%';

-- Search words by kana
SELECT * FROM words WHERE kana LIKE '%' || $1 || '%';

-- Search words by English meaning
SELECT * FROM words WHERE english ILIKE '%' || $1 || '%';

-- Get words by JLPT level
SELECT * FROM words WHERE jlpt = $1 ORDER BY level;

-- Get words by part of speech
SELECT * FROM words WHERE part_of_speech = $1;
```

### 3. Grammar Management
```sql
-- Get grammar points by level
SELECT * FROM grammar_points WHERE level = $1;

-- Get grammar with examples
SELECT gp.*, ge.japanese, ge.english
FROM grammar_points gp
LEFT JOIN grammar_examples ge ON gp.id = ge.grammar_id
WHERE gp.level = $1;

-- Get grammar with readings
SELECT gp.*, gr.kanji, gr.reading
FROM grammar_points gp
LEFT JOIN grammar_readings gr ON gp.id = gr.grammar_id
WHERE gp.id = $1;

-- Search grammar by structure
SELECT * FROM grammar_points WHERE structure ILIKE '%' || $1 || '%';
```

### 4. Content Relationships
```sql
-- Get related words
SELECT w2.* 
FROM item_relations ir
JOIN words w1 ON w1.id = ir.from_id
JOIN words w2 ON w2.id = ir.to_id
WHERE ir.from_type = 'word' AND ir.to_type = 'word'
  AND ir.rel_type = 'synonym' AND w1.id = $1;

-- Get words containing specific kanji
SELECT w.* 
FROM item_relations ir
JOIN kanji k ON k.id = ir.from_id
JOIN words w ON w.id = ir.to_id
WHERE ir.from_type = 'kanji' AND ir.to_type = 'word'
  AND k.character = $1;
```

### 5. Content Import Functions
```sql
-- Import kanji data
SELECT import_kanji_data($1::jsonb);

-- Import words data
SELECT import_words_data($1::jsonb);

-- Import grammar data
SELECT import_grammar_data($1::jsonb);

-- Import SVG stroke data
SELECT import_kanji_svg_strokes($1::jsonb);
```

## API Endpoints (Example)

### Kanji
```javascript
// GET /api/kanji - List kanji with filters
// GET /api/kanji/:id - Get specific kanji
// GET /api/kanji/:id/strokes - Get stroke order SVG
// POST /api/kanji/search - Search kanji
```

### Words
```javascript
// GET /api/words - List words with filters
// GET /api/words/:id - Get specific word
// POST /api/words/search - Search words
// GET /api/words/related/:id - Get related words
```

### Grammar
```javascript
// GET /api/grammar - List grammar points
// GET /api/grammar/:id - Get specific grammar point
// GET /api/grammar/:id/examples - Get examples
// GET /api/grammar/:id/readings - Get readings
```

## Content Organization

### Hierarchical Structure
- **Courses** → **Units** → **Items** (words, kanji, grammar)
- **Groups** → **Content** (flexible grouping)
- **Relations** → **Connected Content** (graph relationships)

### Content Types
- **Kanji**: Characters with stroke order, meanings, readings
- **Words**: Vocabulary with kanji, kana, romaji, English
- **Grammar**: Patterns with structure, examples, readings
- **Sentences**: Example sentences for context

## Advanced Features

### 1. Full-Text Search
```sql
-- Search across all content
SELECT * FROM words 
WHERE to_tsvector('english', kana || ' ' || kanji || ' ' || english) 
@@ plainto_tsquery('english', $1);
```

### 2. Content Recommendations
```sql
-- Get recommended content based on user progress
SELECT w.* FROM words w
WHERE w.jlpt <= $1 
  AND w.id NOT IN (
    SELECT item_id FROM progress 
    WHERE user_id = $2 AND item_type = 'word'
  )
ORDER BY w.frequency LIMIT 10;
```

### 3. Content Statistics
```sql
-- Get content counts by level
SELECT jlpt, COUNT(*) 
FROM words 
GROUP BY jlpt 
ORDER BY jlpt;

-- Get kanji coverage
SELECT COUNT(*) as total_kanji,
       COUNT(CASE WHEN strokes_svg IS NOT NULL THEN 1 END) as with_svg
FROM kanji;
```

## Content Validation

### Data Integrity
- Unique constraints on kanji characters
- Foreign key relationships maintained
- JLPT level validation (1-5)
- Stroke count validation

### Content Quality
- Meaning validation (non-empty)
- Reading validation (proper format)
- SVG stroke data validation
- Grammar structure validation 