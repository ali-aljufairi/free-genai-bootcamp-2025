package word_builder

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"strings"
)

// getKanjiMeanings retrieves meanings for a kanji with fallback logic:
// 1. Try meanings (jsonb) - parse JSON array if exists, take first 3 comma-separated values
// 2. If null/empty, try detail (text) - use as single meaning, take first 3 comma-separated values
// 3. If null/empty, try heisig_en (text) - use as single meaning, take first 3 comma-separated values
// Returns []string with at least one meaning (max 3) or error
func (h *WordBuilderHandler) getKanjiMeanings(kanjiID int64) ([]string, error) {
	// Helper function to take first 3 comma-separated values from a string
	takeFirst3 := func(s string) []string {
		parts := strings.Split(s, ",")
		result := make([]string, 0, 3)
		for i, part := range parts {
			if i >= 3 {
				break
			}
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		return result
	}

	// First try meanings (jsonb)
	// Use a struct to properly scan the JSONB field
	var result struct {
		Meanings string
	}
	err := h.DB.Raw("SELECT COALESCE(meanings::text, 'null') as meanings FROM kanji WHERE id = $1", kanjiID).Scan(&result).Error
	if err == nil && result.Meanings != "" && result.Meanings != "null" {
		var meanings []string
		if jsonErr := json.Unmarshal([]byte(result.Meanings), &meanings); jsonErr == nil && len(meanings) > 0 {
			// Take first 3 meanings
			if len(meanings) > 3 {
				meanings = meanings[:3]
			}
			// Also check each meaning for comma-separated values and take first 3
			finalResult := make([]string, 0, 3)
			for _, meaning := range meanings {
				if len(finalResult) >= 3 {
					break
				}
				parts := takeFirst3(meaning)
				for _, part := range parts {
					if len(finalResult) >= 3 {
						break
					}
					finalResult = append(finalResult, part)
				}
			}
			if len(finalResult) > 0 {
				return finalResult, nil
			}
		}
	}

	// Fallback to detail (text)
	var detail *string
	err = h.DB.Raw("SELECT detail FROM kanji WHERE id = $1", kanjiID).Scan(&detail).Error
	if err == nil && detail != nil && *detail != "" {
		result := takeFirst3(*detail)
		if len(result) > 0 {
			return result, nil
		}
	}

	// Fallback to heisig_en (text)
	var heisigEn *string
	err = h.DB.Raw("SELECT heisig_en FROM kanji WHERE id = $1", kanjiID).Scan(&heisigEn).Error
	if err == nil && heisigEn != nil && *heisigEn != "" {
		result := takeFirst3(*heisigEn)
		if len(result) > 0 {
			return result, nil
		}
	}

	// If all are null/empty, return error
	return nil, fmt.Errorf("no meanings found for kanji id %d", kanjiID)
}

// getSmartKanji selects kanji that can form words together using graph relationships
// This ensures the selected kanji can actually form words, unlike purely random selection
func (h *WordBuilderHandler) getSmartKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	// Step 1: Select 1 seed kanji with high frequency AND high companion_kanji_count
	// Companion count = how many different kanji appear in words together with this kanji
	var seedKanji struct {
		ID                 int64
		Character          string
		Onyomi             *string
		Kunyomi            *string
		JLPT               *int
		HeisigEn           *string
		Frequency          *int
		CompanionKanjiCount int64
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

	// Get kanji with high companion_kanji_count and frequency
	// Select from top 100 candidates, then randomly pick one (weighted by frequency)
	query := fmt.Sprintf(`
		SELECT 
			k.id,
			k.character,
			k.onyomi,
			k.kunyomi,
			k.jlpt,
			k.heisig_en,
			k.frequency,
			COUNT(DISTINCT ir2.to_id) AS companion_kanji_count
		FROM kanji k
		JOIN item_relations ir ON k.id = ir.to_id
			AND ir.from_type = 'word'
			AND ir.to_type = 'kanji'
			AND ir.rel_type = 'USES_KANJI'
		JOIN item_relations ir2 ON ir.from_id = ir2.from_id
			AND ir2.from_type = 'word'
			AND ir2.to_type = 'kanji'
			AND ir2.rel_type = 'USES_KANJI'
			AND ir2.to_id != k.id
		WHERE k.jlpt = $1
			%s
		GROUP BY k.id, k.character, k.onyomi, k.kunyomi, k.jlpt, k.heisig_en, k.frequency
		HAVING COUNT(DISTINCT ir2.to_id) >= 10
		ORDER BY companion_kanji_count DESC, k.frequency DESC NULLS LAST
		LIMIT 100
	`, excludeClause)

	var candidates []struct {
		ID                 int64
		Character          string
		Onyomi             *string
		Kunyomi            *string
		JLPT               *int
		HeisigEn           *string
		Frequency          *int
		CompanionKanjiCount int64
	}

	err := h.DB.Raw(query, args...).Scan(&candidates).Error
	if err != nil {
		return nil, fmt.Errorf("failed to find candidate seed kanji: %w", err)
	}

	if len(candidates) == 0 {
		return nil, fmt.Errorf("no kanji with sufficient companion relationships found for JLPT level %d", jlptLevel)
	}

	// Weighted random selection: prefer higher frequency
	// Simple approach: take from top 20 candidates, weighted by frequency
	topN := 20
	if len(candidates) < topN {
		topN = len(candidates)
	}
	topCandidates := candidates[:topN]

	// Calculate total frequency for weighting
	totalFreq := 0
	for _, c := range topCandidates {
		if c.Frequency != nil {
			totalFreq += *c.Frequency
		} else {
			totalFreq += 1 // Default weight for NULL frequency
		}
	}

	// Random selection weighted by frequency
	if totalFreq > 0 {
		randValue := rand.Intn(totalFreq)
		cumulative := 0
		for _, c := range topCandidates {
			freq := 1
			if c.Frequency != nil {
				freq = *c.Frequency
			}
			cumulative += freq
			if randValue < cumulative {
				seedKanji = struct {
					ID                 int64
					Character          string
					Onyomi             *string
					Kunyomi            *string
					JLPT               *int
					HeisigEn           *string
					Frequency          *int
					CompanionKanjiCount int64
				}{
					ID:                 c.ID,
					Character:          c.Character,
					Onyomi:             c.Onyomi,
					Kunyomi:            c.Kunyomi,
					JLPT:               c.JLPT,
					HeisigEn:           c.HeisigEn,
					Frequency:          c.Frequency,
					CompanionKanjiCount: c.CompanionKanjiCount,
				}
				break
			}
		}
	} else {
		// Fallback: just pick first candidate
		c := topCandidates[0]
		seedKanji = struct {
			ID                 int64
			Character          string
			Onyomi             *string
			Kunyomi            *string
			JLPT               *int
			HeisigEn           *string
			Frequency          *int
			CompanionKanjiCount int64
		}{
			ID:                 c.ID,
			Character:          c.Character,
			Onyomi:             c.Onyomi,
			Kunyomi:            c.Kunyomi,
			JLPT:               c.JLPT,
			HeisigEn:           c.HeisigEn,
			Frequency:          c.Frequency,
			CompanionKanjiCount: c.CompanionKanjiCount,
		}
	}

	// Step 2: Iteratively select companion kanji that maximize valid word formation
	collectedIDs := []int64{seedKanji.ID}
	
	// Helper function to count new valid words if we add a candidate kanji
	countNewWords := func(currentSet []int64, candidateID int64) (int, error) {
		testSet := append(currentSet, candidateID)
		
		// Build array clause for test set
		placeholders := make([]string, len(testSet))
		args := make([]interface{}, len(testSet))
		for i, id := range testSet {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = id
		}
		arrayClause := "ARRAY[" + strings.Join(placeholders, ",") + "]::int[]"
		
		var wordCount int64
		query := fmt.Sprintf(`
			WITH s AS (
				SELECT unnest(%s) AS kanji_id
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
			SELECT COUNT(*)
			FROM word_kanji_sets wk
			JOIN words w ON w.id = wk.word_id
			WHERE wk.word_kanji_ids <@ %s
				AND w.kanji IS NOT NULL
				AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
				AND LENGTH(w.kanji) BETWEEN 1 AND 4
				AND cardinality(wk.word_kanji_ids) >= 2
		`, arrayClause, arrayClause)
		
		err := h.DB.Raw(query, args...).Scan(&wordCount).Error
		return int(wordCount), err
	}
	
	// Iteratively select companion kanji until we have count total
	for len(collectedIDs) < count {
		// Find candidate companion kanji (kanji that appear in words with current set)
		collectedPlaceholders := make([]string, len(collectedIDs))
		collectedIDsArgs := make([]interface{}, len(collectedIDs))
		for i, id := range collectedIDs {
			collectedPlaceholders[i] = fmt.Sprintf("$%d", i+1)
			collectedIDsArgs[i] = id
		}
		collectedArrayClause := "ARRAY[" + strings.Join(collectedPlaceholders, ",") + "]::int[]"
		
		// Build placeholders for the query (array used 3 times + jlpt)
		argNum := len(collectedIDs) + 1
		secondArrayPlaceholders := make([]string, len(collectedIDs))
		thirdArrayPlaceholders := make([]string, len(collectedIDs))
		for i := range collectedIDs {
			secondArrayPlaceholders[i] = fmt.Sprintf("$%d", argNum)
			argNum++
		}
		jlptPlaceholder := fmt.Sprintf("$%d", argNum)
		argNum++
		for i := range collectedIDs {
			thirdArrayPlaceholders[i] = fmt.Sprintf("$%d", argNum)
			argNum++
		}
		secondArrayClause := "ARRAY[" + strings.Join(secondArrayPlaceholders, ",") + "]::int[]"
		thirdArrayClause := "ARRAY[" + strings.Join(thirdArrayPlaceholders, ",") + "]::int[]"
		
		// Build args: collectedIDs (for unnest), collectedIDs (for first <> ALL), jlpt, collectedIDs (for second <> ALL)
		candidateArgs := append(collectedIDsArgs, collectedIDsArgs...)
		candidateArgs = append(candidateArgs, jlptLevel)
		candidateArgs = append(candidateArgs, collectedIDsArgs...)
		
		var candidates []struct {
			KanjiID   int64
			Character string
			Frequency *int
		}
		
		candidateQuery := fmt.Sprintf(`
			WITH s AS (
				SELECT unnest(%s) AS kanji_id
			),
			words_for_s AS (
				SELECT DISTINCT ir.from_id AS word_id
				FROM item_relations ir
				JOIN s ON s.kanji_id = ir.to_id
				WHERE ir.from_type = 'word'
					AND ir.rel_type = 'USES_KANJI'
					AND ir.to_type = 'kanji'
			),
			companion_kanji AS (
				SELECT DISTINCT ir2.to_id AS kanji_id
				FROM item_relations ir2
				JOIN words_for_s w ON w.word_id = ir2.from_id
				WHERE ir2.from_type = 'word'
					AND ir2.rel_type = 'USES_KANJI'
					AND ir2.to_type = 'kanji'
					AND ir2.to_id <> ALL(%s)
			)
			SELECT 
				k.id AS kanji_id,
				k.character,
				k.frequency
			FROM companion_kanji c
			JOIN kanji k ON k.id = c.kanji_id
			WHERE k.jlpt = %s
				AND k.id <> ALL(%s)
			ORDER BY k.frequency DESC NULLS LAST
			LIMIT 50
		`, collectedArrayClause, secondArrayClause, jlptPlaceholder, thirdArrayClause)
		
		err = h.DB.Raw(candidateQuery, candidateArgs...).Scan(&candidates).Error
		if err != nil || len(candidates) == 0 {
			// If no more candidates, break and use what we have
			break
		}
		
		// Score each candidate by new word count and frequency
		bestCandidate := candidates[0]
		bestScore := 0.0
		
		for _, candidate := range candidates {
			newWordCount, err := countNewWords(collectedIDs, candidate.KanjiID)
			if err != nil {
				continue
			}
			
			// Score: new_words_count * 10 + frequency (normalized)
			// Weight word formation more heavily
			freq := 0
			if candidate.Frequency != nil {
				freq = *candidate.Frequency
			}
			// Normalize frequency to 0-1 range (assuming max ~10000)
			normalizedFreq := float64(freq) / 10000.0
			if normalizedFreq > 1.0 {
				normalizedFreq = 1.0
			}
			
			score := float64(newWordCount)*10.0 + normalizedFreq*5.0
			
			if score > bestScore {
				bestScore = score
				bestCandidate = candidate
			}
		}
		
		// Add best candidate to collected set
		collectedIDs = append(collectedIDs, bestCandidate.KanjiID)
	}
	
	// Extract related kanji IDs (all except seed)
	relatedKanjiIDs := collectedIDs[1:]

	// If we still don't have enough, we'll work with what we have
	// Build result with seed + related kanji
	result := make([]KanjiData, 0, count)

	// Step 3: Get full kanji data for seed kanji
	meanings, err := h.getKanjiMeanings(seedKanji.ID)
	if err != nil {
		// If we can't get meanings, use empty array (shouldn't happen but handle gracefully)
		meanings = []string{}
	}

	result = append(result, KanjiData{
		ID:        seedKanji.ID,
		Character: seedKanji.Character,
		Onyomi:    seedKanji.Onyomi,
		Kunyomi:   seedKanji.Kunyomi,
		Meanings:  meanings,
		JLPT:      seedKanji.JLPT,
	})

	// Step 4: Get full kanji data for related kanji using Raw query
	if len(relatedKanjiIDs) > 0 {
		// Build placeholders for IN clause
		placeholders := make([]string, len(relatedKanjiIDs))
		args := make([]interface{}, len(relatedKanjiIDs))
		for i, id := range relatedKanjiIDs {
			placeholders[i] = fmt.Sprintf("$%d", i+1)
			args[i] = id
		}
		inClause := "(" + strings.Join(placeholders, ",") + ")"

		var relatedKanji []struct {
			ID        int64
			Character string
			Onyomi    *string
			Kunyomi   *string
			JLPT      *int
			HeisigEn  *string
		}

		query := fmt.Sprintf(`
			SELECT id, character, onyomi, kunyomi, jlpt, heisig_en
			FROM kanji
			WHERE id IN %s
		`, inClause)

		err = h.DB.Raw(query, args...).Scan(&relatedKanji).Error
		if err != nil {
			return nil, fmt.Errorf("failed to get related kanji data: %w", err)
		}

		// Shuffle related kanji for variety
		rand.Shuffle(len(relatedKanji), func(i, j int) {
			relatedKanji[i], relatedKanji[j] = relatedKanji[j], relatedKanji[i]
		})

		// Take only what we need to fill up to count
		remainingSlots := count - len(result)
		if len(relatedKanji) > remainingSlots {
			relatedKanji = relatedKanji[:remainingSlots]
		}

		// Fill result array and get meanings using helper
		for _, k := range relatedKanji {
			meanings, err := h.getKanjiMeanings(k.ID)
			if err != nil {
				// If we can't get meanings, use empty array
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
	}

	// If we still don't have enough kanji, return what we have (at least the seed)
	if len(result) < count {
		// Log that we couldn't find enough related kanji, but return what we have
		// The caller can handle this case
	}

	return result, nil
}

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

	// Build placeholders for kanji IDs array (reused in both places in the query)
	kanjiPlaceholders := make([]string, len(kanjiIDs))
	args := make([]interface{}, len(kanjiIDs)+3)
	for i, id := range kanjiIDs {
		kanjiPlaceholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	kanjiArrayClause := "ARRAY[" + strings.Join(kanjiPlaceholders, ",") + "]::int[]"

	// JLPT placeholders (after the kanji IDs)
	jlptPlaceholder1 := fmt.Sprintf("$%d", len(kanjiIDs)+1)
	jlptPlaceholder2 := fmt.Sprintf("$%d", len(kanjiIDs)+2)
	jlptPlaceholder3 := fmt.Sprintf("$%d", len(kanjiIDs)+3)
	args[len(kanjiIDs)] = jlptLevel
	args[len(kanjiIDs)+1] = jlptLevel - 1
	args[len(kanjiIDs)+2] = jlptLevel + 1

	// Use CTE-based query with array containment to find all valid words
	var results []struct {
		WordID       int64
		Kanji        string
		Kana         string
		English      string
		WordKanjiIDs []int64 `gorm:"type:integer[]"`
	}

	query := fmt.Sprintf(`
		WITH s AS (
			SELECT unnest(%s) AS kanji_id
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
		WHERE wk.word_kanji_ids <@ %s
			AND w.kanji IS NOT NULL
			AND w.kanji ~ '^[\u4E00-\u9FFF]+$'
			AND LENGTH(w.kanji) BETWEEN 1 AND 4
			AND (w.jlpt = %s OR w.jlpt IS NULL OR w.jlpt BETWEEN %s AND %s)
			AND cardinality(wk.word_kanji_ids) >= 1
		ORDER BY cardinality(wk.word_kanji_ids) DESC, w.kanji
	`, kanjiArrayClause, kanjiArrayClause, jlptPlaceholder1, jlptPlaceholder2, jlptPlaceholder3)

	err := h.DB.Raw(query, args...).Scan(&results).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query valid words: %w", err)
	}

	// Convert results to ValidWord format
	validWords := make([]ValidWord, 0, len(results))
	for _, r := range results {
		// word_kanji_ids should already be in order from the array_agg
		// But ensure we only include kanji IDs that are in our set
		filteredKanjiIDs := make([]int64, 0, len(r.WordKanjiIDs))
		for _, kid := range r.WordKanjiIDs {
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
