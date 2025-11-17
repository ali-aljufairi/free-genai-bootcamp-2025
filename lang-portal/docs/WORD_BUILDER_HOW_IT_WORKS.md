# Word Builder: Step-by-Step How It Works Guide

## Overview
Word Builder is a Japanese vocabulary discovery game where users form valid Japanese words using provided kanji characters. This guide explains how the system works from start to finish.

---

## High-Level Flow

```
User Request → Kanji Selection → Valid Words Computation → Response
     ↓              ↓                    ↓                    ↓
  POST /start   getSmartKanji()    ComputeValidWords()    Return kanji + words
```

---

## Step 1: User Starts a Session

### API Endpoint
```
POST /api/word-builder/start
Body: { "jlpt_level": 3, "time_limit": 300 }
```

### What Happens
1. **Request Validation**
   - Checks JLPT level is between 1-5
   - Checks time limit is between 60-3600 seconds
   - Extracts user ID from JWT token

2. **Kanji Selection** → Calls `getSmartKanji(jlptLevel=3, count=5, excludeIDs=nil)`
3. **Valid Words Computation** → Calls `ComputeValidWords(selectedKanji)`
4. **Session Creation** → Creates record in `learning_activities` table
5. **Response** → Returns session_id, kanji[], valid_words[], time_limit

---

## Step 2: Smart Kanji Selection (`getSmartKanji()`)

### Purpose
Select 5 kanji that **actually form words together**, not just random kanji.

### Why This Matters
**Old approach (broken):**
- Selected random kanji by frequency
- Sometimes selected: [抜, 精, 皆, 相, 際]
- These don't form words together → `valid_words = []` ❌

**New approach (fixed):**
- Finds kanji groups that form words together
- Selects: [関, 機, 交] (forms 機関, 交関, etc.)
- These form words → `valid_words = [機関, ...]` ✅

### Detailed Algorithm

#### Phase 1: Find Words with Multiple Kanji
```sql
WITH shared_words AS (
    SELECT 
        w.id as word_id,
        array_agg(DISTINCT ir.to_id) as kanji_ids
    FROM words w
    JOIN item_relations ir ON ir.from_id = w.id
    JOIN kanji k ON k.id = ir.to_id
    WHERE k.jlpt = 3                    -- Target JLPT level
        AND k.frequency IS NOT NULL      -- Only kanji with frequency data
        AND w.kanji ~ '^[\u4E00-\u9FFF]+$'  -- Pure kanji words only
        AND LENGTH(w.kanji) BETWEEN 2 AND 4  -- 2-4 character words
    GROUP BY w.id
    HAVING COUNT(DISTINCT ir.to_id) BETWEEN 2 AND 5  -- Words with 2-5 kanji
)
```

**What this does:**
- Finds all words at JLPT 3 that use 2-5 kanji
- Groups kanji IDs for each word into an array
- Example result:
  ```
  word_id=297, kanji_ids=[432, 471]  → Word "機関" uses kanji 関(432) and 機(471)
  word_id=834, kanji_ids=[432, 471, 834]  → Word "交関機" uses 交(834), 関(432), 機(471)
  ```

#### Phase 2: Group Kanji Combinations
```sql
kanji_groups AS (
    SELECT 
        kanji_ids,           -- The kanji combination
        COUNT(*) as word_count  -- How many words use this combination
    FROM shared_words
    WHERE array_length(kanji_ids, 1) >= 2
    GROUP BY kanji_ids
    HAVING COUNT(*) >= 1
    ORDER BY 
        CASE WHEN array_length(kanji_ids, 1) >= 5 THEN 0 ELSE 1 END,  -- Prefer 5-kanji groups
        array_length(kanji_ids, 1) DESC,  -- Then prefer larger groups
        RANDOM()  -- Randomize for variety
    LIMIT 1
)
```

**What this does:**
- Groups kanji combinations that appear together
- Counts how many words each combination forms
- **Prioritizes:**
  1. Groups with 5 kanji (exactly what we need)
  2. Larger groups (4 kanji > 3 kanji > 2 kanji)
  3. Random selection for variety

**Example result:**
```
kanji_ids=[432, 471, 834], word_count=2
→ This combination appears in 2 words
→ Perfect! We'll use these 3 kanji
```

#### Phase 3: Select Kanji from Group
```sql
SELECT DISTINCT
    k.id, k.character, k.onyomi, k.kunyomi, k.jlpt, k.heisig_en, k.frequency
FROM kanji_groups kg
CROSS JOIN LATERAL unnest(kg.kanji_ids[1:5]) as kanji_id  -- Take up to 5 kanji
JOIN kanji k ON k.id = kanji_id
ORDER BY k.frequency DESC NULLS LAST
LIMIT 5
```

**What this does:**
- Extracts individual kanji from the selected group
- Gets full kanji details (character, readings, meanings, etc.)
- Orders by frequency (more common kanji first)
- Returns up to 5 kanji

**Result:**
```go
[]KanjiData{
    {ID: 432, Character: "関", JLPT: 3, ...},
    {ID: 471, Character: "機", JLPT: 3, ...},
    {ID: 834, Character: "交", JLPT: 3, ...},
}
```

#### Phase 4: Fallback (If No Groups Found)
If no kanji groups are found that form words together:
- Falls back to `getSmartKanjiFallback()`
- Uses simple random selection by frequency
- Still better than nothing, but may result in empty valid_words

---

## Step 3: Valid Words Computation (`ComputeValidWords()`)

### Purpose
Find ALL words that can be formed using ONLY the provided kanji.

### Key Constraint
**Word's kanji must be ENTIRELY contained within the provided set.**

**Examples:**
- Provided: [関, 機, 交]
- ✅ Valid: "機関" (uses 関 + 機, both in set)
- ✅ Valid: "交関" (uses 交 + 関, both in set)
- ❌ Invalid: "関係" (uses 関 + 係, but 係 is NOT in set)

### Detailed Algorithm

#### Phase 1: Find Words Using Any Provided Kanji
```sql
WITH s AS (
    SELECT unnest(ARRAY[432, 471, 834]::int[]) AS kanji_id  -- Provided kanji IDs
),
words_for_s AS (
    SELECT DISTINCT ir.from_id AS word_id
    FROM item_relations ir
    JOIN s ON s.kanji_id = ir.to_id
    WHERE ir.from_type = 'word'
        AND ir.rel_type = 'USES_KANJI'
        AND ir.to_type = 'kanji'
)
```

**What this does:**
- Creates a set of provided kanji IDs: {432, 471, 834}
- Finds ALL words that use ANY of these kanji
- This is a broad filter to get candidate words

**Example result:**
```
word_id=297  → Uses 関(432)
word_id=834  → Uses 交(834)
word_id=1234 → Uses 機(471)
word_id=5678 → Uses 関(432) + 機(471)  ← This is what we want!
word_id=9999 → Uses 関(432) + 係(999)   ← 係 not in set, will be filtered out
```

#### Phase 2: Get ALL Kanji for Each Word
```sql
word_kanji_sets AS (
    SELECT ir.from_id AS word_id,
        array_agg(DISTINCT ir.to_id ORDER BY ir.to_id) AS word_kanji_ids
    FROM (
        SELECT DISTINCT ir.from_id, ir.to_id
        FROM item_relations ir
        JOIN words_for_s w ON w.word_id = ir.from_id
        WHERE ir.from_type = 'word'
            AND ir.rel_type = 'USES_KANJI'
            AND ir.to_type = 'kanji'
    ) ir
    GROUP BY ir.from_id
)
```

**What this does:**
- For each candidate word, gets ALL kanji it uses (not just provided ones)
- Creates an array of kanji IDs for each word
- Uses `DISTINCT` to handle duplicate relations

**Example result:**
```
word_id=297,  word_kanji_ids=[432, 471]        → "機関" uses 関 + 機
word_id=834,  word_kanji_ids=[432, 471, 834]   → "交関機" uses all 3
word_id=9999, word_kanji_ids=[432, 999]        → Uses 関 + 係 (係 not in set)
```

#### Phase 3: Filter to Words Using ONLY Provided Kanji
```sql
SELECT
    w.id AS word_id,
    w.kanji,
    w.kana,
    w.english,
    wk.word_kanji_ids
FROM word_kanji_sets wk
JOIN words w ON w.id = wk.word_id
WHERE wk.word_kanji_ids <@ ARRAY[432, 471, 834]::int[]  -- Array containment
    AND w.kanji IS NOT NULL
    AND w.kanji ~ '^[\u4E00-\u9FFF]+$'  -- Pure kanji only
    AND LENGTH(w.kanji) BETWEEN 1 AND 4
    AND (w.jlpt = 3 OR w.jlpt IS NULL OR w.jlpt BETWEEN 2 AND 4)
```

**Key Operator: `<@` (Array Containment)**
- Checks if left array is a subset of right array
- `[432, 471] <@ [432, 471, 834]` → ✅ TRUE (both kanji in set)
- `[432, 999] <@ [432, 471, 834]` → ❌ FALSE (999 not in set)

**What this does:**
- Filters to words where ALL kanji are from the provided set
- Applies additional filters (pure kanji, length 1-4, JLPT level)
- Returns final list of valid words

**Example result:**
```
word_id=297, kanji="機関", kana="きかん", english="engine, agency", word_kanji_ids=[432, 471]
word_id=834, kanji="交関機", kana="こうかんき", english="...", word_kanji_ids=[432, 471, 834]
```

#### Phase 4: Convert to ValidWord Format
```go
validWords := make([]ValidWord, 0, len(results))
for _, r := range results {
    // Filter kanji_ids to only include provided kanji
    filteredKanjiIDs := make([]int64, 0)
    for _, kid := range r.WordKanjiIDs {
        if _, exists := kanjiMap[kid]; exists {
            filteredKanjiIDs = append(filteredKanjiIDs, kid)
        }
    }
    
    validWords = append(validWords, ValidWord{
        Kanji:    r.Kanji,
        Kana:     r.Kana,
        English:  r.English,
        WordID:   r.WordID,
        KanjiIDs: filteredKanjiIDs,
    })
}
```

**What this does:**
- Converts database results to API response format
- Filters kanji_ids to only include provided kanji (removes any extras)
- Returns clean list of valid words

---

## Step 4: Response to User

### Response Format
```json
{
    "session_id": 3,
    "kanji": [
        {
            "id": 432,
            "character": "関",
            "onyomi": "カン",
            "kunyomi": "せき -ぜき かか.わる",
            "meanings": ["barrier", "gate", "connection"],
            "jlpt": 3
        },
        // ... 4 more kanji
    ],
    "valid_words": [
        {
            "kanji": "機関",
            "kana": "きかん",
            "english": "engine, agency, organisation",
            "word_id": 297,
            "kanji_ids": [432, 471]
        },
        // ... more words
    ],
    "time_limit": 300
}
```

### What User Sees
1. **5 kanji characters** they can use to form words
2. **Pre-computed valid words** - the system knows all possible words
3. **Game mechanics:**
   - User drags kanji into slots (1-4 slots)
   - System validates against `valid_words` array
   - If match found → success! Word is added to `formed_words`
   - If no match → invalid attempt

---

## Step 5: User Refreshes Kanji

### API Endpoint
```
POST /api/word-builder/refresh
Body: {
    "session_id": 3,
    "jlpt_level": 3,
    "used_kanji_ids": [432, 471, 834, 1001, 1672]
}
```

### What Happens
1. **Exclude Used Kanji** → Passes `used_kanji_ids` to `getSmartKanji()`
2. **Select New Kanji** → Finds new kanji group (excluding used ones)
3. **Compute Valid Words** → Finds words for new kanji
4. **Response** → Returns new kanji + valid_words

**Key:** The exclude clause ensures users don't see the same kanji again:
```sql
AND k.id NOT IN ($2, $3, $4, $5, $6)  -- Exclude used kanji
```

---

## Step 6: User Submits Results

### API Endpoint
```
POST /api/word-builder/submit
Body: {
    "session_id": 3,
    "formed_words": ["機関", "交関"],
    "total_attempts": 5,
    "time_spent": 180,
    "refresh_count": 2
}
```

### What Happens
1. **Validate Session** → Checks session exists and belongs to user
2. **Calculate Accuracy** → `accuracy = (formed_words.length / total_attempts) * 100`
3. **Update Database** → Updates `learning_activities` table:
   - `completed_at`: Current timestamp
   - `correct_count`: Number of words formed
   - `item_count`: Total attempts
   - `total_time_seconds`: Time spent
   - `config`: JSON with formed_words and refresh_count

---

## Database Schema Overview

### Key Tables

#### `kanji` Table
```sql
CREATE TABLE kanji (
    id SERIAL PRIMARY KEY,
    character VARCHAR(1) NOT NULL UNIQUE,  -- Single kanji: '関'
    meanings JSONB,                         -- ["barrier", "gate", "connection"]
    jlpt INTEGER,                           -- 1-5 or NULL
    frequency INTEGER,                      -- Usage frequency
    onyomi TEXT,                            -- On-reading: "カン"
    kunyomi TEXT                            -- Kun-reading: "せき"
);
```

#### `words` Table
```sql
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    kanji TEXT,                             -- Kanji writing: "機関"
    kana TEXT NOT NULL,                     -- Hiragana: "きかん"
    english TEXT NOT NULL,                  -- English meaning
    jlpt INTEGER                            -- 1-5 or NULL
);
```

#### `item_relations` Table (Graph Relationships)
```sql
CREATE TABLE item_relations (
    id SERIAL PRIMARY KEY,
    from_id INTEGER NOT NULL,               -- Word ID
    from_type VARCHAR(50) NOT NULL,         -- 'word'
    to_id INTEGER NOT NULL,                 -- Kanji ID
    to_type VARCHAR(50) NOT NULL,           -- 'kanji'
    rel_type VARCHAR(50) NOT NULL,          -- 'USES_KANJI'
    position INTEGER                        -- Order: 1st, 2nd, 3rd kanji
);
```

**Example Data:**
```
Word "機関" (id=297) contains:
- from_id=297, from_type='word', to_id=432, to_type='kanji', rel_type='USES_KANJI', position=1  → 関
- from_id=297, from_type='word', to_id=471, to_type='kanji', rel_type='USES_KANJI', position=2  → 機
```

---

## Graph Relationships Explained

### What is `item_relations`?
A graph database table that connects content items (kanji, words, grammar) together.

### Relationship Types

#### 1. `USES_KANJI` (Critical for Word Builder)
- **Direction:** `word → kanji`
- **Meaning:** "This word uses this kanji"
- **Example:**
  - Word "機関" → Kanji "関" (position 1)
  - Word "機関" → Kanji "機" (position 2)

#### 2. `SIMILAR_TO` (Not used by Word Builder)
- **Direction:** `word ↔ word` or `kanji ↔ kanji`
- **Meaning:** "These items are similar"
- **Example:** Word "大きい" ↔ Word "大きな" (both mean "big")

#### 3. `APPEARS_IN` (Not used by Word Builder)
- **Direction:** `word → grammar`
- **Meaning:** "This word appears in this grammar pattern"
- **Example:** Word "食べる" → Grammar "〜てください"

### Why Only `USES_KANJI` Matters
Word Builder only needs to know:
- Which kanji are used in which words
- The order of kanji in words (position field)

The other relationship types are useful for other features (recommendations, learning paths) but not for word building.

---

## Query Performance

### Indexes Used
```sql
-- Fast lookup: Find words using a kanji
CREATE INDEX idx_rel_to_kanji_uses ON item_relations(to_type, to_id, rel_type, from_type)
    WHERE to_type = 'kanji' AND rel_type = 'USES_KANJI';

-- Fast lookup: Find kanji in a word
CREATE INDEX idx_rel_from_word_uses ON item_relations(from_type, from_id, rel_type, to_type)
    WHERE from_type = 'word' AND rel_type = 'USES_KANJI';
```

### Query Speed
- **Kanji Selection:** ~50-100ms (finds word-forming groups)
- **Valid Words Computation:** ~10-30ms (array containment is fast)
- **Total API Response:** ~100-200ms

---

## Edge Cases Handled

### 1. No Word-Forming Groups Found
- **Fallback:** Uses simple random selection
- **Result:** May return empty valid_words (acceptable edge case)

### 2. Group Has Fewer Than 5 Kanji
- **Example:** Found group with 3 kanji
- **Handling:** Accepts it (better than random)
- **Result:** Returns 3 kanji that form words together

### 3. Duplicate Relations
- **Problem:** Some words have duplicate kanji relations
- **Solution:** Uses `DISTINCT` in subquery
- **Result:** Clean kanji arrays without duplicates

### 4. Empty Kanji Array
- **Handling:** Returns empty valid_words immediately
- **No database query needed**

### 5. Kanji with NULL JLPT
- **Handling:** Defaults to JLPT 4 if first kanji has NULL JLPT
- **Query:** Includes NULL JLPT words in results (relaxed filter)

---

## Testing Strategy

### Unit Tests
```go
TestComputeValidWords()
- Tests with kanji that form words
- Tests with empty kanji array
- Tests with single kanji
- Tests kanji filtering (words only use provided kanji)
```

### Integration Tests
- Test full API flow: start → refresh → submit
- Verify valid_words are always populated (when kanji form words)
- Verify session tracking works correctly

---

## Key Takeaways

1. **Smart Selection:** Kanji are selected based on word-forming ability, not just frequency
2. **Array Containment:** Uses PostgreSQL `<@` operator to ensure words use ONLY provided kanji
3. **Graph Relationships:** Leverages `item_relations` table to find word-kanji connections
4. **Performance:** Fast queries using proper indexes and CTEs
5. **Fallback:** Graceful degradation if no word-forming groups found

---

## Visual Flow Diagram

```
┌─────────────────┐
│  User Request   │
│  JLPT 3, 300s   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  getSmartKanji(3, 5)     │
│  ┌───────────────────┐  │
│  │ Find words with   │  │
│  │ 2-5 kanji @ JLPT3 │  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │ Group kanji       │  │
│  │ combinations      │  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │ Select best group │  │
│  │ (prefer 5 kanji)  │  │
│  └─────────┬─────────┘  │
│            │            │
│  Returns: [関,機,交,...]│
└────────────┼────────────┘
             │
             ▼
┌─────────────────────────┐
│ ComputeValidWords()      │
│  ┌───────────────────┐  │
│  │ Find words using  │  │
│  │ ANY provided kanji│  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │ Get ALL kanji for │  │
│  │ each word         │  │
│  └─────────┬─────────┘  │
│            │            │
│  ┌─────────▼─────────┐  │
│  │ Filter: word_kanji│  │
│  │ <@ provided_kanji │  │
│  └─────────┬─────────┘  │
│            │            │
│  Returns: [機関, 交関,...]│
└────────────┼────────────┘
             │
             ▼
┌─────────────────────────┐
│  API Response           │
│  {                      │
│    kanji: [...],        │
│    valid_words: [...]   │
│  }                      │
└─────────────────────────┘
```

---

## Common Questions

### Q: Why do we need both kanji selection AND valid words computation?
**A:** 
- **Kanji selection** ensures we pick kanji that CAN form words together
- **Valid words computation** finds ALL words that CAN be formed from those kanji
- Both are needed: selection prevents empty results, computation provides the answer key

### Q: What if a kanji group has only 2 kanji but we need 5?
**A:** The system accepts it (better than random). It prefers larger groups but will use smaller ones if that's all that's available.

### Q: Why use `database/sql` instead of GORM for valid words?
**A:** GORM has issues parsing PostgreSQL placeholders inside `ARRAY[...]` syntax. Using `database/sql` directly bypasses this and gives us full control.

### Q: What happens if no words are found?
**A:** The system falls back to simple random selection. This is rare but can happen at very high JLPT levels where fewer words exist.

---

## Summary

The Word Builder system works in three main steps:

1. **Smart Kanji Selection:** Finds kanji groups that form words together
2. **Valid Words Computation:** Finds all words using ONLY those kanji
3. **User Interaction:** User forms words, system validates against pre-computed list

The key innovation is ensuring kanji selection and valid words computation work together to always provide an engaging game experience with words to discover.

