# Multi-Kanji Compounds Verification Steps

## 1. Run Updated Import Client

```bash
cd /Users/ali/github/free-genai-bootcamp-2025/Database
docker-compose down && docker-compose up -d
cd import-client
go run main.go
```

Expected output:
```
Generating multi-kanji compounds...
Generated 847 multi-kanji compound words

Wiring word-kanji relationships...
Created 8432 word-kanji relationships
Verified: 8432 word-kanji relationships exist for 2-4 kanji words
```

---

## 2. Verify Compound Words Were Created

```sql
-- Connect to database
psql -U sorami_user -d sorami

-- Check how many 2-4 kanji words exist
SELECT COUNT(*) as compound_words_count
FROM words
WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$';

-- Sample compounds that were created
SELECT id, kanji, kana, english, part_of_speech, jlpt
FROM words
WHERE kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
LIMIT 10;
```

Expected: 800+ compound words with 'expression' POS

---

## 3. Verify Word-Kanji Relations

```sql
-- Check total word-kanji relations created
SELECT COUNT(*) as total_relations
FROM item_relations
WHERE rel_type = 'USES_KANJI';

-- Verify multi-kanji words have complete relation sets
SELECT w.id, w.kanji, COUNT(*) as kanji_count, array_agg(ir.to_id ORDER BY ir.position) as kanji_ids
FROM words w
JOIN item_relations ir ON ir.from_id = w.id AND ir.from_type = 'word'
WHERE w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
  AND ir.rel_type = 'USES_KANJI'
GROUP BY w.id
LIMIT 10;
```

Expected output:
```
id    | kanji | kanji_count | kanji_ids
------|-------|-------------|----------
5432  | 世知  | 2           | {42,99}
5433  | 理知  | 2           | {88,99}
5434  | 知世  | 2           | {99,42}
...
```

---

## 4. Verify Word Builder Handler Compatibility

```sql
-- This is what the word_builder handler uses internally
-- Check that it works for multi-kanji words

WITH word_kanji_ids AS (
    SELECT w.id as word_id, array_agg(ir.to_id ORDER BY ir.position) as kanji_ids
    FROM words w
    JOIN item_relations ir ON ir.from_id = w.id AND ir.from_type = 'word' AND ir.rel_type = 'USES_KANJI'
    WHERE LENGTH(w.kanji) BETWEEN 1 AND 4  -- Handler's filter
    GROUP BY w.id
)
SELECT COUNT(*) as words_with_kanji
FROM word_kanji_ids
WHERE array_length(kanji_ids, 1) > 0;

-- This should return the total number of words that will be available to the handler
```

---

## 5. Test Specific Word Builder Query

If you have access to the word_builder handler code, test:

```bash
curl http://localhost:3000/api/word-builder/compute \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jlpt_level": 4, "count": 10}'
```

This should now return multi-kanji words in the results.

---

## 6. Debug: Find Words Without Relations

```sql
-- Find words with kanji that don't have relations (shouldn't exist now)
SELECT w.id, w.kanji, LENGTH(w.kanji) as char_count
FROM words w
WHERE w.kanji ~ '[\u4E00-\u9FFF]'
  AND LENGTH(w.kanji) BETWEEN 2 AND 4
  AND NOT EXISTS (
    SELECT 1 FROM item_relations ir 
    WHERE ir.from_id = w.id 
      AND ir.from_type = 'word'
      AND ir.rel_type = 'USES_KANJI'
  )
LIMIT 10;

-- If this returns anything, the wiring may have failed
```

---

## Success Criteria

✅ All checks pass if:
1. Compound words generated (800+)
2. Word-kanji relations created (8000+)
3. Every 2-4 kanji word has 2-4 relations
4. Position values are sequential (1, 2, 3, 4)
5. Word builder handler returns multi-kanji results

If any fail, check:
- Import client logs for error messages
- Database connection and permissions
- Unicode regex support in PostgreSQL
- Item_relations table constraints
