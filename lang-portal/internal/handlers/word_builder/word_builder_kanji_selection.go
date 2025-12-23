package word_builder

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"lang-portal/internal/config"
	"log"
	"sort"
	"strings"
	"time"

	pq "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

// getSimpleKanji builds a simple chain: K1 → word → K2 → word → K3 → ... → K6
// First tries the optimized SQL function build_kanji_chain, then falls back to Go implementation
// if SQL function fails or returns insufficient kanji
func (h *WordBuilderHandler) getSimpleKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	// Try SQL function first (has better path-finding logic)
	kanjiIDs, err := h.getKanjiUsingSQLFunction(jlptLevel, count, excludeIDs)
	if err == nil && len(kanjiIDs) >= count {
		log.Printf("[getSimpleKanji] SQL function succeeded with %d kanji", len(kanjiIDs))
		return h.getKanjiDetails(kanjiIDs[:count])
	}

	if err != nil {
		log.Printf("[getSimpleKanji] SQL function failed: %v, falling back to Go implementation", err)
	} else {
		log.Printf("[getSimpleKanji] SQL function returned only %d kanji (needed %d), falling back to Go implementation", len(kanjiIDs), count)
	}

	// Fall back to improved Go implementation
	return h.getSimpleKanjiGo(jlptLevel, count, excludeIDs)
}

// getKanjiUsingSQLFunction calls the PostgreSQL build_kanji_chain function
func (h *WordBuilderHandler) getKanjiUsingSQLFunction(jlptLevel int, count int, excludeIDs []int64) ([]int64, error) {
	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var kanjiArray pq.Int64Array
	err = sqlDB.QueryRow(
		"SELECT build_kanji_chain($1, $2, $3)",
		jlptLevel, count, pq.Array(excludeIDs),
	).Scan(&kanjiArray)

	if err != nil {
		return nil, fmt.Errorf("SQL function failed: %w", err)
	}

	if len(kanjiArray) == 0 {
		return nil, fmt.Errorf("SQL function returned empty array")
	}

	return []int64(kanjiArray), nil
}

// getSimpleKanjiGo builds a simple chain using Go: K1 → word → K2 → word → K3 → ... → K6
// Improved version with backtracking and better path selection
func (h *WordBuilderHandler) getSimpleKanjiGo(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
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

	maxRetries := MaxRetriesKanjiChain
	// For N1/N2, try with reduced count as fallback
	fallbackCounts := []int{count}
	if jlptLevel <= 2 && count >= 6 {
		fallbackCounts = []int{count, 5, 4} // Try 6, then 5, then 4
	}

	for _, targetCount := range fallbackCounts {
		for attempt := 0; attempt < maxRetries; attempt++ {
			log.Printf("[getSimpleKanjiGo] Attempt %d/%d: JLPT level %d (range %d-%d), target: %d, excludeIDs: %v",
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
				log.Printf("[getSimpleKanjiGo] Attempt %d: Failed to find seed kanji: %v", attempt+1, err)
				// If no high-connectivity seed found, try with lower threshold
				if minWordConnections > 1 {
					minWordConnections = 1
					continue
				}
				continue // Try next attempt
			}
			log.Printf("[getSimpleKanjiGo] Attempt %d: Found seed kanji ID: %d", attempt+1, currentKanjiID)

			// 2. Start chain with seed kanji
			collectedKanji := []int64{currentKanjiID}
			usedWords := map[int64]bool{} // Track words we've already used to avoid loops

			// 3. Build chain: K1 → word → K2 → word → K3 → ... → K6
			// Use materialized view for faster lookups
			// Improved: Try multiple words per kanji before giving up (backtracking)
			maxWordTriesPerKanji := MaxWordTriesPerKanji
			for len(collectedKanji) < targetCount {
				log.Printf("[getSimpleKanjiGo] Attempt %d: Step %d/%d - Current kanji: %d, Collected so far: %v",
					attempt+1, len(collectedKanji), targetCount, currentKanjiID, collectedKanji)

				// Find a word using current kanji (backtracking: try multiple words if needed)
				var wordID int64
				wordFound := false
				for wordTry := 0; wordTry < maxWordTriesPerKanji; wordTry++ {
					// Rebuild usedWordIDs list for each try (in case we added words)
					usedWordIDs := make([]int64, 0, len(usedWords))
					for wID := range usedWords {
						usedWordIDs = append(usedWordIDs, wID)
					}

					// Build query and args based on whether we have used words
					var wordQuery string
					var wordArgs []interface{}
					if len(usedWordIDs) > 0 {
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

					err := sqlDB.QueryRow(wordQuery, wordArgs...).Scan(&wordID)
					if err != nil {
						log.Printf("[getSimpleKanjiGo] Attempt %d: Step %d - Word try %d failed for kanji %d: %v",
							attempt+1, len(collectedKanji), wordTry+1, currentKanjiID, err)
						if wordTry == maxWordTriesPerKanji-1 {
							// Last try failed, give up on this kanji
							break
						}
						continue // Try another word
					}

					// Found a word - mark it as used and proceed to find kanji
					usedWords[wordID] = true
					wordFound = true
					log.Printf("[getSimpleKanjiGo] Attempt %d: Step %d - Found word ID: %d for kanji %d (try %d)",
						attempt+1, len(collectedKanji), wordID, currentKanjiID, wordTry+1)
					break
				}

				if !wordFound {
					log.Printf("[getSimpleKanjiGo] Attempt %d: Step %d - No word found for kanji %d after %d tries",
						attempt+1, len(collectedKanji), currentKanjiID, maxWordTriesPerKanji)
					break // No word found, try new seed
				}

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
					log.Printf("[getSimpleKanjiGo] Attempt %d: Step %d - No new kanji found in word %d (exclude: %v): %v",
						attempt+1, len(collectedKanji), wordID, excludeAll, err)
					// Word is already marked as used, continue outer loop to try another word
					// This implements backtracking: if a word doesn't yield new kanji, try another word
					continue
				}
				log.Printf("[getSimpleKanjiGo] Attempt %d: Step %d - Extracted kanji ID: %d from word %d",
					attempt+1, len(collectedKanji), nextKanjiID, wordID)

				// Add to collection
				collectedKanji = append(collectedKanji, nextKanjiID)
				currentKanjiID = nextKanjiID
			}

			log.Printf("[getSimpleKanjiGo] Attempt %d: Collected %d kanji: %v", attempt+1, len(collectedKanji), collectedKanji)

			// If we got enough kanji, return them
			if len(collectedKanji) >= targetCount {
				log.Printf("[getSimpleKanjiGo] Success! Returning %d kanji (target was %d)", len(collectedKanji), count)
				return h.getKanjiDetails(collectedKanji[:targetCount])
			}
		}
	}

	// All retries failed - return error
	log.Printf("[getSimpleKanjiGo] FAILED: Could not find %d connected kanji after %d attempts (JLPT: %d, excludeIDs: %v)",
		count, maxRetries, jlptLevel, excludeIDs)
	return nil, fmt.Errorf("could not find %d connected kanji after %d attempts", count, maxRetries)
}

// getKanjiDetails retrieves full kanji information for the given IDs
// Optimized: includes caching, removes unnecessary fields, combines with meanings query
func (h *WordBuilderHandler) getKanjiDetails(kanjiIDs []int64) ([]KanjiData, error) {
	if len(kanjiIDs) == 0 {
		return []KanjiData{}, nil
	}

	ctx := context.Background()
	cacheClient := config.GetCacheClient()

	// Try cache first (batch cache)
	if cacheClient != nil {
		sortedIDs := make([]int64, len(kanjiIDs))
		copy(sortedIDs, kanjiIDs)
		sort.Slice(sortedIDs, func(i, j int) bool { return sortedIDs[i] < sortedIDs[j] })

		// Create hash for batch cache key
		idsStr := strings.Trim(strings.Join(strings.Fields(fmt.Sprint(sortedIDs)), ","), "[]")
		hash := md5.Sum([]byte(idsStr))
		cacheKey := fmt.Sprintf("word_builder:kanji_batch:%x", hash)

		cachedData, err := cacheClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var cachedKanji []KanjiData
			if err := json.Unmarshal([]byte(cachedData), &cachedKanji); err == nil {
				log.Printf("[getKanjiDetails] Cache HIT for batch: %d kanji", len(cachedKanji))
				return cachedKanji, nil
			}
			log.Printf("[getKanjiDetails] Cache deserialization error: %v, fetching fresh data", err)
		} else if err != redis.Nil {
			log.Printf("[getKanjiDetails] Cache GET error: %v, fetching fresh data", err)
		}
	}

	// Cache miss - fetch from database
	startTime := time.Now()
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

	// Combined query: kanji details + first meaning in one query
	// Removed jlpt and frequency (not needed in response)
	// Uses COALESCE to get first meaning from meanings, detail, or heisig_en
	detailQuery := fmt.Sprintf(`
		SELECT 
			k.id,
			k.character,
			k.onyomi,
			k.kunyomi,
			COALESCE(
				(k.meanings->>0),
				(string_to_array(k.detail, ','))[1],
				(string_to_array(k.heisig_en, ','))[1]
			) AS first_meaning
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
		ID           int64
		Character    string
		Onyomi       *string
		Kunyomi      *string
		FirstMeaning *string
	}

	for rows.Next() {
		var k struct {
			ID           int64
			Character    string
			Onyomi       *string
			Kunyomi      *string
			FirstMeaning *string
		}
		if err := rows.Scan(&k.ID, &k.Character, &k.Onyomi, &k.Kunyomi, &k.FirstMeaning); err != nil {
			return nil, fmt.Errorf("failed to scan kanji: %w", err)
		}
		kanjiList = append(kanjiList, k)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	// Convert to KanjiData
	result := make([]KanjiData, 0, len(kanjiList))
	for _, k := range kanjiList {
		meanings := []string{}
		if k.FirstMeaning != nil && *k.FirstMeaning != "" {
			meanings = []string{*k.FirstMeaning}
		}

		result = append(result, KanjiData{
			ID:        k.ID,
			Character: k.Character,
			Onyomi:    k.Onyomi,
			Kunyomi:   k.Kunyomi,
			Meanings:  meanings,
		})
	}

	queryDuration := time.Since(startTime)
	log.Printf("[getKanjiDetails] Fetched %d kanji from DB in %v", len(result), queryDuration)

	// Cache the result
	if cacheClient != nil && len(result) > 0 {
		sortedIDs := make([]int64, len(kanjiIDs))
		copy(sortedIDs, kanjiIDs)
		sort.Slice(sortedIDs, func(i, j int) bool { return sortedIDs[i] < sortedIDs[j] })

		idsStr := strings.Trim(strings.Join(strings.Fields(fmt.Sprint(sortedIDs)), ","), "[]")
		hash := md5.Sum([]byte(idsStr))
		cacheKey := fmt.Sprintf("word_builder:kanji_batch:%x", hash)

		dataJSON, err := json.Marshal(result)
		if err == nil {
			ttl := 1 * time.Hour
			if setErr := cacheClient.Set(ctx, cacheKey, dataJSON, ttl).Err(); setErr != nil {
				log.Printf("[getKanjiDetails] Failed to cache kanji batch: %v", setErr)
			} else {
				log.Printf("[getKanjiDetails] Cached kanji batch: %d kanji (TTL=%v)", len(result), ttl)
			}
		}
	}

	return result, nil
}
