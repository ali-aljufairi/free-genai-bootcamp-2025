package word_builder

import (
	"fmt"
	"strings"

	pq "github.com/lib/pq"
)

// computeValidWords finds all valid words that can be formed from the given kanji using graph relationships
// Uses CTE-based query with array containment for efficient and correct filtering
func (h *WordBuilderHandler) computeValidWords(kanji []KanjiData) ([]ValidWord, error) {
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

	// Build placeholder lists once and let GORM handle positional binding
	kanjiPlaceholderList := buildQuestionPlaceholders(len(kanjiIDs))

	args := make([]interface{}, 0, len(kanjiIDs)*2+3)
	for _, id := range kanjiIDs {
		args = append(args, id)
	}
	for _, id := range kanjiIDs {
		args = append(args, id)
	}
	args = append(args, jlptLevel, jlptLevel-1, jlptLevel+1)

	// Use ? placeholders so GORM rewrites them safely for PostgreSQL
	query := fmt.Sprintf(`
WITH s AS (
	SELECT unnest(ARRAY[%s]::int[]) AS kanji_id
),
words_for_s AS (
	SELECT DISTINCT ir.from_id AS word_id
	FROM item_relations ir
	JOIN s ON s.kanji_id = ir.to_id
	WHERE ir.from_type = 'word'
		AND ir.rel_type = 'USES_KANJI'
		AND ir.to_type = 'kanji'
),
word_kanji_sets AS (
	SELECT ir.from_id AS word_id,
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
WHERE wk.word_kanji_ids <@ ARRAY[%s]::int[]
	AND w.kanji IS NOT NULL
	AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
	AND LENGTH(w.kanji) BETWEEN 1 AND 4
	AND (w.jlpt = ? OR w.jlpt IS NULL OR w.jlpt BETWEEN ? AND ?)
	AND cardinality(wk.word_kanji_ids) >= 1
ORDER BY cardinality(wk.word_kanji_ids) DESC, w.kanji`, kanjiPlaceholderList, kanjiPlaceholderList)

	var results []struct {
		WordID       int64         `gorm:"column:word_id"`
		Kanji        string        `gorm:"column:kanji"`
		Kana         string        `gorm:"column:kana"`
		English      string        `gorm:"column:english"`
		WordKanjiIDs pq.Int64Array `gorm:"column:word_kanji_ids;type:integer[]"`
	}

	err := h.DB.Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query valid words: %w (kanji_ids: %v, jlpt_level: %d, query: %s, args_count: %d)", err, kanjiIDs, jlptLevel, query, len(args))
	}

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

	return validWords, nil
}

func buildQuestionPlaceholders(count int) string {
	if count <= 0 {
		return ""
	}
	return strings.TrimSuffix(strings.Repeat("?,", count), ",")
}
