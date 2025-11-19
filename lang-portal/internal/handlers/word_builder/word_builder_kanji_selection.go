package word_builder

import (
	"fmt"
	"log"
	"strings"

	pq "github.com/lib/pq"
)

// getSimpleKanji builds a simple chain: K1 → word → K2 → word → K3 → ... → K6
// Optimized approach: Uses kanji_adjacency_map materialized view for faster queries,
// smart seed selection prioritizing high-connectivity kanji, and fallback strategy for N1/N2
func (h *WordBuilderHandler) getSimpleKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	// Calculate JLPT range (allow ±1 level flexibility)
	jlptMin := jlptLevel - 1
	if jlptMin < 1 {
		jlptMin = 1
	}
	jlptMax := jlptLevel + 1
	if jlptMax > 5 {
		jlptMax = 5
	}

	// Determine minimum word connections required for seed selection
	// N1 needs higher connectivity (3+), N2 needs moderate (2+), others can be flexible
	minWordConnections := 2
	if jlptLevel == 1 {
		minWordConnections = 3 // N1 requires higher connectivity
	}

	maxRetries := 10
	// For N1/N2, try with reduced count as fallback
	fallbackCounts := []int{count}
	if jlptLevel <= 2 && count >= 6 {
		fallbackCounts = []int{count, 5, 4} // Try 6, then 5, then 4
	}

	for _, targetCount := range fallbackCounts {
		for attempt := 0; attempt < maxRetries; attempt++ {
			log.Printf("[getSimpleKanji] Attempt %d/%d: JLPT level %d (range %d-%d), target: %d, excludeIDs: %v",
				attempt+1, maxRetries, jlptLevel, jlptMin, jlptMax, targetCount, excludeIDs)

			// 1. Find seed kanji with high connectivity using materialized view
			// Prioritize kanji with many word connections for better chain building
			// No frequency requirement - use all kanji that appear in words
			var seedQuery string
			var args []interface{}
			if len(excludeIDs) > 0 {
				seedQuery = `
					SELECT kam.kanji_id
					FROM kanji_adjacency_map kam
					WHERE kam.kanji_jlpt BETWEEN $1 AND $2
					  AND kam.kanji_id != ALL($3::bigint[])
					GROUP BY kam.kanji_id
					HAVING COUNT(DISTINCT kam.word_id) >= $4
					ORDER BY 
						COUNT(DISTINCT kam.word_id) DESC,
						RANDOM()
					LIMIT 1
				`
				args = []interface{}{jlptMin, jlptMax, pq.Array(excludeIDs), minWordConnections}
			} else {
				seedQuery = `
					SELECT kam.kanji_id
					FROM kanji_adjacency_map kam
					WHERE kam.kanji_jlpt BETWEEN $1 AND $2
					GROUP BY kam.kanji_id
					HAVING COUNT(DISTINCT kam.word_id) >= $3
					ORDER BY 
						COUNT(DISTINCT kam.word_id) DESC,
						RANDOM()
					LIMIT 1
				`
				args = []interface{}{jlptMin, jlptMax, minWordConnections}
			}

			var currentKanjiID int64
			err := sqlDB.QueryRow(seedQuery, args...).Scan(&currentKanjiID)
			if err != nil {
				log.Printf("[getSimpleKanji] Attempt %d: Failed to find seed kanji: %v", attempt+1, err)
				// If no high-connectivity seed found, try with lower threshold
				if minWordConnections > 1 {
					minWordConnections = 1
					continue
				}
				continue // Try next attempt
			}
			log.Printf("[getSimpleKanji] Attempt %d: Found seed kanji ID: %d", attempt+1, currentKanjiID)

			// 2. Start chain with seed kanji
			collectedKanji := []int64{currentKanjiID}
			usedWords := map[int64]bool{} // Track words we've already used to avoid loops

			// 3. Build chain: K1 → word → K2 → word → K3 → ... → K6
			// Use materialized view for faster lookups
			for len(collectedKanji) < targetCount {
				log.Printf("[getSimpleKanji] Attempt %d: Step %d/%d - Current kanji: %d, Collected so far: %v",
					attempt+1, len(collectedKanji), targetCount, currentKanjiID, collectedKanji)

				// Find a word using current kanji from materialized view (exclude words we've already used)
				var wordQuery string
				var wordArgs []interface{}
				if len(usedWords) > 0 {
					usedWordIDs := make([]int64, 0, len(usedWords))
					for wID := range usedWords {
						usedWordIDs = append(usedWordIDs, wID)
					}
					wordQuery = `
						SELECT kam.word_id
						FROM kanji_adjacency_map kam
						JOIN words w ON w.id = kam.word_id
						WHERE kam.kanji_id = $1
						  AND kam.kanji_jlpt BETWEEN $2 AND $3
						  AND (w.jlpt BETWEEN $2 AND $3 OR w.jlpt IS NULL)
						  AND kam.word_id != ALL($4::bigint[])
						ORDER BY RANDOM()
						LIMIT 1
					`
					wordArgs = []interface{}{currentKanjiID, jlptMin, jlptMax, pq.Array(usedWordIDs)}
				} else {
					wordQuery = `
						SELECT kam.word_id
						FROM kanji_adjacency_map kam
						JOIN words w ON w.id = kam.word_id
						WHERE kam.kanji_id = $1
						  AND kam.kanji_jlpt BETWEEN $2 AND $3
						  AND (w.jlpt BETWEEN $2 AND $3 OR w.jlpt IS NULL)
						ORDER BY RANDOM()
						LIMIT 1
					`
					wordArgs = []interface{}{currentKanjiID, jlptMin, jlptMax}
				}

				var wordID int64
				err := sqlDB.QueryRow(wordQuery, wordArgs...).Scan(&wordID)
				if err != nil {
					log.Printf("[getSimpleKanji] Attempt %d: Step %d - No word found for kanji %d (used words: %v): %v",
						attempt+1, len(collectedKanji), currentKanjiID, usedWords, err)
					break // No word found, try new seed
				}
				log.Printf("[getSimpleKanji] Attempt %d: Step %d - Found word ID: %d for kanji %d",
					attempt+1, len(collectedKanji), wordID, currentKanjiID)

				// Mark this word as used
				usedWords[wordID] = true

				// Extract another kanji from that word using materialized view
				// Use the neighbor_kanji_ids array from the materialized view
				excludeAll := make([]int64, 0, len(collectedKanji)+len(excludeIDs))
				excludeAll = append(excludeAll, collectedKanji...)
				excludeAll = append(excludeAll, excludeIDs...)

				var kanjiQuery string
				var kanjiArgs []interface{}
				if len(excludeAll) > 0 {
					kanjiQuery = `
						SELECT neighbor_id
						FROM kanji_adjacency_map kam,
						     LATERAL unnest(kam.neighbor_kanji_ids) AS neighbor_id
						JOIN kanji k ON k.id = neighbor_id
						WHERE kam.word_id = $1
						  AND neighbor_id != ALL($2::bigint[])
						  AND k.jlpt BETWEEN $3 AND $4
						ORDER BY RANDOM()
						LIMIT 1
					`
					kanjiArgs = []interface{}{wordID, pq.Array(excludeAll), jlptMin, jlptMax}
				} else {
					kanjiQuery = `
						SELECT neighbor_id
						FROM kanji_adjacency_map kam,
						     LATERAL unnest(kam.neighbor_kanji_ids) AS neighbor_id
						JOIN kanji k ON k.id = neighbor_id
						WHERE kam.word_id = $1
						  AND k.jlpt BETWEEN $2 AND $3
						ORDER BY RANDOM()
						LIMIT 1
					`
					kanjiArgs = []interface{}{wordID, jlptMin, jlptMax}
				}

				var nextKanjiID int64
				err = sqlDB.QueryRow(kanjiQuery, kanjiArgs...).Scan(&nextKanjiID)
				if err != nil {
					log.Printf("[getSimpleKanji] Attempt %d: Step %d - No new kanji found in word %d (exclude: %v): %v",
						attempt+1, len(collectedKanji), wordID, excludeAll, err)
					break // No new kanji found, try new seed
				}
				log.Printf("[getSimpleKanji] Attempt %d: Step %d - Extracted kanji ID: %d from word %d",
					attempt+1, len(collectedKanji), nextKanjiID, wordID)

				// Add to collection
				collectedKanji = append(collectedKanji, nextKanjiID)
				currentKanjiID = nextKanjiID
			}

			log.Printf("[getSimpleKanji] Attempt %d: Collected %d kanji: %v", attempt+1, len(collectedKanji), collectedKanji)

			// If we got enough kanji, return them
			if len(collectedKanji) >= targetCount {
				log.Printf("[getSimpleKanji] Success! Returning %d kanji (target was %d)", len(collectedKanji), count)
				return h.getKanjiDetails(collectedKanji[:targetCount])
			}
		}
	}

	// All retries failed - return error
	log.Printf("[getSimpleKanji] FAILED: Could not find %d connected kanji after %d attempts (JLPT: %d, excludeIDs: %v)",
		count, maxRetries, jlptLevel, excludeIDs)
	return nil, fmt.Errorf("could not find %d connected kanji after %d attempts", count, maxRetries)
}

// getKanjiDetails retrieves full kanji information for the given IDs
func (h *WordBuilderHandler) getKanjiDetails(kanjiIDs []int64) ([]KanjiData, error) {
	if len(kanjiIDs) == 0 {
		return []KanjiData{}, nil
	}

	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	// Build placeholders for IN clause
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
			k.frequency
		FROM kanji k
		WHERE k.id IN (%s)
		ORDER BY k.id
	`, strings.Join(placeholders, ","))

	rows, err := sqlDB.Query(detailQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query kanji details: %w", err)
	}
	defer rows.Close()

	var kanjiList []struct {
		ID        int64
		Character string
		Onyomi    *string
		Kunyomi   *string
		JLPT      *int
		Frequency *int
	}

	for rows.Next() {
		var k struct {
			ID        int64
			Character string
			Onyomi    *string
			Kunyomi   *string
			JLPT      *int
			Frequency *int
		}
		if err := rows.Scan(&k.ID, &k.Character, &k.Onyomi, &k.Kunyomi, &k.JLPT, &k.Frequency); err != nil {
			return nil, fmt.Errorf("failed to scan kanji: %w", err)
		}
		kanjiList = append(kanjiList, k)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

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
