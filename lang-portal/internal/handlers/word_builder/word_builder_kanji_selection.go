package word_builder

import (
	"fmt"
	"log"
	"strings"

	pq "github.com/lib/pq"
)

// getSimpleKanji builds a simple chain: K1 → word → K2 → word → K3 → ... → K6
// Simple approach: Start with 1 kanji, find word using it, extract another kanji, repeat
// This guarantees we always find 6 kanji if words exist in database
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

	maxRetries := 10
	for attempt := 0; attempt < maxRetries; attempt++ {
		log.Printf("[getSimpleKanji] Attempt %d/%d: JLPT level %d (range %d-%d), excludeIDs: %v", 
			attempt+1, maxRetries, jlptLevel, jlptMin, jlptMax, excludeIDs)
		
		// 1. Find seed kanji with frequency
		// Handle empty excludeIDs array properly
		var seedQuery string
		var args []interface{}
		if len(excludeIDs) > 0 {
			seedQuery = `
				SELECT k.id
				FROM kanji k
				WHERE k.jlpt BETWEEN $1 AND $2
				  AND k.id != ALL($3::bigint[])
				  AND k.frequency IS NOT NULL
				ORDER BY RANDOM()
				LIMIT 1
			`
			args = []interface{}{jlptMin, jlptMax, pq.Array(excludeIDs)}
		} else {
			seedQuery = `
				SELECT k.id
				FROM kanji k
				WHERE k.jlpt BETWEEN $1 AND $2
				  AND k.frequency IS NOT NULL
				ORDER BY RANDOM()
				LIMIT 1
			`
			args = []interface{}{jlptMin, jlptMax}
		}
		
		var currentKanjiID int64
		err := sqlDB.QueryRow(seedQuery, args...).Scan(&currentKanjiID)
		if err != nil {
			log.Printf("[getSimpleKanji] Attempt %d: Failed to find seed kanji: %v", attempt+1, err)
			// Debug: Check if kanji exist at all
			var count int
			checkQuery := `SELECT COUNT(*) FROM kanji WHERE jlpt BETWEEN $1 AND $2 AND frequency IS NOT NULL`
			if err2 := sqlDB.QueryRow(checkQuery, jlptMin, jlptMax).Scan(&count); err2 == nil {
				log.Printf("[getSimpleKanji] Attempt %d: DEBUG - Found %d kanji with JLPT %d-%d and frequency", attempt+1, count, jlptMin, jlptMax)
			}
			continue // Try next attempt
		}
		log.Printf("[getSimpleKanji] Attempt %d: Found seed kanji ID: %d", attempt+1, currentKanjiID)

		// 2. Start chain with seed kanji
		collectedKanji := []int64{currentKanjiID}
		usedWords := map[int64]bool{} // Track words we've already used to avoid loops

		// 3. Build chain: K1 → word → K2 → word → K3 → ... → K6
		for len(collectedKanji) < count {
			log.Printf("[getSimpleKanji] Attempt %d: Step %d/%d - Current kanji: %d, Collected so far: %v", 
				attempt+1, len(collectedKanji), count, currentKanjiID, collectedKanji)
			
			// Find a random word using current kanji (exclude words we've already used)
			var wordQuery string
			var wordArgs []interface{}
			if len(usedWords) > 0 {
				usedWordIDs := make([]int64, 0, len(usedWords))
				for wID := range usedWords {
					usedWordIDs = append(usedWordIDs, wID)
				}
				wordQuery = `
					SELECT ir.from_id as word_id
					FROM item_relations ir
					JOIN words w ON w.id = ir.from_id
					WHERE ir.to_id = $1
					  AND ir.rel_type = 'USES_KANJI'
					  AND ir.from_type = 'word'
					  AND w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
					  AND (w.jlpt BETWEEN $2 AND $3 OR w.jlpt IS NULL)
					  AND ir.from_id != ALL($4::bigint[])
					ORDER BY RANDOM()
					LIMIT 1
				`
				wordArgs = []interface{}{currentKanjiID, jlptMin, jlptMax, pq.Array(usedWordIDs)}
			} else {
				wordQuery = `
					SELECT ir.from_id as word_id
					FROM item_relations ir
					JOIN words w ON w.id = ir.from_id
					WHERE ir.to_id = $1
					  AND ir.rel_type = 'USES_KANJI'
					  AND ir.from_type = 'word'
					  AND w.kanji ~ '^[\u4E00-\u9FFF]{2,4}$'
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

			// Extract another kanji from that word (not already collected, not excluded)
			excludeAll := make([]int64, 0, len(collectedKanji)+len(excludeIDs))
			excludeAll = append(excludeAll, collectedKanji...)
			excludeAll = append(excludeAll, excludeIDs...)

			// Handle empty exclude array properly
			var kanjiQuery string
			var kanjiArgs []interface{}
			if len(excludeAll) > 0 {
				kanjiQuery = `
					SELECT ir.to_id as kanji_id
					FROM item_relations ir
					JOIN kanji k ON k.id = ir.to_id
					WHERE ir.from_id = $1
					  AND ir.rel_type = 'USES_KANJI'
					  AND ir.to_type = 'kanji'
					  AND ir.to_id != ALL($2::bigint[])
					  AND k.frequency IS NOT NULL
					  AND k.jlpt BETWEEN $3 AND $4
					ORDER BY RANDOM()
					LIMIT 1
				`
				kanjiArgs = []interface{}{wordID, pq.Array(excludeAll), jlptMin, jlptMax}
			} else {
				kanjiQuery = `
					SELECT ir.to_id as kanji_id
					FROM item_relations ir
					JOIN kanji k ON k.id = ir.to_id
					WHERE ir.from_id = $1
					  AND ir.rel_type = 'USES_KANJI'
					  AND ir.to_type = 'kanji'
					  AND k.frequency IS NOT NULL
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
		if len(collectedKanji) >= count {
			log.Printf("[getSimpleKanji] Success! Returning %d kanji", len(collectedKanji))
			return h.getKanjiDetails(collectedKanji[:count])
		}
	}

	// All retries failed - return error (NO random fallback)
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
		ORDER BY k.frequency DESC NULLS LAST
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

