# Word Builder Placeholder Bug - Issue Summary

## Problem
GORM's `Raw()` method reports "expected 13 arguments, got 0" when executing a complex PostgreSQL query with array parameters.

## Error Details
```
failed to query valid words: expected 13 arguments, got 0
```

## Root Cause
**GORM's `Raw()` method is not recognizing PostgreSQL placeholders (`$1`, `$2`, etc.) when they are embedded within dynamically built `ARRAY[...]` clauses using string concatenation.**

## Current Code Location
`internal/handlers/word_builder/word_builder_word_computation.go` - `computeValidWords()` function

## What's Happening

1. **Query Structure**: The query uses a CTE with `unnest(ARRAY[$1,$2,$3,$4,$5]::int[])` and later `ARRAY[$6,$7,$8,$9,$10]::int[]` for array containment
2. **Placeholder Building**: Placeholders are built using `fmt.Sprintf("$%d", i+1)` and joined into the query string
3. **Args Array**: 13 arguments are correctly prepared: `[kanji1, kanji2, kanji3, kanji4, kanji5, kanji1, kanji2, kanji3, kanji4, kanji5, jlpt, jlpt-1, jlpt+1]`
4. **GORM Issue**: When `h.DB.Raw(query, args...)` is called, GORM doesn't recognize the placeholders inside the `ARRAY[...]` syntax

## Example Query (What Gets Built)
```sql
WITH s AS (
    SELECT unnest(ARRAY[$1,$2,$3,$4,$5]::int[]) AS kanji_id
),
...
WHERE wk.word_kanji_ids <@ ARRAY[$6,$7,$8,$9,$10]::int[]
    AND (w.jlpt = $11 OR w.jlpt IS NULL OR w.jlpt BETWEEN $12 AND $13)
```

## Why It Fails
GORM's query parser may be:
1. Not parsing placeholders inside `ARRAY[...]` syntax correctly
2. Escaping `$` signs when building the query string
3. Requiring placeholders to be in a different format for array parameters

## Possible Solutions

### Option 1: Use PostgreSQL Array Literal Syntax
Instead of `ARRAY[$1,$2,...]`, use a single array parameter:
```go
// Pass array as single parameter using pgx array types
import "github.com/jackc/pgx/v5/pgtype"
arrayParam := &pgtype.Array[pgtype.Int8]{...}
h.DB.Raw("SELECT unnest($1::int[])", arrayParam)
```

### Option 2: Use GORM's Exec() with Raw SQL
Try using `Exec()` instead of `Raw().Scan()`:
```go
rows, err := h.DB.Raw(query, args...).Rows()
```

### Option 3: Use database/sql Directly (Bypass GORM)
Get underlying `*sql.DB` and use it directly:
```go
sqlDB, _ := h.DB.DB()
rows, err := sqlDB.Query(query, args...)
```

### Option 4: Simplify Query Structure
Avoid `ARRAY[...]` syntax entirely, use `ANY()` or `IN()`:
```sql
WHERE kanji_id = ANY($1::int[])
-- or
WHERE kanji_id IN ($1, $2, $3, $4, $5)
```

### Option 5: Use GORM's Named Arguments
Try using named arguments if GORM supports it:
```go
h.DB.Raw("SELECT * FROM table WHERE id = @id", map[string]interface{}{"id": 1})
```

## Recommended Approach
**Use Option 3 (database/sql directly)** - This bypasses GORM's query parsing entirely and uses the PostgreSQL driver (pgx) directly, which handles array parameters correctly.

## Test Case
```go
kanjiIDs := []int64{1331, 133, 1139, 472, 547}
jlptLevel := 4
// Should return valid words that can be formed from these kanji
```

## Files Affected
- `internal/handlers/word_builder/word_builder_word_computation.go` (line 80)
- Potentially need to add pgx dependency if using Option 1

## Related Documentation
- See `docs/WORD_BUILDER_HANDOVER.md` section "Common Issues & Solutions" → Issue 2
- PostgreSQL array parameter documentation: https://www.postgresql.org/docs/current/arrays.html

