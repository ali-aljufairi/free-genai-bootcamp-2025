package flashcard

import "errors"

// validateFlashcardConfig validates flashcard configuration
func (h *FlashcardHandler) validateFlashcardConfig(config *FlashcardConfig) error {
	if config.FlashcardType != FlashcardTypeWord && config.FlashcardType != FlashcardTypeKanji {
		return errors.New("invalid flashcard type")
	}

	if config.ContentSource != ContentSourceUnit &&
		config.ContentSource != ContentSourceGroup &&
		config.ContentSource != ContentSourceJLPT &&
		config.ContentSource != ContentSourceSRS {
		return errors.New("invalid content source")
	}

	// Validate content source specific requirements
	switch config.ContentSource {
	case ContentSourceUnit:
		if config.CourseID == nil {
			return errors.New("course_id is required for unit-based practice")
		}
	case ContentSourceGroup:
		if config.GroupID == nil {
			return errors.New("group_id is required for group-based practice")
		}
	}

	// Validate practice options
	if config.FlashcardType == FlashcardTypeWord {
		if config.WordOptions == nil {
			return errors.New("word_options is required for word flashcards")
		}
		if err := h.validateWordOptions(config.WordOptions); err != nil {
			return err
		}
	} else if config.FlashcardType == FlashcardTypeKanji {
		if config.KanjiOptions == nil {
			return errors.New("kanji_options is required for kanji flashcards")
		}
		if err := h.validateKanjiOptions(config.KanjiOptions); err != nil {
			return err
		}
	}

	if config.CardCount <= 0 || config.CardCount > 100 {
		return errors.New("card count must be between 1 and 100")
	}

	if config.TimeLimit != nil && *config.TimeLimit <= 0 {
		return errors.New("time limit must be positive")
	}

	return nil
}

// validateWordOptions validates word practice options
func (h *FlashcardHandler) validateWordOptions(options *WordPracticeOptions) error {
	// At least one "ask for" option must be true
	if !options.AskForKana && !options.AskForKanji && !options.AskForRomaji &&
		!options.AskForEnglish {
		return errors.New("at least one 'ask_for' option must be true for word practice")
	}

	// At least one "show" option must be true
	if !options.ShowKana && !options.ShowKanji && !options.ShowRomaji &&
		!options.ShowEnglish {
		return errors.New("at least one 'show' option must be true for word practice")
	}

	return nil
}

// validateKanjiOptions validates kanji practice options
func (h *FlashcardHandler) validateKanjiOptions(options *KanjiPracticeOptions) error {
	// At least one "ask for" option must be true
	if !options.AskForCharacter && !options.AskForOnyomi && !options.AskForKunyomi &&
		!options.AskForEnglish {
		return errors.New("at least one 'ask_for' option must be true for kanji practice")
	}

	// At least one "show" option must be true
	if !options.ShowCharacter && !options.ShowOnyomi && !options.ShowKunyomi &&
		!options.ShowEnglish {
		return errors.New("at least one 'show' option must be true for kanji practice")
	}

	return nil
}
