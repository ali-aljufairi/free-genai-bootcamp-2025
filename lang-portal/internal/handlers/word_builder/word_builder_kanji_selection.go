package word_builder

import (
	"fmt"
	"math/rand"
	"strings"
)

// getSmartKanji selects kanji with frequency data for the given JLPT level
// Uses simple frequency-based selection with randomization for variety
func (h *WordBuilderHandler) getSmartKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
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
	// Similar to how flashcard handlers select kanji
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

	// Shuffle for additional variety (though ORDER BY RANDOM() already randomizes)
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

