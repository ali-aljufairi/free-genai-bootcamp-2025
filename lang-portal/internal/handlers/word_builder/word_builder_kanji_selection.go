package word_builder

import (
	"fmt"
	"math/rand"
	"strings"
)

// getSmartKanji selects kanji that actually form words together for the given JLPT level
// This ensures users always get kanji that can form valid words, making the game more engaging
func (h *WordBuilderHandler) getSmartKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	// Get underlying database connection
	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

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

	// Add JLPT range parameters
	jlptMin := jlptLevel - 1
	if jlptMin < 1 {
		jlptMin = 1
	}
	jlptMax := jlptLevel + 1
	if jlptMax > 5 {
		jlptMax = 5
	}

	// Query to find kanji groups that form words together
	// Strategy: Find words that use 2-5 kanji from the target JLPT level, then select a random group
	query := fmt.Sprintf(`
WITH shared_words AS (
	-- Find words that use 2-5 kanji from target JLPT level
	SELECT 
		w.id as word_id,
		array_agg(DISTINCT ir.to_id) as kanji_ids
	FROM words w
	JOIN item_relations ir ON ir.from_id = w.id
	JOIN kanji k ON k.id = ir.to_id
	WHERE ir.from_type = 'word'
		AND ir.rel_type = 'USES_KANJI'
		AND ir.to_type = 'kanji'
		AND k.jlpt = $1
		AND k.frequency IS NOT NULL
		%s
		AND w.kanji IS NOT NULL
		AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
		AND LENGTH(w.kanji) BETWEEN 2 AND 4
		AND (w.jlpt = $1 OR w.jlpt IS NULL OR w.jlpt BETWEEN $%d AND $%d)
	GROUP BY w.id
	HAVING COUNT(DISTINCT ir.to_id) BETWEEN 2 AND 5
		AND array_length(array_agg(DISTINCT ir.to_id), 1) <= $%d
),
kanji_groups AS (
	-- Group by kanji combination and count words
	-- Prefer groups with more kanji (closer to requested count)
	SELECT 
		kanji_ids,
		COUNT(*) as word_count
	FROM shared_words
	WHERE array_length(kanji_ids, 1) >= 2
	GROUP BY kanji_ids
	HAVING COUNT(*) >= 1
	ORDER BY 
		CASE WHEN array_length(kanji_ids, 1) >= $%d THEN 0 ELSE 1 END,  -- Prefer groups with enough kanji
		array_length(kanji_ids, 1) DESC,  -- Then prefer larger groups
		RANDOM()
	LIMIT 1
)
-- Select kanji from the chosen group (up to requested count)
SELECT DISTINCT
	k.id,
	k.character,
	k.onyomi,
	k.kunyomi,
	k.jlpt,
	k.heisig_en,
	k.frequency
FROM kanji_groups kg
CROSS JOIN LATERAL unnest(kg.kanji_ids[1:$%d]) as kanji_id
JOIN kanji k ON k.id = kanji_id
ORDER BY k.frequency DESC NULLS LAST
LIMIT $%d
	`, excludeClause, argNum, argNum+1, argNum+2, argNum+3, argNum+4, argNum+5)
	
	args = append(args, jlptMin, jlptMax, count, count, count, count)

	rows, err := sqlDB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query smart kanji: %w", err)
	}
	defer rows.Close()

	var kanjiList []struct {
		ID        int64
		Character string
		Onyomi    *string
		Kunyomi   *string
		JLPT      *int
		HeisigEn  *string
		Frequency *int
	}

	for rows.Next() {
		var k struct {
			ID        int64
			Character string
			Onyomi    *string
			Kunyomi   *string
			JLPT      *int
			HeisigEn  *string
			Frequency *int
		}
		if err := rows.Scan(&k.ID, &k.Character, &k.Onyomi, &k.Kunyomi, &k.JLPT, &k.HeisigEn, &k.Frequency); err != nil {
			return nil, fmt.Errorf("failed to scan kanji: %w", err)
		}
		kanjiList = append(kanjiList, k)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	// If we didn't find a group that forms words, or got fewer than requested, fall back to simple selection
	// But if we got at least 2 kanji that form words, that's acceptable (better than random)
	if len(kanjiList) == 0 {
		return h.getSmartKanjiFallback(jlptLevel, count, excludeIDs)
	}
	
	// If we got fewer than requested but at least 2, we can keep it (they form words together)
	// But if we only got 1, fall back
	if len(kanjiList) == 1 {
		return h.getSmartKanjiFallback(jlptLevel, count, excludeIDs)
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

