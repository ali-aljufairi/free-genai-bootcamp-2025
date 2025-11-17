package word_builder

import (
	"fmt"
	"log"
	"math/rand"
	"strings"

	pq "github.com/lib/pq"
)

// getSmartKanji builds a chain of kanji by traversing word relationships
// Uses PostgreSQL function build_kanji_chain() to leverage graph traversal
// Returns exactly the requested count (default 6) of connected kanji
func (h *WordBuilderHandler) getSmartKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	// Get underlying database connection
	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	// Convert excludeIDs to PostgreSQL array format
	var excludeArray interface{}
	if len(excludeIDs) > 0 {
		excludeArray = pq.Array(excludeIDs)
	} else {
		excludeArray = pq.Array([]int64{})
	}

	// Call PostgreSQL function to build kanji chain
	// The function handles seed selection, traversal, and dead-end handling
	query := `
		SELECT unnest(build_kanji_chain($1, $2, $3)) AS kanji_id
	`

	log.Printf("[getSmartKanji] Calling build_kanji_chain(jlpt=%d, count=%d, exclude=%v)", jlptLevel, count, excludeIDs)
	var kanjiIDs []int64
	rows, err := sqlDB.Query(query, jlptLevel, count, excludeArray)
	if err != nil {
		log.Printf("[getSmartKanji] PostgreSQL function error: %v, falling back to simple selection", err)
		// If PostgreSQL function fails, fall back to simple selection
		return h.getSmartKanjiFallback(jlptLevel, count, excludeIDs)
	}
	defer rows.Close()

	for rows.Next() {
		var kanjiID int64
		if err := rows.Scan(&kanjiID); err != nil {
			return nil, fmt.Errorf("failed to scan kanji ID: %w", err)
		}
		kanjiIDs = append(kanjiIDs, kanjiID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	log.Printf("[getSmartKanji] PostgreSQL function returned %d kanji IDs: %v", len(kanjiIDs), kanjiIDs)

	// If we got no kanji or fewer than requested, fall back
	if len(kanjiIDs) == 0 {
		log.Printf("[getSmartKanji] No kanji returned, falling back to simple selection")
		return h.getSmartKanjiFallback(jlptLevel, count, excludeIDs)
	}

	// If we got fewer than requested (but at least 1), still use what we got
	// The PostgreSQL function tries multiple times, so if it returns fewer,
	// it means it couldn't find enough connected kanji

	// Build placeholders for IN clause to get full kanji details
	placeholders := make([]string, len(kanjiIDs))
	args := make([]interface{}, len(kanjiIDs))
	for i, id := range kanjiIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}

	// Get full kanji details
	detailQuery := fmt.Sprintf(`
		SELECT 
			k.id,
			k.character,
			k.onyomi,
			k.kunyomi,
			k.jlpt,
			k.heisig_en,
			k.frequency
		FROM kanji k
		WHERE k.id IN (%s)
		ORDER BY k.frequency DESC NULLS LAST
	`, strings.Join(placeholders, ","))

	detailRows, err := sqlDB.Query(detailQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query kanji details: %w", err)
	}
	defer detailRows.Close()

	var kanjiList []struct {
		ID        int64
		Character string
		Onyomi    *string
		Kunyomi   *string
		JLPT      *int
		HeisigEn  *string
		Frequency *int
	}

	for detailRows.Next() {
		var k struct {
			ID        int64
			Character string
			Onyomi    *string
			Kunyomi   *string
			JLPT      *int
			HeisigEn  *string
			Frequency *int
		}
		if err := detailRows.Scan(&k.ID, &k.Character, &k.Onyomi, &k.Kunyomi, &k.JLPT, &k.HeisigEn, &k.Frequency); err != nil {
			return nil, fmt.Errorf("failed to scan kanji: %w", err)
		}
		kanjiList = append(kanjiList, k)
	}

	if err := detailRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating detail rows: %w", err)
	}

	// Shuffle for additional variety
	rand.Shuffle(len(kanjiList), func(i, j int) {
		kanjiList[i], kanjiList[j] = kanjiList[j], kanjiList[i]
	})

	// Convert to KanjiData and get meanings
	result := make([]KanjiData, 0, len(kanjiList))
	for _, k := range kanjiList {
		meanings, err := h.getKanjiMeanings(k.ID)
		if err != nil {
			// If we can't get meanings, use empty array (shouldn't happen but handle gracefully)
			meanings = []string{}
		}

		result = append(result, KanjiData{
			ID:        k.ID,
			Character: k.Character,
			Onyomi:    k.Onyomi,
			Kunyomi:   k.Kunyomi,
			Meanings:  meanings,
			JLPT:      k.JLPT,
		})
	}

	return result, nil
}

// getSmartKanjiFallback is the original simple selection method used as fallback
func (h *WordBuilderHandler) getSmartKanjiFallback(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	// Build exclude clause if needed
	excludeClause := ""
	args := []interface{}{jlptLevel}
	argNum := 2

	if len(excludeIDs) > 0 {
		excludePlaceholders := make([]string, len(excludeIDs))
		for i, id := range excludeIDs {
			excludePlaceholders[i] = fmt.Sprintf("$%d", argNum)
			args = append(args, id)
			argNum++
		}
		excludeClause = fmt.Sprintf("AND k.id NOT IN (%s)", strings.Join(excludePlaceholders, ","))
	}

	// Simple query: select kanji with frequency, ordered by random for variety
	query := fmt.Sprintf(`
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
			%s
		ORDER BY RANDOM()
		LIMIT $%d
	`, excludeClause, argNum)
	args = append(args, count)

	var kanjiList []struct {
		ID        int64
		Character string
		Onyomi    *string
		Kunyomi   *string
		JLPT      *int
		HeisigEn  *string
		Frequency *int
	}

	err := h.DB.Raw(query, args...).Scan(&kanjiList).Error
	if err != nil {
		return nil, fmt.Errorf("failed to select kanji: %w", err)
	}

	if len(kanjiList) == 0 {
		return nil, fmt.Errorf("no kanji with frequency found for JLPT level %d", jlptLevel)
	}

	// Shuffle for additional variety
	rand.Shuffle(len(kanjiList), func(i, j int) {
		kanjiList[i], kanjiList[j] = kanjiList[j], kanjiList[i]
	})

	// Convert to KanjiData and get meanings
	result := make([]KanjiData, 0, len(kanjiList))
	for _, k := range kanjiList {
		meanings, err := h.getKanjiMeanings(k.ID)
		if err != nil {
			meanings = []string{}
		}

		result = append(result, KanjiData{
			ID:        k.ID,
			Character: k.Character,
			Onyomi:    k.Onyomi,
			Kunyomi:   k.Kunyomi,
			Meanings:  meanings,
			JLPT:      k.JLPT,
		})
	}

	return result, nil
}

