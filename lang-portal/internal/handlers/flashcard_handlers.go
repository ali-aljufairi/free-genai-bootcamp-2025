package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"lang-portal/internal/database/models"
	"math/rand"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// FlashcardType represents the type of content
type FlashcardType string

const (
	FlashcardTypeWord  FlashcardType = "word"
	FlashcardTypeKanji FlashcardType = "kanji"
)

// ContentSource represents the source of flashcard content
type ContentSource string

const (
	ContentSourceUnit  ContentSource = "unit"
	ContentSourceGroup ContentSource = "group"
	ContentSourceJLPT  ContentSource = "jlpt"
	ContentSourceSRS   ContentSource = "srs"
)

// WordPracticeOptions represents what the user wants to practice for words
type WordPracticeOptions struct {
	ShowKana         bool `json:"show_kana"`           // Show hiragana/katakana reading
	ShowKanji        bool `json:"show_kanji"`          // Show kanji writing
	ShowRomaji       bool `json:"show_romaji"`         // Show romanized reading
	ShowEnglish      bool `json:"show_english"`        // Show English meaning
	ShowPartOfSpeech bool `json:"show_part_of_speech"` // Show part of speech

	// What to ask for (one must be true)
	AskForKana         bool `json:"ask_for_kana"`           // Ask for hiragana/katakana
	AskForKanji        bool `json:"ask_for_kanji"`          // Ask for kanji writing
	AskForRomaji       bool `json:"ask_for_romaji"`         // Ask for romaji
	AskForEnglish      bool `json:"ask_for_english"`        // Ask for English meaning
	AskForPartOfSpeech bool `json:"ask_for_part_of_speech"` // Ask for part of speech
}

// KanjiPracticeOptions represents what the user wants to practice for kanji
type KanjiPracticeOptions struct {
	ShowCharacter bool `json:"show_character"` // Show kanji character
	ShowOnyomi    bool `json:"show_onyomi"`    // Show onyomi reading
	ShowKunyomi   bool `json:"show_kunyomi"`   // Show kunyomi reading
	ShowEnglish   bool `json:"show_english"`   // Show English meaning

	// What to ask for (one must be true)
	AskForCharacter bool `json:"ask_for_character"` // Ask for kanji character
	AskForOnyomi    bool `json:"ask_for_onyomi"`    // Ask for onyomi reading
	AskForKunyomi   bool `json:"ask_for_kunyomi"`   // Ask for kunyomi reading
	AskForEnglish   bool `json:"ask_for_english"`   // Ask for English meaning
}

// ContentFilters represents filters for content selection
type ContentFilters struct {
	JLPTLevels       []int    `json:"jlpt_levels"`       // Filter by JLPT levels (1-5)
	PartsOfSpeech    []string `json:"parts_of_speech"`   // Filter by parts of speech
	DifficultyLevels []int    `json:"difficulty_levels"` // Filter by difficulty levels
	HasKanji         *bool    `json:"has_kanji"`         // Filter words that have/don't have kanji
}

// FlashcardConfig represents the complete flashcard configuration
type FlashcardConfig struct {
	FlashcardType FlashcardType `json:"flashcard_type"`
	ContentSource ContentSource `json:"content_source"`

	// Content source specific IDs
	CourseID *int `json:"course_id"` // Required for unit-based practice
	UnitID   *int `json:"unit_id"`   // Optional: specific unit
	GroupID  *int `json:"group_id"`  // Required for group-based practice

	// Practice options
	WordOptions  *WordPracticeOptions  `json:"word_options"`  // Required if flashcard_type is "word"
	KanjiOptions *KanjiPracticeOptions `json:"kanji_options"` // Required if flashcard_type is "kanji"

	// Content filters
	Filters ContentFilters `json:"filters"`

	// Session settings
	CardCount      int  `json:"card_count"`      // Number of cards (1-100)
	TimeLimit      *int `json:"time_limit"`      // seconds per card, nil for no limit
	ShuffleOptions bool `json:"shuffle_options"` // Whether to shuffle multiple choice options
}

// FlashcardContent represents the content shown on a flashcard
type FlashcardContent struct {
	// Word content
	Kana         *string `json:"kana,omitempty"`
	Kanji        *string `json:"kanji,omitempty"`
	Romaji       *string `json:"romaji,omitempty"`
	English      *string `json:"english,omitempty"`
	PartOfSpeech *string `json:"part_of_speech,omitempty"`

	// Kanji content
	Character *string `json:"character,omitempty"`
	Onyomi    *string `json:"onyomi,omitempty"`
	Kunyomi   *string `json:"kunyomi,omitempty"`
	Meanings  *string `json:"meanings,omitempty"`
}

// Flashcard represents a single flashcard
type Flashcard struct {
	ID           int64              `json:"id"`
	Type         FlashcardType      `json:"type"`
	Question     FlashcardContent   `json:"question"`      // What user sees
	Answer       FlashcardContent   `json:"answer"`        // What user should answer
	Options      []FlashcardContent `json:"options"`       // Multiple choice options (includes correct answer)
	CorrectIndex int                `json:"correct_index"` // Index of correct answer in options
	ItemID       int64              `json:"item_id"`
	ItemType     string             `json:"item_type"`
}

// FlashcardSession represents a flashcard session
type FlashcardSession struct {
	ID        int64           `json:"id"`
	UserID    int64           `json:"user_id"`
	Config    FlashcardConfig `json:"config"`
	Cards     []Flashcard     `json:"cards"`
	StartedAt time.Time       `json:"started_at"`
	EndedAt   *time.Time      `json:"ended_at"`
	Score     *int            `json:"score"`
	Total     int             `json:"total"`
}

// FlashcardAnswer represents a user's answer to a flashcard
type FlashcardAnswer struct {
	CardID int64 `json:"card_id"`
	Answer int   `json:"answer"` // index of selected option
}

// FlashcardSubmission represents a complete flashcard submission
type FlashcardSubmission struct {
	SessionID int64             `json:"session_id"`
	Answers   []FlashcardAnswer `json:"answers"`
}

// FlashcardResult represents flashcard results
type FlashcardResult struct {
	SessionID    int64        `json:"session_id"`
	Score        int          `json:"score"`
	Total        int          `json:"total"`
	Percentage   float64      `json:"percentage"`
	CorrectCount int          `json:"correct_count"`
	WrongCount   int          `json:"wrong_count"`
	Duration     int          `json:"duration"` // seconds
	Results      []CardResult `json:"results"`
}

// CardResult represents individual card results
type CardResult struct {
	CardID       int64  `json:"card_id"`
	ItemID       int64  `json:"item_id"`
	ItemType     string `json:"item_type"`
	UserAnswer   int    `json:"user_answer"`
	CorrectIndex int    `json:"correct_index"`
	IsCorrect    bool   `json:"is_correct"`
}

// FlashcardHandler handles flashcard operations
type FlashcardHandler struct {
	db *gorm.DB
}

func NewFlashcardHandler(db *gorm.DB) *FlashcardHandler {
	return &FlashcardHandler{db: db}
}

// getFirstMeaning extracts the first meaning from a comma-separated string
func getFirstMeaning(meanings string) string {
	if meanings == "" {
		return ""
	}
	parts := strings.Split(meanings, ",")
	if len(parts) > 0 {
		return strings.TrimSpace(parts[0])
	}
	return meanings
}

// getUserID gets user ID from context or falls back to first available user
func (h *FlashcardHandler) getUserID(c *fiber.Ctx) (int64, error) {
	// Try to get user ID from context first (from auth middleware)
	if userIDInterface := c.Locals("user_id"); userIDInterface != nil {
		if userID, ok := userIDInterface.(int64); ok && userID > 0 {
			return userID, nil
		}
	}

	// Fallback: get first available user from database
	var userID int64
	err := h.db.Raw("SELECT id FROM users ORDER BY id LIMIT 1").Scan(&userID).Error
	if err != nil {
		return 0, fmt.Errorf("no users found in database: %w", err)
	}

	if userID == 0 {
		return 0, fmt.Errorf("no valid user ID found")
	}

	return userID, nil
}

// StartFlashcardSession starts a new flashcard session
func (h *FlashcardHandler) StartFlashcardSession(c *fiber.Ctx) error {
	var config FlashcardConfig
	if err := c.BodyParser(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid flashcard configuration",
		})
	}

	// Validate flashcard configuration
	if err := h.validateFlashcardConfig(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get user ID from context or use fallback
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user ID",
		})
	}

	// Ensure development user exists in PostgreSQL
	if err := h.ensureDevUserExists(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to set up user",
		})
	}

	// Ensure study activities exist
	if err := h.ensureStudyActivitiesExist(); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to set up study activities",
		})
	}

	// Generate a deterministic seed and use it for option shuffling
	seed := time.Now().UnixNano()
	rand.Seed(seed)

	// Generate flashcard content based on configuration
	cards, err := h.generateFlashcards(userID, &config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate flashcards",
		})
	}

	// Create flashcard session
	session := FlashcardSession{
		UserID:    userID,
		Config:    config,
		Cards:     cards,
		StartedAt: time.Now(),
		Total:     len(cards),
	}

	// Store session in database
	sessionID, err := h.createFlashcardSession(&session, seed)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create flashcard session",
		})
	}

	session.ID = sessionID

	return c.Status(fiber.StatusCreated).JSON(session)
}

// SubmitFlashcardSession submits flashcard answers and calculates results
func (h *FlashcardHandler) SubmitFlashcardSession(c *fiber.Ctx) error {
	var submission FlashcardSubmission
	if err := c.BodyParser(&submission); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid flashcard submission",
		})
	}

	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user ID",
		})
	}

	// Get flashcard session
	session, err := h.getFlashcardSession(submission.SessionID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Flashcard session not found",
		})
	}

	// Calculate results
	result, err := h.calculateFlashcardResults(session, &submission)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate flashcard results",
		})
	}

	// Update SRS progress
	err = h.updateSRSProgress(userID, result)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update progress",
		})
	}

	// Update unit completion if applicable
	if session.Config.ContentSource == ContentSourceUnit && session.Config.UnitID != nil {
		err = h.checkUnitCompletion(userID, *session.Config.UnitID)
		if err != nil {
			// Log error but don't fail the flashcard submission
			// TODO: Add proper logging
		}
	}

	// End flashcard session
	err = h.endFlashcardSession(submission.SessionID, result)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to end flashcard session",
		})
	}

	return c.JSON(result)
}

// GetFlashcardHistory gets user's flashcard history
func (h *FlashcardHandler) GetFlashcardHistory(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user ID",
		})
	}
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	// Get flashcard history from database
	sessions, total, err := h.getFlashcardHistory(userID, pageSize, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get flashcard history",
		})
	}

	return c.JSON(fiber.Map{
		"sessions":   sessions,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetAvailableCourses gets available courses for the user
func (h *FlashcardHandler) GetAvailableCourses(c *fiber.Ctx) error {
	var courses []struct {
		ID    int    `json:"id"`
		Name  string `json:"name"`
		Level int    `json:"level"`
	}

	err := h.db.Table("courses").
		Select("id, name, level").
		Order("level, name").
		Find(&courses).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get courses",
		})
	}

	return c.JSON(courses)
}

// GetCourseUnits gets units for a specific course
func (h *FlashcardHandler) GetCourseUnits(c *fiber.Ctx) error {
	courseID := c.Params("courseId")
	if courseID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Course ID is required",
		})
	}

	courseIDInt, err := strconv.Atoi(courseID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid course ID",
		})
	}

	var units []struct {
		ID    int    `json:"id"`
		Title string `json:"title"`
		Path  string `json:"path"`
	}

	// Get id, title, and path from the database
	err = h.db.Table("units").
		Select("id, title, path").
		Where("course_id = ?", courseIDInt).
		Order("path").
		Find(&units).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get units",
		})
	}

	// Transform to include name field for frontend compatibility
	var result []struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
		Path string `json:"path"`
	}

	for _, unit := range units {
		result = append(result, struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Path string `json:"path"`
		}{
			ID:   unit.ID,
			Name: unit.Title, // Use the actual title from database
			Path: unit.Path,
		})
	}

	return c.JSON(result)
}

// GetAvailablePartsOfSpeech gets available parts of speech
func (h *FlashcardHandler) GetAvailablePartsOfSpeech(c *fiber.Ctx) error {
	var partsOfSpeech []string

	err := h.db.Table("words").
		Select("DISTINCT part_of_speech::text").
		Where("part_of_speech IS NOT NULL").
		Order("part_of_speech").
		Pluck("part_of_speech", &partsOfSpeech).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get parts of speech",
		})
	}

	return c.JSON(partsOfSpeech)
}

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
		!options.AskForEnglish && !options.AskForPartOfSpeech {
		return errors.New("at least one 'ask_for' option must be true for word practice")
	}

	// At least one "show" option must be true
	if !options.ShowKana && !options.ShowKanji && !options.ShowRomaji &&
		!options.ShowEnglish && !options.ShowPartOfSpeech {
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

	// Generate flashcards for each item
	for _, item := range unitItems {
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

		// Generate word flashcards
		for _, word := range words {
			card, err := h.generateWordFlashcard(word.ID, config)
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
			card, err := h.generateWordFlashcard(word.ID, config)
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

// generateWordFlashcard generates a word flashcard based on user preferences
func (h *FlashcardHandler) generateWordFlashcard(wordID int64, config *FlashcardConfig) (Flashcard, error) {
	var word models.Word
	err := h.db.First(&word, wordID).Error
	if err != nil {
		return Flashcard{}, err
	}

	options := config.WordOptions

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
	if options.ShowPartOfSpeech {
		question.PartOfSpeech = &word.PartOfSpeech
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
	if options.AskForPartOfSpeech {
		answer.PartOfSpeech = &word.PartOfSpeech
	}

	// Generate wrong options
	wrongOptions, err := h.generateWordWrongOptions(wordID, word, options, config)
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
		ItemID:       wordID,
		ItemType:     "word",
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
		if options.AskForPartOfSpeech {
			wrongOption.PartOfSpeech = &wrongWord.PartOfSpeech
		}

		wrongOptions = append(wrongOptions, wrongOption)
	}

	return wrongOptions, nil
}

// generateKanjiFlashcard generates a kanji flashcard based on user preferences
func (h *FlashcardHandler) generateKanjiFlashcard(kanjiID int64, config *FlashcardConfig) (Flashcard, error) {
	var kanji struct {
		ID        int64  `json:"id"`
		Character string `json:"character"`
		Meanings  string `json:"meanings"`
		Onyomi    string `json:"onyomi"`
		Kunyomi   string `json:"kunyomi"`
	}

	err := h.db.Table("kanji").
		Select("id, character, meanings, onyomi, kunyomi").
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

// createFlashcardSession creates a flashcard session in the database
func (h *FlashcardHandler) createFlashcardSession(session *FlashcardSession, seed int64) (int64, error) {
	// Create payload with config and seed for deterministic regeneration
	payload := map[string]interface{}{
		"flashcard_config": session.Config,
		"seed":             seed,
		"card_count":       len(session.Cards),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Determine session type based on flashcard type
	sessionType := "vocabulary_review"
	if session.Config.FlashcardType == FlashcardTypeKanji {
		sessionType = "kanji_study"
	}

	// Insert session into enhanced_study_sessions
	var sessionID int64
	err = h.db.Raw(`
		INSERT INTO enhanced_study_sessions 
		(user_id, session_type, notes, created_at, started_at) 
		VALUES (?, ?, ?, NOW(), ?)
		RETURNING id
	`, session.UserID, sessionType, string(payloadJSON), session.StartedAt).Scan(&sessionID).Error

	if err != nil {
		return 0, fmt.Errorf("failed to create session: %w", err)
	}

	// Assign ephemeral IDs to cards using index (not stored). Client will return positions.
	for i := range session.Cards {
		session.Cards[i].ID = int64(i + 1)
	}

	return sessionID, nil
}

// getFlashcardSession gets a flashcard session by ID
func (h *FlashcardHandler) getFlashcardSession(sessionID int64, userID int64) (*FlashcardSession, error) {
	// Read config + seed from enhanced_study_sessions.notes
	var row struct {
		ID        int64      `gorm:"column:id"`
		UserID    int64      `gorm:"column:user_id"`
		Notes     *string    `gorm:"column:notes"`
		StartedAt time.Time  `gorm:"column:started_at"`
		EndedAt   *time.Time `gorm:"column:ended_at"`
	}
	if err := h.db.Table("enhanced_study_sessions").Where("id = ? AND user_id = ?", sessionID, userID).First(&row).Error; err != nil {
		return nil, err
	}

	var cfg FlashcardConfig
	var seed int64
	if row.Notes != nil && *row.Notes != "" {
		var payload map[string]json.RawMessage
		if err := json.Unmarshal([]byte(*row.Notes), &payload); err == nil {
			if b, ok := payload["flashcard_config"]; ok {
				_ = json.Unmarshal(b, &cfg)
			}
			if b, ok := payload["seed"]; ok {
				_ = json.Unmarshal(b, &seed)
			}
		}
	}

	// Regenerate cards deterministically using the same config and seed
	if seed != 0 {
		rand.Seed(seed)
	}
	cards, err := h.generateFlashcards(userID, &cfg)
	if err != nil {
		return nil, err
	}
	for i := range cards {
		cards[i].ID = int64(i + 1)
	}

	total := len(cards)
	return &FlashcardSession{
		ID:        sessionID,
		UserID:    userID,
		Config:    cfg,
		Cards:     cards,
		StartedAt: row.StartedAt,
		EndedAt:   row.EndedAt,
		Total:     total,
	}, nil
}

// calculateFlashcardResults calculates flashcard results
func (h *FlashcardHandler) calculateFlashcardResults(session *FlashcardSession, submission *FlashcardSubmission) (*FlashcardResult, error) {
	correctCount := 0
	var results []CardResult

	for _, answer := range submission.Answers {
		// Find the card
		var card Flashcard
		for _, c := range session.Cards {
			if c.ID == answer.CardID {
				card = c
				break
			}
		}

		isCorrect := answer.Answer == card.CorrectIndex
		if isCorrect {
			correctCount++
		}

		results = append(results, CardResult{
			CardID:       answer.CardID,
			ItemID:       card.ItemID,
			ItemType:     card.ItemType,
			UserAnswer:   answer.Answer,
			CorrectIndex: card.CorrectIndex,
			IsCorrect:    isCorrect,
		})
	}

	percentage := float64(correctCount) / float64(len(results)) * 100

	return &FlashcardResult{
		SessionID:    submission.SessionID,
		Score:        correctCount,
		Total:        len(results),
		Percentage:   percentage,
		CorrectCount: correctCount,
		WrongCount:   len(results) - correctCount,
		Results:      results,
	}, nil
}

// updateSRSProgress updates SRS progress based on flashcard results
func (h *FlashcardHandler) updateSRSProgress(userID int64, result *FlashcardResult) error {
	for _, cardResult := range result.Results {
		// Update SRS progress using existing function
		err := h.db.Exec(
			"SELECT update_srs_progress(?, ?, ?, ?)",
			userID,
			cardResult.ItemType,
			cardResult.ItemID,
			cardResult.IsCorrect,
		).Error

		if err != nil {
			return err
		}

		// Update correct_count in words table if it's a word
		if cardResult.ItemType == "word" {
			err = h.db.Exec(
				"UPDATE words SET correct_count = correct_count + ? WHERE id = ?",
				cardResult.IsCorrect,
				cardResult.ItemID,
			).Error

			if err != nil {
				return err
			}
		}
	}

	return nil
}

// checkUnitCompletion checks if a unit is completed
func (h *FlashcardHandler) checkUnitCompletion(userID int64, unitID int) error {
	// Check if all words in unit have been correctly answered 3 times
	var incompleteWords int64
	err := h.db.Raw(`
		SELECT COUNT(*) FROM unit_items ui
		LEFT JOIN progress p ON ui.item_type = p.item_type AND ui.item_id = p.item_id AND p.user_id = ?
		WHERE ui.unit_id = ? AND ui.item_type = 'word'
		AND (p.correct_cnt IS NULL OR p.correct_cnt < 3)
	`, userID, unitID).Scan(&incompleteWords).Error

	if err != nil {
		return err
	}

	// If no incomplete words, mark unit as completed
	if incompleteWords == 0 {
		err = h.db.Exec(`
			INSERT INTO user_course_progress (user_id, unit_id, completion_percentage, completed_at)
			VALUES (?, ?, 100, NOW())
			ON CONFLICT (user_id, unit_id) DO UPDATE SET
			completion_percentage = 100,
			completed_at = NOW()
		`, userID, unitID).Error

		return err
	}

	return nil
}

// endFlashcardSession ends a flashcard session
func (h *FlashcardHandler) endFlashcardSession(sessionID int64, result *FlashcardResult) error {
	// Update enhanced_study_sessions summary (ended_at, totals)
	return h.db.Table("enhanced_study_sessions").Where("id = ?", sessionID).Updates(map[string]any{
		"ended_at":        time.Now(),
		"total_correct":   result.CorrectCount,
		"total_incorrect": result.WrongCount,
	}).Error
}

// getFlashcardHistory gets user's flashcard history
func (h *FlashcardHandler) getFlashcardHistory(userID int64, limit int, offset int) ([]FlashcardSession, int64, error) {
	// Pull from enhanced_study_sessions filtered by session_type
	var total int64
	if err := h.db.Table("enhanced_study_sessions").Where("user_id = ? AND session_type IN ('vocabulary_review','kanji_study')", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []struct {
		ID             int64      `gorm:"column:id"`
		Notes          *string    `gorm:"column:notes"`
		StartedAt      time.Time  `gorm:"column:started_at"`
		EndedAt        *time.Time `gorm:"column:ended_at"`
		TotalCorrect   *int       `gorm:"column:total_correct"`
		TotalIncorrect *int       `gorm:"column:total_incorrect"`
	}
	if err := h.db.Table("enhanced_study_sessions").
		Where("user_id = ? AND session_type IN ('vocabulary_review','kanji_study')", userID).
		Order("started_at DESC").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	sessions := make([]FlashcardSession, 0, len(rows))
	for _, r := range rows {
		var cfg FlashcardConfig
		if r.Notes != nil && *r.Notes != "" {
			var payload map[string]json.RawMessage
			if err := json.Unmarshal([]byte(*r.Notes), &payload); err == nil {
				if b, ok := payload["flashcard_config"]; ok {
					_ = json.Unmarshal(b, &cfg)
				}
			}
		}
		sessions = append(sessions, FlashcardSession{
			ID:        r.ID,
			UserID:    userID,
			Config:    cfg,
			StartedAt: r.StartedAt,
			EndedAt:   r.EndedAt,
			Score:     r.TotalCorrect,
			Total: func() int {
				if r.TotalCorrect != nil && r.TotalIncorrect != nil {
					return *r.TotalCorrect + *r.TotalIncorrect
				}
				return 0
			}(),
		})
	}
	return sessions, total, nil
}

// shuffleFlashcardOptions randomizes options and returns new slice and new correct index
func shuffleFlashcardOptions(options []FlashcardContent, correctIndex int) ([]FlashcardContent, int) {
	rand.Seed(time.Now().UnixNano())
	// Pair option with original index
	type pair struct {
		opt        FlashcardContent
		wasCorrect bool
	}
	pairs := make([]pair, len(options))
	for i, o := range options {
		pairs[i] = pair{opt: o, wasCorrect: i == correctIndex}
	}
	rand.Shuffle(len(pairs), func(i, j int) { pairs[i], pairs[j] = pairs[j], pairs[i] })
	newOpts := make([]FlashcardContent, len(options))
	newCorrect := 0
	for i, p := range pairs {
		newOpts[i] = p.opt
		if p.wasCorrect {
			newCorrect = i
		}
	}
	return newOpts, newCorrect
}

// ensureDevUserExists creates a development user if it doesn't exist
func (h *FlashcardHandler) ensureDevUserExists(userID int64) error {
	// Check if user exists
	var count int64
	err := h.db.Raw("SELECT COUNT(*) FROM users WHERE id = ?", userID).Scan(&count).Error
	if err != nil {
		return fmt.Errorf("failed to check user existence: %w", err)
	}

	if count == 0 {
		// Create development user
		err = h.db.Exec(`
			INSERT INTO users (id, clerk_id, email, display_name) 
			VALUES (?, ?, ?, ?)
			ON CONFLICT (id) DO NOTHING
		`, userID, fmt.Sprintf("dev_user_%d", userID), fmt.Sprintf("dev%d@example.com", userID), fmt.Sprintf("Dev User %d", userID)).Error

		if err != nil {
			return fmt.Errorf("failed to create development user: %w", err)
		}
	}

	return nil
}

// ensureStudyActivitiesExist creates required study activities if they don't exist
func (h *FlashcardHandler) ensureStudyActivitiesExist() error {
	// For now, skip study activities setup since we're focusing on getting the flashcards working
	// This can be re-enabled once the database schema is properly aligned
	return nil
}
