package word_builder

import (
	"context"
	"crypto/md5"
	"database/sql"
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

// ComputeValidWordsWithCache finds all valid words with caching support
// Accepts sqlDB to reuse connection and avoid overhead, and jlptLevel for filtering
func (h *WordBuilderHandler) ComputeValidWordsWithCache(kanji []KanjiData, sqlDB *sql.DB, jlptLevel int) ([]ValidWord, error) {
	if len(kanji) == 0 {
		return []ValidWord{}, nil
	}

	ctx := context.Background()
	cacheClient := config.GetCacheClient()

	// Extract kanji IDs for cache key
	kanjiIDs := make([]int64, len(kanji))
	kanjiMap := make(map[int64]string) // id -> character (for fallback)
	for i, k := range kanji {
		kanjiIDs[i] = k.ID
		kanjiMap[k.ID] = k.Character
	}

	// Try cache first
	if cacheClient != nil {
		sortedIDs := make([]int64, len(kanjiIDs))
		copy(sortedIDs, kanjiIDs)
		sort.Slice(sortedIDs, func(i, j int) bool { return sortedIDs[i] < sortedIDs[j] })

		idsStr := strings.Trim(strings.Join(strings.Fields(fmt.Sprint(sortedIDs)), ","), "[]")
		hash := md5.Sum([]byte(idsStr))
		cacheKey := fmt.Sprintf("word_builder:words:%x", hash)

		cachedData, err := cacheClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var cachedWords []ValidWord
			if err := json.Unmarshal([]byte(cachedData), &cachedWords); err == nil {
				log.Printf("[ComputeValidWords] Cache HIT: %d words", len(cachedWords))
				return cachedWords, nil
			}
			log.Printf("[ComputeValidWords] Cache deserialization error: %v, fetching fresh data", err)
		} else if err != redis.Nil {
			log.Printf("[ComputeValidWords] Cache GET error: %v, fetching fresh data", err)
		}
	}

	// Cache miss - compute words
	validWords, err := h.computeValidWordsInternal(kanji, kanjiIDs, kanjiMap, sqlDB, jlptLevel)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if cacheClient != nil && len(validWords) > 0 {
		sortedIDs := make([]int64, len(kanjiIDs))
		copy(sortedIDs, kanjiIDs)
		sort.Slice(sortedIDs, func(i, j int) bool { return sortedIDs[i] < sortedIDs[j] })

		idsStr := strings.Trim(strings.Join(strings.Fields(fmt.Sprint(sortedIDs)), ","), "[]")
		hash := md5.Sum([]byte(idsStr))
		cacheKey := fmt.Sprintf("word_builder:words:%x", hash)

		dataJSON, err := json.Marshal(validWords)
		if err == nil {
			ttl := 1 * time.Hour
			if setErr := cacheClient.Set(ctx, cacheKey, dataJSON, ttl).Err(); setErr != nil {
				log.Printf("[ComputeValidWords] Failed to cache words: %v", setErr)
			} else {
				log.Printf("[ComputeValidWords] Cached %d words (TTL=%v)", len(validWords), ttl)
			}
		}
	}

	return validWords, nil
}

// computeValidWordsInternal performs the actual word computation
func (h *WordBuilderHandler) computeValidWordsInternal(kanji []KanjiData, kanjiIDs []int64, kanjiMap map[int64]string, sqlDB *sql.DB, jlptLevel int) ([]ValidWord, error) {

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

	// Execute query using provided sqlDB connection
	rows, err := sqlDB.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query valid words: %w", err)
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

// ComputeValidWords is a backward-compatible wrapper that uses default JLPT level
// For new code, use ComputeValidWordsWithCache directly
func (h *WordBuilderHandler) ComputeValidWords(kanji []KanjiData) ([]ValidWord, error) {
	sqlDB, err := h.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}
	// Use default JLPT level 4 if not specified
	return h.ComputeValidWordsWithCache(kanji, sqlDB, 4)
}

func buildQuestionPlaceholders(count int) string {
	if count <= 0 {
		return ""
	}
	return strings.TrimSuffix(strings.Repeat("?,", count), ",")
}
