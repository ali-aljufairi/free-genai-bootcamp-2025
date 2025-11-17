package word_builder

import (
	"fmt"
	"log"
	"strings"

	pq "github.com/lib/pq"
)

// ComputeValidWords finds all valid words that can be formed from the given kanji using graph relationships
// Uses CTE-based query with array containment for efficient and correct filtering
// Made public for testing
func (h *WordBuilderHandler) ComputeValidWords(kanji []KanjiData) ([]ValidWord, error) {
	if len(kanji) == 0 {
		return []ValidWord{}, nil
	}

	// Extract kanji IDs for array operations
	kanjiIDs := make([]int64, len(kanji))
	kanjiMap := make(map[int64]string) // id -> character (for fallback)
	for i, k := range kanji {
		kanjiIDs[i] = k.ID
		kanjiMap[k.ID] = k.Character
	}

	// Get JLPT level from first kanji (they should all be same level)
	jlptLevel := 4
	if len(kanji) > 0 && kanji[0].JLPT != nil {
		jlptLevel = *kanji[0].JLPT
	}

	// Get underlying *sql.DB connection to bypass GORM's placeholder parsing
	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	// Build PostgreSQL $N placeholders
	// Use pq.Array for the containment check to ensure proper type handling
	kanjiCount := len(kanjiIDs)
	placeholders1 := make([]string, kanjiCount)
	args := make([]interface{}, 0, kanjiCount+4)

	// Build placeholders and args for unnest
	for i := 0; i < kanjiCount; i++ {
		placeholders1[i] = fmt.Sprintf("$%d", i+1)
		args = append(args, kanjiIDs[i])
	}

	// Add kanji array parameter for containment check (using pq.Array for proper type)
	kanjiArrayParam := kanjiCount + 1
	args = append(args, pq.Array(kanjiIDs))
	
	// Add JLPT parameters
	jlptParam1 := kanjiCount + 2
	jlptParam2 := kanjiCount + 3
	jlptParam3 := kanjiCount + 4
	args = append(args, jlptLevel, jlptLevel-1, jlptLevel+1)
	
	query := fmt.Sprintf(`
WITH s AS (
	SELECT unnest(ARRAY[%s]::BIGINT[]) AS kanji_id
),
words_for_s AS (
	SELECT DISTINCT ir.from_id AS word_id
	FROM item_relations ir
	JOIN s ON s.kanji_id = ir.to_id::BIGINT
	WHERE ir.from_type = 'word'
		AND ir.rel_type = 'USES_KANJI'
		AND ir.to_type = 'kanji'
),
word_kanji_sets AS (
	SELECT ir.from_id AS word_id,
		array_agg(DISTINCT ir.to_id::BIGINT ORDER BY ir.to_id::BIGINT) AS word_kanji_ids
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
SELECT
	w.id AS word_id,
	w.kanji,
	w.kana,
	w.english,
	wk.word_kanji_ids
FROM word_kanji_sets wk
JOIN words w ON w.id = wk.word_id
WHERE wk.word_kanji_ids <@ $%d::BIGINT[]
	AND w.kanji IS NOT NULL
	AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
	AND LENGTH(w.kanji) BETWEEN 1 AND 4
	AND (w.jlpt = $%d OR w.jlpt IS NULL OR w.jlpt BETWEEN $%d AND $%d)
	AND cardinality(wk.word_kanji_ids) >= 1
ORDER BY cardinality(wk.word_kanji_ids) DESC, w.kanji`,
		strings.Join(placeholders1, ","),
		kanjiArrayParam,
		jlptParam1, jlptParam2, jlptParam3)

	// Log the query for debugging
	log.Printf("[ComputeValidWords] Querying with %d kanji IDs: %v (JLPT: %d)", len(kanjiIDs), kanjiIDs, jlptLevel)
	log.Printf("[ComputeValidWords] Query: %s", query)
	log.Printf("[ComputeValidWords] Args count: %d", len(args))

	// Execute query using database/sql directly
	rows, err := sqlDB.Query(query, args...)
	if err != nil {
		log.Printf("[ComputeValidWords] Query error: %v", err)
		return nil, fmt.Errorf("failed to query valid words: %w (kanji_ids: %v, jlpt_level: %d, args_count: %d)", err, kanjiIDs, jlptLevel, len(args))
	}
	defer rows.Close()

	var results []struct {
		WordID       int64
		Kanji        string
		Kana         string
		English      string
		WordKanjiIDs pq.Int64Array
	}

	// Scan results manually
	for rows.Next() {
		var r struct {
			WordID       int64
			Kanji        string
			Kana         string
			English      string
			WordKanjiIDs pq.Int64Array
		}
		if err := rows.Scan(&r.WordID, &r.Kanji, &r.Kana, &r.English, &r.WordKanjiIDs); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}
		results = append(results, r)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	log.Printf("[ComputeValidWords] Found %d candidate words from database", len(results))

	// Convert results to ValidWord format
	validWords := make([]ValidWord, 0, len(results))
	for _, r := range results {
		// Filter to only include kanji IDs that are in our set
		filteredKanjiIDs := make([]int64, 0, len(r.WordKanjiIDs))
		for _, kid := range []int64(r.WordKanjiIDs) {
			if _, exists := kanjiMap[kid]; exists {
				filteredKanjiIDs = append(filteredKanjiIDs, kid)
			}
		}

		// Only include if we have kanji IDs and all kanji in the word are from our set
		if len(filteredKanjiIDs) > 0 {
			validWords = append(validWords, ValidWord{
				Kanji:    r.Kanji,
				Kana:     r.Kana,
				English:  r.English,
				WordID:   r.WordID,
				KanjiIDs: filteredKanjiIDs,
			})
		}
	}

	log.Printf("[ComputeValidWords] Returning %d valid words after filtering", len(validWords))
	if len(validWords) == 0 && len(kanji) > 0 {
		log.Printf("[ComputeValidWords] WARNING: No valid words found for kanji IDs: %v", kanjiIDs)
	}

	return validWords, nil
}

func buildQuestionPlaceholders(count int) string {
	if count <= 0 {
		return ""
	}
	return strings.TrimSuffix(strings.Repeat("?,", count), ",")
}
