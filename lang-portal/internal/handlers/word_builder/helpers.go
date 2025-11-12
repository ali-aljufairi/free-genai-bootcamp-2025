package word_builder

import (
	"fmt"
	"math/rand"
	"strings"
)

// getRandomKanji gets random kanji by JLPT level
func (h *WordBuilderHandler) getRandomKanji(jlptLevel int, count int, excludeIDs []int64) ([]KanjiData, error) {
	query := h.DB.Table("kanji").
		Where("jlpt = ?", jlptLevel)

	if len(excludeIDs) > 0 {
		query = query.Where("id NOT IN ?", excludeIDs)
	}

	var kanji []struct {
		ID        int64
		Character string
		Onyomi    *string
		Kunyomi   *string
		Meanings  []string
		JLPT      *int
		HeisigEn  *string
	}

	// Get more than needed for randomization
	err := query.
		Order("RANDOM()").
		Limit(count * 2). // Get more to ensure we have enough
		Find(&kanji).Error

	if err != nil {
		return nil, err
	}

	if len(kanji) == 0 {
		return nil, fmt.Errorf("no kanji found for JLPT level %d", jlptLevel)
	}

	// Shuffle and take first count
	// Note: As of Go 1.20+, rand.Seed is deprecated, rand.Shuffle uses its own generator
	rand.Shuffle(len(kanji), func(i, j int) {
		kanji[i], kanji[j] = kanji[j], kanji[i]
	})

	// Take only count items
	if len(kanji) > count {
		kanji = kanji[:count]
	}

	result := make([]KanjiData, len(kanji))
	for i, k := range kanji {
		meanings := k.Meanings
		if len(meanings) == 0 && k.HeisigEn != nil {
			meanings = []string{*k.HeisigEn}
		}

		result[i] = KanjiData{
			ID:        k.ID,
			Character: k.Character,
			Onyomi:    k.Onyomi,
			Kunyomi:   k.Kunyomi,
			Meanings:  meanings,
			JLPT:      k.JLPT,
		}
	}

	return result, nil
}

// computeValidWords finds all valid words that can be formed from the given kanji
func (h *WordBuilderHandler) computeValidWords(kanji []KanjiData) ([]ValidWord, error) {
	if len(kanji) == 0 {
		return []ValidWord{}, nil
	}

	// Extract kanji characters
	kanjiChars := make([]string, len(kanji))
	kanjiMap := make(map[string]int64) // character -> id
	for i, k := range kanji {
		kanjiChars[i] = k.Character
		kanjiMap[k.Character] = k.ID
	}

	// Build regex pattern: word must contain only these kanji characters
	// We'll use a simpler approach: query words and filter in Go
	var words []struct {
		ID      int64
		Kanji   *string
		Kana    string
		English string
	}

	// Query words that have kanji and are within length 1-4
	err := h.DB.Table("words").
		Select("id, kanji, kana, english").
		Where("kanji IS NOT NULL AND kanji != ''").
		Where("length(kanji) BETWEEN 1 AND 4").
		Find(&words).Error

	if err != nil {
		return nil, err
	}

	// Filter words that use only the provided kanji
	var validWords []ValidWord
	for _, word := range words {
		if word.Kanji == nil {
			continue
		}

		wordKanji := *word.Kanji
		wordChars := strings.Split(wordKanji, "")

		// Check if all characters in word are in our kanji set
		isValid := true
		kanjiIDs := make([]int64, 0, len(wordChars))

		for _, char := range wordChars {
			kanjiID, exists := kanjiMap[char]
			if !exists {
				isValid = false
				break
			}
			kanjiIDs = append(kanjiIDs, kanjiID)
		}

		if isValid {
			validWords = append(validWords, ValidWord{
				Kanji:    wordKanji,
				Kana:     word.Kana,
				English:  word.English,
				WordID:   word.ID,
				KanjiIDs: kanjiIDs,
			})
		}
	}

	return validWords, nil
}
