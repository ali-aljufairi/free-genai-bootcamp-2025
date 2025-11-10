package flashcard

import (
	"encoding/json"
	"errors"

	"lang-portal/internal/database/models"

	"gorm.io/gorm"
)

// generateFlashcards generates flashcard content based on configuration
func (h *FlashcardHandler) generateFlashcards(userID int64, config *FlashcardConfig) ([]Flashcard, error) {
	var cards []Flashcard
	var err error

	switch config.ContentSource {
	case ContentSourceUnit:
		cards, err = h.generateUnitFlashcards(userID, config)
	case ContentSourceGroup:
		cards, err = h.generateGroupFlashcards(userID, config)
	case ContentSourceJLPT:
		cards, err = h.generateJLPTFlashcards(userID, config)
	case ContentSourceSRS:
		cards, err = h.generateSRSFlashcards(userID, config)
	default:
		return nil, errors.New("unsupported content source")
	}

	if err != nil {
		return nil, err
	}

	// Limit cards to requested count
	if len(cards) > config.CardCount {
		cards = cards[:config.CardCount]
	}

	return cards, nil
}

// generateUnitFlashcards generates flashcards from a specific unit
func (h *FlashcardHandler) generateUnitFlashcards(userID int64, config *FlashcardConfig) ([]Flashcard, error) {
	var cards []Flashcard

	// Build query based on unit selection
	query := h.db.Table("unit_items").
		Joins("JOIN units ON unit_items.unit_id = units.id").
		Where("units.course_id = ?", *config.CourseID)

	if config.UnitID != nil {
		query = query.Where("unit_items.unit_id = ?", *config.UnitID)
	}

	// Get unit items
	var unitItems []struct {
		ItemType string `json:"item_type"`
		ItemID   int64  `json:"item_id"`
	}

	err := query.Select("unit_items.item_type, unit_items.item_id").
		Order("RANDOM()").
		Limit(config.CardCount * 2). // Get more items to have options
		Find(&unitItems).Error

	if err != nil {
		return nil, err
	}

	// Batch-load words/kanji if needed, then generate flashcards
	if config.FlashcardType == FlashcardTypeWord {
		// Collect word IDs
		var wordIDs []int64
		for _, item := range unitItems {
			if item.ItemType == "word" {
				wordIDs = append(wordIDs, item.ItemID)
			}
		}
		
		// Batch load all words at once
		if len(wordIDs) > 0 {
			var words []models.Word
			if err := h.db.Where("id IN (?)", wordIDs).Find(&words).Error; err == nil {
				// Create a map for quick lookup
				wordMap := make(map[int64]models.Word)
				for _, word := range words {
					wordMap[word.ID] = word
				}
				
				// Generate flashcards using loaded words
				for _, item := range unitItems {
					if item.ItemType == "word" {
						if word, ok := wordMap[item.ItemID]; ok {
							card, err := h.generateWordFlashcardFromWord(word, config)
							if err == nil {
								cards = append(cards, card)
							}
						}
					}
				}
			}
		}
	} else if config.FlashcardType == FlashcardTypeKanji {
		// For kanji, still use individual queries (can optimize later)
		for _, item := range unitItems {
			if item.ItemType == "kanji" {
				card, err := h.generateKanjiFlashcard(item.ItemID, config)
				if err == nil {
					cards = append(cards, card)
				}
			}
		}
	}

	return cards, nil
}

// generateGroupFlashcards generates flashcards from a word group
func (h *FlashcardHandler) generateGroupFlashcards(userID int64, config *FlashcardConfig) ([]Flashcard, error) {
	var cards []Flashcard

	if config.FlashcardType == FlashcardTypeWord {
		// Get words in group
		var words []models.Word
		query := h.db.Table("words").
			Joins("JOIN word_groups ON words.id = word_groups.word_id").
			Where("word_groups.group_id = ?", *config.GroupID)

		// Apply filters
		query = h.applyWordFilters(query, &config.Filters)

		err := query.Order("RANDOM()").
			Limit(config.CardCount * 2).
			Find(&words).Error

		if err != nil {
			return nil, err
		}

		// Generate word flashcards - already have words loaded, use them directly
		for _, word := range words {
			card, err := h.generateWordFlashcardFromWord(word, config)
			if err == nil {
				cards = append(cards, card)
			}
		}
	}

	return cards, nil
}

// generateJLPTFlashcards generates flashcards from JLPT level
func (h *FlashcardHandler) generateJLPTFlashcards(userID int64, config *FlashcardConfig) ([]Flashcard, error) {
	var cards []Flashcard

	if config.FlashcardType == FlashcardTypeWord {
		// Get words for JLPT levels
		var words []models.Word
		query := h.db.Model(&models.Word{})

		// Apply JLPT level filter
		if len(config.Filters.JLPTLevels) > 0 {
			query = query.Where("jlpt IN (?)", config.Filters.JLPTLevels)
		}

		// Apply other filters
		query = h.applyWordFilters(query, &config.Filters)

		err := query.Order("RANDOM()").
			Limit(config.CardCount * 2).
			Find(&words).Error

		if err != nil {
			return nil, err
		}

		for _, word := range words {
			card, err := h.generateWordFlashcardFromWord(word, config)
			if err == nil {
				cards = append(cards, card)
			}
		}
	} else if config.FlashcardType == FlashcardTypeKanji {
		// Get kanji for JLPT levels
		var kanji []struct {
			ID int64 `json:"id"`
		}
		query := h.db.Table("kanji").Select("id")

		// Apply JLPT level filter
		if len(config.Filters.JLPTLevels) > 0 {
			query = query.Where("jlpt IN (?)", config.Filters.JLPTLevels)
		}

		err := query.Order("RANDOM()").
			Limit(config.CardCount * 2).
			Find(&kanji).Error

		if err != nil {
			return nil, err
		}

		for _, k := range kanji {
			card, err := h.generateKanjiFlashcard(k.ID, config)
			if err == nil {
				cards = append(cards, card)
			}
		}
	}

	return cards, nil
}

// generateSRSFlashcards generates flashcards from SRS due items
func (h *FlashcardHandler) generateSRSFlashcards(userID int64, config *FlashcardConfig) ([]Flashcard, error) {
	var cards []Flashcard

	// Get SRS due items
	var progressItems []struct {
		ItemType string `json:"item_type"`
		ItemID   int64  `json:"item_id"`
	}

	err := h.db.Table("progress").
		Select("item_type, item_id").
		Where("user_id = ? AND next_due <= NOW()", userID).
		Order("next_due").
		Limit(config.CardCount * 2).
		Find(&progressItems).Error

	if err != nil {
		return nil, err
	}

	// Generate flashcards for each item
	for _, item := range progressItems {
		if config.FlashcardType == FlashcardTypeWord && item.ItemType == "word" {
			card, err := h.generateWordFlashcard(item.ItemID, config)
			if err == nil {
				cards = append(cards, card)
			}
		} else if config.FlashcardType == FlashcardTypeKanji && item.ItemType == "kanji" {
			card, err := h.generateKanjiFlashcard(item.ItemID, config)
			if err == nil {
				cards = append(cards, card)
			}
		}
	}

	return cards, nil
}

// applyWordFilters applies filters to word query
func (h *FlashcardHandler) applyWordFilters(query *gorm.DB, filters *ContentFilters) *gorm.DB {
	if len(filters.JLPTLevels) > 0 {
		query = query.Where("jlpt IN (?)", filters.JLPTLevels)
	}

	if len(filters.PartsOfSpeech) > 0 {
		query = query.Where("part_of_speech IN (?)", filters.PartsOfSpeech)
	}

	if len(filters.DifficultyLevels) > 0 {
		query = query.Where("level IN (?)", filters.DifficultyLevels)
	}

	if filters.HasKanji != nil {
		if *filters.HasKanji {
			query = query.Where("kanji IS NOT NULL AND kanji != ''")
		} else {
			query = query.Where("kanji IS NULL OR kanji = ''")
		}
	}

	return query
}

// generateWordFlashcardFromWord generates a word flashcard from an already-loaded word object
func (h *FlashcardHandler) generateWordFlashcardFromWord(word models.Word, config *FlashcardConfig) (Flashcard, error) {
	return h.generateWordFlashcardInternal(word, config)
}

// generateWordFlashcard generates a word flashcard based on user preferences
func (h *FlashcardHandler) generateWordFlashcard(wordID int64, config *FlashcardConfig) (Flashcard, error) {
	var word models.Word
	err := h.db.First(&word, wordID).Error
	if err != nil {
		return Flashcard{}, err
	}
	return h.generateWordFlashcardInternal(word, config)
}

// generateWordFlashcardInternal internal function that generates flashcard from word object
func (h *FlashcardHandler) generateWordFlashcardInternal(word models.Word, config *FlashcardConfig) (Flashcard, error) {

	options := config.WordOptions

	// Validate that the word has at least one of the selected Ask For fields
	hasValidAnswer := false
	if options.AskForKana && word.Kana != "" {
		hasValidAnswer = true
	}
	if options.AskForKanji && word.Kanji != nil && *word.Kanji != "" {
		hasValidAnswer = true
	}
	if options.AskForRomaji && word.Romaji != "" {
		hasValidAnswer = true
	}
	if options.AskForEnglish && word.English != "" {
		hasValidAnswer = true
	}

	// Skip words that don't have any of the requested answer fields
	if !hasValidAnswer {
		return Flashcard{}, errors.New("word missing all required answer fields")
	}

	// Build question content (what user sees)
	question := FlashcardContent{}
	if options.ShowKana {
		question.Kana = &word.Kana
	}
	if options.ShowKanji && word.Kanji != nil && *word.Kanji != "" {
		question.Kanji = word.Kanji
	}
	if options.ShowRomaji {
		question.Romaji = &word.Romaji
	}
	if options.ShowEnglish {
		firstMeaning := getFirstMeaning(word.English)
		question.English = &firstMeaning
	}

	// Build answer content (what user should answer for)
	answer := FlashcardContent{}
	if options.AskForKana {
		answer.Kana = &word.Kana
	}
	if options.AskForKanji && word.Kanji != nil && *word.Kanji != "" {
		answer.Kanji = word.Kanji
	}
	if options.AskForRomaji {
		answer.Romaji = &word.Romaji
	}
	if options.AskForEnglish {
		firstMeaning := getFirstMeaning(word.English)
		answer.English = &firstMeaning
	}

	// Generate wrong options
	wrongOptions, err := h.generateWordWrongOptions(word.ID, word, options, config)
	if err != nil {
		return Flashcard{}, err
	}

	// Combine correct answer with wrong options
	allOptions := append(wrongOptions, answer)
	correctIndex := len(allOptions) - 1

	// Shuffle options if requested
	if config.ShuffleOptions {
		allOptions, correctIndex = shuffleFlashcardOptions(allOptions, correctIndex)
	}

	return Flashcard{
		Type:         FlashcardTypeWord,
		Question:     question,
		Answer:       answer,
		Options:      allOptions,
		CorrectIndex: correctIndex,
		ItemID:       word.ID,
		ItemType:     "word",
		AudioPath:    word.AudioPath,
	}, nil
}

// generateWordWrongOptions generates wrong options for word flashcards
func (h *FlashcardHandler) generateWordWrongOptions(wordID int64, word models.Word, options *WordPracticeOptions, config *FlashcardConfig) ([]FlashcardContent, error) {
	var wrongOptions []FlashcardContent

	// Get wrong words with similar characteristics
	var wrongWords []models.Word
	query := h.db.Where("id != ?", wordID)

	// Try to get words from same JLPT level and part of speech for better wrong options
	if word.JLPT != nil {
		query = query.Where("jlpt = ?", *word.JLPT)
	}
	if word.PartOfSpeech != "" {
		query = query.Where("part_of_speech = ?", word.PartOfSpeech)
	}

	err := query.Order("RANDOM()").Limit(3).Find(&wrongWords).Error
	if err != nil {
		return nil, err
	}

	// If we don't have enough words with same characteristics, get any words
	if len(wrongWords) < 3 {
		err = h.db.Where("id != ?", wordID).
			Order("RANDOM()").Limit(3).Find(&wrongWords).Error
		if err != nil {
			return nil, err
		}
	}

	// Build wrong option content based on what user is being asked for
	for _, wrongWord := range wrongWords {
		wrongOption := FlashcardContent{}

		if options.AskForKana {
			wrongOption.Kana = &wrongWord.Kana
		}
		if options.AskForKanji && wrongWord.Kanji != nil && *wrongWord.Kanji != "" {
			wrongOption.Kanji = wrongWord.Kanji
		}
		if options.AskForRomaji {
			wrongOption.Romaji = &wrongWord.Romaji
		}
		if options.AskForEnglish {
			firstMeaning := getFirstMeaning(wrongWord.English)
			wrongOption.English = &firstMeaning
		}

		wrongOptions = append(wrongOptions, wrongOption)
	}

	return wrongOptions, nil
}

// generateKanjiFlashcard generates a kanji flashcard based on user preferences
func (h *FlashcardHandler) generateKanjiFlashcard(kanjiID int64, config *FlashcardConfig) (Flashcard, error) {
	var kanji struct {
		ID        int64   `json:"id"`
		Character string  `json:"character"`
		Meanings  string  `json:"meanings"`
		Onyomi    string  `json:"onyomi"`
		Kunyomi   string  `json:"kunyomi"`
		AudioPath *string `json:"audio_path"`
	}

	err := h.db.Table("kanji").
		Select("id, character, meanings, onyomi, kunyomi, audio_path").
		Where("id = ?", kanjiID).
		First(&kanji).Error

	if err != nil {
		return Flashcard{}, err
	}

	options := config.KanjiOptions

	// Parse meanings JSON
	var meanings []string
	if kanji.Meanings != "" {
		json.Unmarshal([]byte(kanji.Meanings), &meanings)
	}

	// Use first meaning or empty if no meanings
	var englishMeaning string
	if len(meanings) > 0 {
		englishMeaning = meanings[0]
	}

	// Validate that the kanji has at least one of the selected Ask For fields
	hasValidAnswer := false
	if options.AskForCharacter && kanji.Character != "" {
		hasValidAnswer = true
	}
	if options.AskForOnyomi && kanji.Onyomi != "" {
		hasValidAnswer = true
	}
	if options.AskForKunyomi && kanji.Kunyomi != "" {
		hasValidAnswer = true
	}
	if options.AskForEnglish && englishMeaning != "" {
		hasValidAnswer = true
	}

	// Skip kanji that don't have any of the requested answer fields
	if !hasValidAnswer {
		return Flashcard{}, errors.New("kanji missing all required answer fields")
	}

	// Build question content (what user sees)
	question := FlashcardContent{}
	if options.ShowCharacter {
		question.Character = &kanji.Character
	}
	if options.ShowOnyomi && kanji.Onyomi != "" {
		question.Onyomi = &kanji.Onyomi
	}
	if options.ShowKunyomi && kanji.Kunyomi != "" {
		question.Kunyomi = &kanji.Kunyomi
	}
	if options.ShowEnglish && englishMeaning != "" {
		question.Meanings = &englishMeaning
	}

	// Build answer content (what user should answer for)
	answer := FlashcardContent{}
	if options.AskForCharacter {
		answer.Character = &kanji.Character
	}
	if options.AskForOnyomi && kanji.Onyomi != "" {
		answer.Onyomi = &kanji.Onyomi
	}
	if options.AskForKunyomi && kanji.Kunyomi != "" {
		answer.Kunyomi = &kanji.Kunyomi
	}
	if options.AskForEnglish && englishMeaning != "" {
		answer.Meanings = &englishMeaning
	}

	// Generate wrong options
	kanjiStruct := struct {
		ID        int64
		Character string
		Meanings  string
		Onyomi    string
		Kunyomi   string
	}{
		ID:        kanji.ID,
		Character: kanji.Character,
		Meanings:  kanji.Meanings,
		Onyomi:    kanji.Onyomi,
		Kunyomi:   kanji.Kunyomi,
	}
	wrongOptions, err := h.generateKanjiWrongOptions(kanjiID, kanjiStruct, options, config)
	if err != nil {
		return Flashcard{}, err
	}

	// Combine correct answer with wrong options
	allOptions := append(wrongOptions, answer)
	correctIndex := len(allOptions) - 1

	// Shuffle options if requested
	if config.ShuffleOptions {
		allOptions, correctIndex = shuffleFlashcardOptions(allOptions, correctIndex)
	}

	return Flashcard{
		Type:         FlashcardTypeKanji,
		Question:     question,
		Answer:       answer,
		Options:      allOptions,
		CorrectIndex: correctIndex,
		ItemID:       kanjiID,
		ItemType:     "kanji",
		AudioPath:    kanji.AudioPath,
	}, nil
}

// generateKanjiWrongOptions generates wrong options for kanji flashcards
func (h *FlashcardHandler) generateKanjiWrongOptions(kanjiID int64, kanji struct {
	ID        int64
	Character string
	Meanings  string
	Onyomi    string
	Kunyomi   string
}, options *KanjiPracticeOptions, config *FlashcardConfig) ([]FlashcardContent, error) {
	var wrongOptions []FlashcardContent

	// Get wrong kanji
	var wrongKanji []struct {
		ID        int64  `json:"id"`
		Character string `json:"character"`
		Meanings  string `json:"meanings"`
		Onyomi    string `json:"onyomi"`
		Kunyomi   string `json:"kunyomi"`
	}

	err := h.db.Table("kanji").
		Select("id, character, meanings, onyomi, kunyomi").
		Where("id != ?", kanjiID).
		Order("RANDOM()").
		Limit(3).
		Find(&wrongKanji).Error

	if err != nil {
		return nil, err
	}

	// Build wrong option content based on what user is being asked for
	for _, wrongK := range wrongKanji {
		wrongOption := FlashcardContent{}

		if options.AskForCharacter {
			wrongOption.Character = &wrongK.Character
		}
		if options.AskForOnyomi && wrongK.Onyomi != "" {
			wrongOption.Onyomi = &wrongK.Onyomi
		}
		if options.AskForKunyomi && wrongK.Kunyomi != "" {
			wrongOption.Kunyomi = &wrongK.Kunyomi
		}
		if options.AskForEnglish && wrongK.Meanings != "" {
			var wrongMeanings []string
			json.Unmarshal([]byte(wrongK.Meanings), &wrongMeanings)
			if len(wrongMeanings) > 0 {
				wrongOption.Meanings = &wrongMeanings[0]
			}
		}

		wrongOptions = append(wrongOptions, wrongOption)
	}

	return wrongOptions, nil
}
