# Word Builder Feature - Complete Handover Document

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Architecture & Flow](#architecture--flow)
3. [Database Schema](#database-schema)
4. [Core Algorithms](#core-algorithms)
5. [API Endpoints](#api-endpoints)
6. [Critical Implementation Details](#critical-implementation-details)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Testing Guide](#testing-guide)
9. [Debugging Tips](#debugging-tips)

---

## Feature Overview

### What is Word Builder?
Word Builder is a **Japanese vocabulary discovery game** where:
- Users are given **5 kanji characters** at a specific JLPT level
- Users must **form valid Japanese words** using only those kanji
- The system pre-computes all valid words and validates user submissions
- Users can refresh to get new kanji sets during gameplay
- Progress is tracked in `learning_activities` table

### Key Requirements
- **Smart Kanji Selection**: Kanji must be able to form words together (not random)
- **Valid Word Discovery**: Find all words that can be formed from the kanji set
- **Meaning Fallback**: Handle null/empty meanings gracefully
- **Performance**: Fast queries even with large datasets

---

## Architecture & Flow

### High-Level Flow

```
1. User starts session → POST /api/word-builder/start
   ├─ Validates JLPT level (1-5) and time limit (60-3600s)
   ├─ Calls getSmartKanji() → Selects 5 kanji that can form words
   ├─ Calls computeValidWords() → Pre-computes all valid words
   ├─ Creates learning_activity record
   └─ Returns: session_id, kanji[], valid_words[], time_limit

2. User refreshes kanji → POST /api/word-builder/refresh
   ├─ Validates JLPT level and excludes used kanji IDs
   ├─ Calls getSmartKanji() with excludeIDs
   ├─ Calls computeValidWords() for new kanji set
   ├─ Optionally updates learning_activity (non-blocking)
   └─ Returns: kanji[], valid_words[]

3. User submits results → POST /api/word-builder/submit
   ├─ Validates session exists and belongs to user
   ├─ Calculates accuracy (formed_words / total_attempts)
   ├─ Updates learning_activity with results
   └─ Returns: session_id, words_formed, accuracy, time_spent
```

### File Structure

```
internal/handlers/word_builder/
├── word_builder_handler.go           # HTTP handlers (StartSession, RefreshKanji, SubmitResults)
├── word_builder_kanji_selection.go   # Kanji selection logic (getSmartKanji)
├── word_builder_kanji_meanings.go    # Kanji meanings retrieval (getKanjiMeanings)
├── word_builder_word_computation.go  # Valid word computation (computeValidWords)
├── types.go                          # Data structures (KanjiData, ValidWord, requests/responses)
└── helpers.go                        # (Deprecated - kept for backward compatibility)
```

---

## Database Schema

### Core Tables

#### 1. `kanji` Table
```sql
CREATE TABLE kanji (
    id SERIAL PRIMARY KEY,
    character VARCHAR(1) NOT NULL UNIQUE,      -- Single kanji character (e.g., '日')
    meanings JSONB,                            -- Array of strings: ["day", "sun", "Japan"]
    detail TEXT,                               -- Fallback meaning text
    heisig_en TEXT,                            -- Heisig keyword (fallback)
    onyomi TEXT,                               -- On-reading (e.g., "ニチ ジツ")
    kunyomi TEXT,                              -- Kun-reading (e.g., "ひ び")
    jlpt INTEGER,                              -- JLPT level (1-5, NULL for unclassified)
    frequency INTEGER,                          -- Usage frequency (higher = more common)
    -- ... other fields
);
```

**Critical Fields:**
- `meanings`: JSONB array `["meaning1", "meaning2"]` - **CAN BE NULL**
- `detail`: TEXT fallback - **CAN BE NULL**
- `heisig_en`: TEXT fallback - **CAN BE NULL**
- `frequency`: Used for weighted selection - **CAN BE NULL**

#### 2. `words` Table
```sql
CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    kanji TEXT,                                -- Kanji writing (e.g., "日本")
    kana TEXT NOT NULL,                        -- Hiragana reading (e.g., "にほん")
    english TEXT NOT NULL,                      -- English meaning
    jlpt INTEGER,                              -- JLPT level (1-5, NULL for unclassified)
    -- ... other fields
);
```

**Critical Fields:**
- `kanji`: Can be NULL (hiragana-only words)
- `jlpt`: Can be NULL (unclassified words)

#### 3. `item_relations` Table (Graph Relationships)
```sql
CREATE TABLE item_relations (
    id SERIAL PRIMARY KEY,
    from_id INTEGER NOT NULL,                  -- Source item ID
    from_type VARCHAR(50) NOT NULL,           -- 'word' or 'kanji'
    to_id INTEGER NOT NULL,                    -- Target item ID
    to_type VARCHAR(50) NOT NULL,             -- 'word' or 'kanji'
    rel_type VARCHAR(50) NOT NULL,            -- 'USES_KANJI', 'SIMILAR_TO', etc.
    position INTEGER                           -- Order of kanji in word (for USES_KANJI)
);
```

**Critical Relationships:**
- `USES_KANJI`: `word` → `kanji` (word contains kanji)
  - Example: Word "日本" (id=123) → Kanji "日" (id=456), Kanji "本" (id=789)
  - `position`: Order of kanji (1, 2, 3, ...)

**Indexes:**
```sql
CREATE INDEX idx_item_relations_from ON item_relations(from_id, from_type, rel_type);
CREATE INDEX idx_item_relations_to ON item_relations(to_id, to_type, rel_type);
```

### Graph Building

The `item_relations` table is populated by `build_complete_graph()` function:
1. **Stage 1**: Analyzes each word's `kanji` field
2. Matches characters against `kanji` table
3. Creates `USES_KANJI` relationships: `word → kanji`
4. Stores `position` for kanji order

**Example:**
- Word "日本" (id=100) contains "日" (id=1) and "本" (id=2)
- Creates: `(from_id=100, from_type='word', to_id=1, to_type='kanji', rel_type='USES_KANJI', position=1)`
- Creates: `(from_id=100, from_type='word', to_id=2, to_type='kanji', rel_type='USES_KANJI', position=2)`

---

## Core Algorithms

### 1. `getSmartKanji(jlptLevel, count, excludeIDs)` → `[]KanjiData`

**Purpose**: Select kanji with frequency data for the given JLPT level. Uses simple frequency-based selection with randomization for variety.

**Query Logic:**
```sql
SELECT 
    k.id,
    k.character,
    k.onyomi,
    k.kunyomi,
    k.jlpt,
    k.heisig_en,
    k.frequency
FROM kanji k
WHERE k.jlpt = $1
    AND k.frequency IS NOT NULL
    AND k.id NOT IN ($2, $3, ...)  -- excludeIDs
ORDER BY RANDOM()
LIMIT $N  -- count
```

**Explanation:**
- Simple query: select kanji with frequency data matching JLPT level
- `ORDER BY RANDOM()` provides variety (similar to flashcard handlers)
- No complex graph relationships needed - frequency ensures kanji are common and likely to form words
- Additional shuffle in Go code for extra variety

**Implementation:**
```go
// Query kanji with frequency
kanjiList := queryKanjiWithFrequency(jlptLevel, count, excludeIDs)

// Shuffle for additional variety
rand.Shuffle(len(kanjiList), ...)

// Get meanings for each kanji
for each kanji {
    meanings := getKanjiMeanings(kanji.ID)
    result = append(KanjiData{...})
}
```

**File Location**: `internal/handlers/word_builder/word_builder_kanji_selection.go`

---

### 2. `getKanjiMeanings(kanjiID)` → `[]string`

**Purpose**: Retrieve meanings with fallback logic (max 3 values).

**Fallback Chain:**
1. Try `meanings` (JSONB) → Parse JSON array using `kanji.StringSlice`, take first 3 elements
2. If null/empty → Try `detail` (TEXT) → Split by comma, take first 3 values
3. If null/empty → Try `heisig_en` (TEXT) → Split by comma, take first 3 values
4. If all null/empty → Return error

**Critical Implementation:**
```go
// Use kanji.StringSlice type which properly implements sql.Scanner for JSONB
var kanjiModel struct {
    Meanings kanji.StringSlice `gorm:"type:jsonb"`
}
err := h.DB.Raw("SELECT meanings FROM kanji WHERE id = $1", kanjiID).Scan(&kanjiModel).Error

// Meanings are already separate array elements - no comma-splitting needed
meanings := []string(kanjiModel.Meanings)
if len(meanings) > 3 {
    meanings = meanings[:3]
}
```

**Why `kanji.StringSlice`?** It properly implements `sql.Scanner` for JSONB arrays, avoiding the need for manual `::text` casting.

**Comma-Separated Handling (for TEXT fields only):**
```go
// Only used for detail and heisig_en (TEXT fields), not for meanings (JSONB)
takeFirst3FromText := func(s string) []string {
    parts := strings.Split(s, ",")
    result := make([]string, 0, 3)
    for i, part := range parts {
        if i >= 3 { break }
        trimmed := strings.TrimSpace(part)
        if trimmed != "" {
            result = append(result, trimmed)
        }
    }
    return result
}
```

**File Location**: `internal/handlers/word_builder/word_builder_kanji_meanings.go`

---

### 3. `computeValidWords(kanji []KanjiData)` → `[]ValidWord`

**Purpose**: Find ALL words that can be formed using ONLY the provided kanji.

**Key Constraint**: Word's kanji must be **entirely contained** within the provided set.

**CTE-Based Query:**
```sql
WITH s AS (
    SELECT unnest(ARRAY[$1, $2, $3, $4, $5]::int[]) AS kanji_id  -- Provided kanji IDs
),
words_for_s AS (
    -- Find all words that use ANY of the provided kanji
    SELECT DISTINCT ir.from_id AS word_id
    FROM item_relations ir
    JOIN s ON s.kanji_id = ir.to_id
    WHERE ir.from_type = 'word'
        AND ir.rel_type = 'USES_KANJI'
        AND ir.to_type = 'kanji'
),
word_kanji_sets AS (
    -- Get ALL kanji IDs for each word (in order)
    SELECT
        ir.from_id AS word_id,
        array_agg(ir.to_id ORDER BY COALESCE(ir.position, 999), ir.to_id) AS word_kanji_ids
    FROM item_relations ir
    JOIN words_for_s w ON w.word_id = ir.from_id
    WHERE ir.from_type = 'word'
        AND ir.rel_type = 'USES_KANJI'
        AND ir.to_type = 'kanji'
    GROUP BY ir.from_id
)
SELECT
    w.id AS word_id,
    w.kanji,
    w.kana,
    w.english,
    wk.word_kanji_ids
FROM word_kanji_sets wk
JOIN words w ON w.id = wk.word_id
WHERE wk.word_kanji_ids <@ ARRAY[$1, $2, $3, $4, $5]::int[]  -- Array containment
    AND w.kanji IS NOT NULL
    AND w.kanji ~ '^[\u4E00-\u9FFF]+$'  -- Pure kanji only (no hiragana/katakana)
    AND LENGTH(w.kanji) BETWEEN 1 AND 4
    AND (w.jlpt = $6 OR w.jlpt IS NULL OR w.jlpt BETWEEN $7 AND $8)  -- Relaxed JLPT filter
    AND cardinality(wk.word_kanji_ids) >= 1
ORDER BY cardinality(wk.word_kanji_ids) DESC, w.kanji
```

**Critical PostgreSQL Operators:**
- `<@`: Array containment operator (left array is subset of right array)
  - `ARRAY[1, 2] <@ ARRAY[1, 2, 3]` → `true`
  - `ARRAY[1, 4] <@ ARRAY[1, 2, 3]` → `false`
- `unnest()`: Expands array into rows
- `array_agg()`: Aggregates rows into array (with ORDER BY for kanji order)
- `cardinality()`: Returns array length

**Why This Works:**
1. `words_for_s`: Finds words that use ANY provided kanji (broad filter)
2. `word_kanji_sets`: Gets ALL kanji for each word (not just provided ones)
3. `WHERE word_kanji_ids <@ ARRAY[...]`: Ensures word's kanji are ENTIRELY within provided set

**Example:**
- Provided kanji: [日, 本, 人]
- Word "日本" has kanji_ids: [日, 本] → `[日, 本] <@ [日, 本, 人]` → ✅ Valid
- Word "日本人" has kanji_ids: [日, 本, 人] → `[日, 本, 人] <@ [日, 本, 人]` → ✅ Valid
- Word "日本国" has kanji_ids: [日, 本, 国] → `[日, 本, 国] <@ [日, 本, 人]` → ❌ Invalid (国 not in set)

**PostgreSQL Placeholder Management:**
```go
// Build placeholders for kanji IDs array (reused in both places)
kanjiPlaceholders := make([]string, len(kanjiIDs))
args := make([]interface{}, len(kanjiIDs)+3)
for i, id := range kanjiIDs {
    kanjiPlaceholders[i] = fmt.Sprintf("$%d", i+1)
    args[i] = id
}
kanjiArrayClause := "ARRAY[" + strings.Join(kanjiPlaceholders, ",") + "]::int[]"

// JLPT placeholders (after kanji IDs)
jlptPlaceholder1 := fmt.Sprintf("$%d", len(kanjiIDs)+1)
jlptPlaceholder2 := fmt.Sprintf("$%d", len(kanjiIDs)+2)
jlptPlaceholder3 := fmt.Sprintf("$%d", len(kanjiIDs)+3)
args[len(kanjiIDs)] = jlptLevel
args[len(kanjiIDs)+1] = jlptLevel - 1
args[len(kanjiIDs)+2] = jlptLevel + 1

// Use kanjiArrayClause TWICE in query (for unnest and <@)
query := fmt.Sprintf(`... %s ... %s ...`, kanjiArrayClause, kanjiArrayClause, ...)
```

**Critical**: Same array clause used twice = same placeholders = same args values.

---

## API Endpoints

### 1. `POST /api/word-builder/start`

**Request:**
```json
{
  "jlpt_level": 4,
  "time_limit": 300
}
```

**Response:**
```json
{
  "session_id": 123,
  "kanji": [
    {
      "id": 456,
      "character": "日",
      "onyomi": "ニチ ジツ",
      "kunyomi": "ひ び",
      "meanings": ["day", "sun", "Japan"],
      "jlpt": 4
    },
    // ... 4 more kanji
  ],
  "valid_words": [
    {
      "kanji": "日本",
      "kana": "にほん",
      "english": "Japan",
      "word_id": 789,
      "kanji_ids": [456, 457]
    },
    // ... more words
  ],
  "time_limit": 300
}
```

**Handler**: `StartSession()`
- Validates JLPT level (1-5) and time limit (60-3600s)
- Calls `getSmartKanji(5, nil)`
- Calls `computeValidWords()`
- Creates `learning_activity` record
- Returns response

---

### 2. `POST /api/word-builder/refresh`

**Request:**
```json
{
  "session_id": 123,
  "jlpt_level": 4,
  "used_kanji_ids": [456, 457, 458, 459, 460]
}
```

**Response:**
```json
{
  "kanji": [
    // ... 5 new kanji
  ],
  "valid_words": [
    // ... valid words for new kanji
  ]
}
```

**Handler**: `RefreshKanji()`
- Validates JLPT level
- Calls `getSmartKanji(5, used_kanji_ids)` to exclude used kanji
- Calls `computeValidWords()` for new kanji
- Optionally updates `learning_activity` (non-blocking)
- Returns response

---

### 3. `POST /api/word-builder/submit`

**Request:**
```json
{
  "session_id": 123,
  "formed_words": ["日本", "日本人"],
  "total_attempts": 5,
  "time_spent": 180,
  "refresh_count": 2
}
```

**Response:**
```json
{
  "session_id": 123,
  "words_formed": 2,
  "accuracy": 40.0,
  "time_spent": 180
}
```

**Handler**: `SubmitResults()`
- Validates session exists and belongs to user
- Calculates accuracy: `(formed_words.length / total_attempts) * 100`
- Updates `learning_activity`:
  - `completed_at`: Current timestamp
  - `correct_count`: `len(formed_words)`
  - `item_count`: `total_attempts`
  - `total_time_seconds`: `time_spent`
  - `config`: `{"formed_words": [...], "refresh_count": N}`
- Returns response

---

## Critical Implementation Details

### 1. PostgreSQL Placeholder Syntax

**ALWAYS use `$N` format, NEVER `?`**

```go
// ✅ CORRECT
h.DB.Raw("SELECT * FROM kanji WHERE id = $1", kanjiID)

// ❌ WRONG (MySQL syntax)
h.DB.Raw("SELECT * FROM kanji WHERE id = ?", kanjiID)
```

**For Dynamic Arrays:**
```go
// Build placeholders
placeholders := make([]string, len(ids))
args := make([]interface{}, len(ids))
for i, id := range ids {
    placeholders[i] = fmt.Sprintf("$%d", i+1)
    args[i] = id
}
arrayClause := "ARRAY[" + strings.Join(placeholders, ",") + "]::int[]"

// Use in query
query := fmt.Sprintf("SELECT * FROM words WHERE kanji_ids <@ %s", arrayClause)
h.DB.Raw(query, args...)
```

**Critical**: When reusing array clause, use SAME placeholders and SAME args.

---

### 2. JSONB Field Scanning

**Problem**: GORM's JSONB scanning is unreliable. Direct `[]byte` scan fails.

**Solution**: Cast to `::text` then scan as string:

```go
// ✅ CORRECT
var result struct {
    Meanings string
}
err := h.DB.Raw("SELECT COALESCE(meanings::text, 'null') as meanings FROM kanji WHERE id = $1", kanjiID).Scan(&result).Error
if err == nil && result.Meanings != "" && result.Meanings != "null" {
    var meanings []string
    json.Unmarshal([]byte(result.Meanings), &meanings)
}

// ❌ WRONG (fails with scan error)
var meaningsJSON []byte
err := h.DB.Raw("SELECT meanings FROM kanji WHERE id = $1", kanjiID).Scan(&meaningsJSON).Error
```

**Alternative**: Use `kanji.StringSlice` type (if available):
```go
import "lang-portal/internal/handlers/kanji"

var k kanji.KanjiModel
h.DB.Raw("SELECT meanings FROM kanji WHERE id = $1", kanjiID).Scan(&k)
meanings := []string(k.Meanings)
```

---

### 3. Array Containment (`<@`) Operator

**Purpose**: Check if all elements of left array are in right array.

**Syntax**: `left_array <@ right_array`

**Examples:**
```sql
-- ✅ TRUE
ARRAY[1, 2] <@ ARRAY[1, 2, 3]
ARRAY[1] <@ ARRAY[1, 2, 3]

-- ❌ FALSE
ARRAY[1, 4] <@ ARRAY[1, 2, 3]  -- 4 not in right array
ARRAY[1, 2, 3, 4] <@ ARRAY[1, 2, 3]  -- 4 not in right array
```

**In Query:**
```sql
WHERE wk.word_kanji_ids <@ ARRAY[$1, $2, $3, $4, $5]::int[]
```

**Critical**: This ensures word's kanji are ENTIRELY within provided set.

---

### 4. DISTINCT vs ORDER BY in array_agg

**Problem**: PostgreSQL doesn't allow `DISTINCT` and `ORDER BY` together in `array_agg`.

**Solution**: Remove `DISTINCT` (grouping by `word_id` handles duplicates):

```sql
-- ✅ CORRECT
array_agg(ir.to_id ORDER BY COALESCE(ir.position, 999), ir.to_id)

-- ❌ WRONG
array_agg(DISTINCT ir.to_id ORDER BY ...)  -- Error: ORDER BY expressions must appear in argument list
```

**Why it works**: `GROUP BY ir.from_id` ensures each `word_id` appears once, so duplicates are impossible.

---

### 5. JLPT Filter Relaxation

**Problem**: Strict JLPT filtering (`w.jlpt = $1`) returns too few words.

**Solution**: Relaxed filter includes NULL and ±1 levels:

```sql
WHERE (w.jlpt = $1 OR w.jlpt IS NULL OR w.jlpt BETWEEN $2 AND $3)
-- $1 = jlptLevel
-- $2 = jlptLevel - 1
-- $3 = jlptLevel + 1
```

**Rationale**: 
- NULL words are unclassified (often beginner-friendly)
- ±1 levels provide variety without being too difficult

---

### 6. Kanji Order Preservation

**Critical**: Kanji order in words matters (e.g., "日本" ≠ "本日").

**Solution**: Use `position` field in `item_relations`:

```sql
array_agg(ir.to_id ORDER BY COALESCE(ir.position, 999), ir.to_id)
```

**Fallback**: If `position` is NULL, use `999` (end of array), then sort by `to_id` for consistency.

---

## Common Issues & Solutions

### Issue 1: "Scan error on column index 0, name 'meanings': converting driver.Value type []uint8 to a uint8"

**Cause**: GORM trying to scan JSONB directly into incompatible type.

**Solution**: Cast to `::text` and scan as string:
```go
var result struct {
    Meanings string
}
h.DB.Raw("SELECT COALESCE(meanings::text, 'null') as meanings FROM kanji WHERE id = $1", kanjiID).Scan(&result)
```

---

### Issue 2: "expected N arguments, got 0"

**Cause**: Placeholder mismatch in `fmt.Sprintf()` vs `args` array.

**Solution**: 
1. Build placeholders and args together
2. Use same array clause for multiple uses
3. Verify args length matches placeholder count

**Debug:**
```go
fmt.Printf("Query: %s\n", query)
fmt.Printf("Args: %v\n", args)
fmt.Printf("Args count: %d\n", len(args))
```

---

### Issue 3: Empty `valid_words` Array

**Possible Causes:**
1. **No words match kanji set**: Check if kanji actually form words together
2. **JLPT filter too strict**: Relax filter (already done)
3. **Array containment logic wrong**: Verify `<@` operator usage
4. **item_relations empty**: Run `build_complete_graph()`

**Debug Query:**
```sql
-- Check if kanji form words together
WITH s AS (
    SELECT unnest(ARRAY[456, 457, 458, 459, 460]::int[]) AS kanji_id
)
SELECT COUNT(DISTINCT ir.from_id) as word_count
FROM item_relations ir
JOIN s ON s.kanji_id = ir.to_id
WHERE ir.from_type = 'word'
    AND ir.rel_type = 'USES_KANJI'
    AND ir.to_type = 'kanji';
```

---

### Issue 4: "for SELECT DISTINCT, ORDER BY expressions must appear in select list"

**Cause**: Using `SELECT DISTINCT` with `ORDER BY RANDOM()`.

**Solution**: Use subquery:
```sql
-- ✅ CORRECT
SELECT * FROM (
    SELECT DISTINCT k.id, k.character, ...
    FROM kanji k
    ...
) sub
ORDER BY RANDOM()
LIMIT 1

-- ❌ WRONG
SELECT DISTINCT k.id, k.character, ...
FROM kanji k
...
ORDER BY RANDOM()
LIMIT 1
```

---

### Issue 5: Meanings Always Empty

**Cause**: `meanings` JSONB is NULL, and fallbacks not working.

**Solution**: Check fallback chain:
1. Verify `meanings` is NULL: `SELECT meanings FROM kanji WHERE id = $1`
2. Check `detail`: `SELECT detail FROM kanji WHERE id = $1`
3. Check `heisig_en`: `SELECT heisig_en FROM kanji WHERE id = $1`
4. If all NULL, return error (handled in code)

---

## Testing Guide

### Unit Tests

**Test `getKanjiMeanings()`:**
```go
func TestGetKanjiMeanings(t *testing.T) {
    // Test with meanings JSONB
    // Test with detail fallback
    // Test with heisig_en fallback
    // Test with all NULL (should error)
}
```

**Test `getSmartKanji()`:**
```go
func TestGetSmartKanji(t *testing.T) {
    // Test seed selection
    // Test companion selection
    // Test excludeIDs
    // Test with insufficient kanji (should return what's available)
}
```

**Test `computeValidWords()`:**
```go
func TestComputeValidWords(t *testing.T) {
    // Test with known kanji set
    // Test with empty kanji set
    // Test array containment logic
}
```

### Integration Tests

**Test Full Flow:**
```go
func TestWordBuilderFlow(t *testing.T) {
    // 1. Start session
    // 2. Verify kanji returned
    // 3. Verify valid_words returned
    // 4. Refresh kanji
    // 5. Submit results
    // 6. Verify learning_activity updated
}
```

### Manual Testing

**1. Start Session:**
```bash
curl -X POST http://localhost:8080/api/word-builder/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"jlpt_level": 4, "time_limit": 300}'
```

**2. Refresh Kanji:**
```bash
curl -X POST http://localhost:8080/api/word-builder/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"session_id": 123, "jlpt_level": 4, "used_kanji_ids": [456, 457, 458, 459, 460]}'
```

**3. Submit Results:**
```bash
curl -X POST http://localhost:8080/api/word-builder/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"session_id": 123, "formed_words": ["日本"], "total_attempts": 5, "time_spent": 180, "refresh_count": 0}'
```

---

## Debugging Tips

### 1. Enable SQL Logging

```go
h.DB = db.Debug()  // Logs all SQL queries
```

### 2. Print Query and Args

```go
fmt.Printf("Query: %s\n", query)
fmt.Printf("Args: %v\n", args)
fmt.Printf("Args count: %d\n", len(args))
```

### 3. Test Queries Directly in PostgreSQL

```sql
-- Test getKanjiMeanings
SELECT COALESCE(meanings::text, 'null') as meanings FROM kanji WHERE id = 456;

-- Test getSmartKanji seed selection
SELECT k.id, COUNT(DISTINCT ir2.to_id) AS companion_kanji_count
FROM kanji k
JOIN item_relations ir ON k.id = ir.to_id AND ir.from_type = 'word' AND ir.to_type = 'kanji' AND ir.rel_type = 'USES_KANJI'
JOIN item_relations ir2 ON ir.from_id = ir2.from_id AND ir2.from_type = 'word' AND ir2.to_type = 'kanji' AND ir2.rel_type = 'USES_KANJI' AND ir2.to_id != k.id
WHERE k.jlpt = 4
GROUP BY k.id
HAVING COUNT(DISTINCT ir2.to_id) >= 10
ORDER BY companion_kanji_count DESC, k.frequency DESC NULLS LAST
LIMIT 100;

-- Test computeValidWords
WITH s AS (
    SELECT unnest(ARRAY[456, 457, 458, 459, 460]::int[]) AS kanji_id
),
words_for_s AS (
    SELECT DISTINCT ir.from_id AS word_id
    FROM item_relations ir
    JOIN s ON s.kanji_id = ir.to_id
    WHERE ir.from_type = 'word' AND ir.rel_type = 'USES_KANJI' AND ir.to_type = 'kanji'
),
word_kanji_sets AS (
    SELECT
        ir.from_id AS word_id,
        array_agg(ir.to_id ORDER BY COALESCE(ir.position, 999), ir.to_id) AS word_kanji_ids
    FROM item_relations ir
    JOIN words_for_s w ON w.word_id = ir.from_id
    WHERE ir.from_type = 'word' AND ir.rel_type = 'USES_KANJI' AND ir.to_type = 'kanji'
    GROUP BY ir.from_id
)
SELECT w.id, w.kanji, w.kana, w.english, wk.word_kanji_ids
FROM word_kanji_sets wk
JOIN words w ON w.id = wk.word_id
WHERE wk.word_kanji_ids <@ ARRAY[456, 457, 458, 459, 460]::int[]
    AND w.kanji IS NOT NULL
    AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
    AND LENGTH(w.kanji) BETWEEN 1 AND 4
    AND (w.jlpt = 4 OR w.jlpt IS NULL OR w.jlpt BETWEEN 3 AND 5)
    AND cardinality(wk.word_kanji_ids) >= 1
ORDER BY cardinality(wk.word_kanji_ids) DESC, w.kanji;
```

### 4. Check Graph Relationships

```sql
-- Verify item_relations is populated
SELECT COUNT(*) FROM item_relations WHERE rel_type = 'USES_KANJI';

-- Check relationships for specific kanji
SELECT w.id, w.kanji, w.kana, w.english
FROM item_relations ir
JOIN words w ON w.id = ir.from_id
WHERE ir.to_id = 456  -- kanji ID
    AND ir.from_type = 'word'
    AND ir.to_type = 'kanji'
    AND ir.rel_type = 'USES_KANJI';
```

---

## Summary

### Key Takeaways

1. **Simple Kanji Selection**: Uses frequency-based selection with `ORDER BY RANDOM()` for variety (no complex graph relationships needed)
2. **Array Containment**: Uses `<@` operator to ensure words use ONLY provided kanji
3. **JSONB Scanning**: Use `kanji.StringSlice` type which properly implements `sql.Scanner` for JSONB arrays
4. **PostgreSQL Placeholders**: Always use `$N` format, never `?`
5. **Meaning Fallback**: meanings (JSONB) → detail (TEXT) → heisig_en (TEXT) → error
6. **JLPT Relaxation**: Include NULL and ±1 levels for better word coverage
7. **File Organization**: Functions split into focused files for better maintainability

### Critical Files

- `internal/handlers/word_builder/word_builder_handler.go`: HTTP handlers
- `internal/handlers/word_builder/word_builder_kanji_selection.go`: Kanji selection (simplified frequency-based)
- `internal/handlers/word_builder/word_builder_kanji_meanings.go`: Kanji meanings retrieval
- `internal/handlers/word_builder/word_builder_word_computation.go`: Valid word computation
- `internal/handlers/word_builder/types.go`: Data structures

### Database Dependencies

- `kanji` table: Kanji data with meanings
- `words` table: Vocabulary data
- `item_relations` table: Graph relationships (MUST be populated via `build_complete_graph()`)

---

**Last Updated**: 2025-11-14
**Author**: AI Assistant
**Status**: Production Ready (with known issues documented)

