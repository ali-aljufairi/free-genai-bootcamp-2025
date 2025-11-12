package word_builder

import (
	"encoding/json"
	"fmt"
	"lang-portal/internal/repositories"
	"math/rand"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type WordBuilderHandler struct {
	KanjiStore *repositories.KanjiStore
	WordsStore *repositories.WordsStore
	DB         *gorm.DB
}

func NewWordBuilderHandler(kanjiStore *repositories.KanjiStore, wordsStore *repositories.WordsStore, db *gorm.DB) *WordBuilderHandler {
	return &WordBuilderHandler{
		KanjiStore: kanjiStore,
		WordsStore: wordsStore,
		DB:         db,
	}
}

// LearningActivity represents the learning_activities table structure
type LearningActivity struct {
	ID              int64          `gorm:"primaryKey"`
	UserID          int64          `gorm:"column:user_id"`
	ActivityType    string         `gorm:"column:activity_type"`
	ContentType     string         `gorm:"column:content_type"`
	JLPTLevel       *int           `gorm:"column:jlpt_level"`
	ItemIDs         []int64        `gorm:"column:item_ids;type:integer[]"`
	ItemCount       int            `gorm:"column:item_count"`
	CorrectCount    int            `gorm:"column:correct_count"`
	TotalTimeSeconds int           `gorm:"column:total_time_seconds"`
	StartedAt       time.Time      `gorm:"column:started_at"`
	CompletedAt     *time.Time     `gorm:"column:completed_at"`
	Config          map[string]interface{} `gorm:"column:config;type:jsonb"`
}

func (LearningActivity) TableName() string {
	return "learning_activities"
}

// ValidWord represents a valid word that can be formed from kanji
type ValidWord struct {
	Kanji    string `json:"kanji"`
	Kana     string `json:"kana"`
	English  string `json:"english"`
	WordID   int64  `json:"word_id"`
	KanjiIDs []int64 `json:"kanji_ids"`
}

// StartSessionRequest represents the request to start a word builder session
type StartSessionRequest struct {
	JLPTLevel int `json:"jlpt_level"`
	TimeLimit int `json:"time_limit"` // in seconds
}

// StartSessionResponse represents the response from starting a session
type StartSessionResponse struct {
	SessionID  int64       `json:"session_id"`
	Kanji      []KanjiData `json:"kanji"`
	ValidWords []ValidWord `json:"valid_words"`
	TimeLimit  int         `json:"time_limit"`
}

// KanjiData represents kanji information
type KanjiData struct {
	ID       int64   `json:"id"`
	Character string `json:"character"`
	Onyomi   *string `json:"onyomi"`
	Kunyomi  *string `json:"kunyomi"`
	Meanings []string `json:"meanings"`
	JLPT     *int    `json:"jlpt"`
}

// RefreshRequest represents the request to refresh kanji
type RefreshRequest struct {
	SessionID   int64   `json:"session_id"`
	UsedKanjiIDs []int64 `json:"used_kanji_ids"`
}

// RefreshResponse represents the response from refreshing kanji
type RefreshResponse struct {
	Kanji      []KanjiData `json:"kanji"`
	ValidWords []ValidWord `json:"valid_words"`
}

// SubmitRequest represents the request to submit results
type SubmitRequest struct {
	SessionID     int64    `json:"session_id"`
	FormedWords   []string `json:"formed_words"`
	TotalAttempts int      `json:"total_attempts"`
	TimeSpent     int      `json:"time_spent"`
	RefreshCount  int      `json:"refresh_count"`
}

// SubmitResponse represents the response from submitting results
type SubmitResponse struct {
	SessionID    int64   `json:"session_id"`
	WordsFormed  int     `json:"words_formed"`
	Accuracy     float64 `json:"accuracy"`
	TimeSpent    int     `json:"time_spent"`
}

// getUserID extracts user ID from context
func (h *WordBuilderHandler) getUserID(c *fiber.Ctx) (int64, error) {
	userID, ok := c.Locals("user_id").(int64)
	if !ok {
		return 0, fmt.Errorf("user not authenticated")
	}
	return userID, nil
}

// StartSession starts a new word builder session
func (h *WordBuilderHandler) StartSession(c *fiber.Ctx) error {
	var req StartSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate request
	if req.JLPTLevel < 1 || req.JLPTLevel > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "JLPT level must be between 1 and 5",
		})
	}

	if req.TimeLimit < 60 || req.TimeLimit > 3600 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Time limit must be between 60 and 3600 seconds",
		})
	}

	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Get 5 random kanji
	kanji, err := h.getRandomKanji(req.JLPTLevel, 5, nil)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get kanji",
		})
	}

	// Pre-compute all valid words
	validWords, err := h.computeValidWords(kanji)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to compute valid words",
		})
	}

	// Create session in learning_activities
	kanjiIDs := make([]int64, len(kanji))
	for i, k := range kanji {
		kanjiIDs[i] = k.ID
	}

	configMap := map[string]interface{}{
		"time_limit": req.TimeLimit,
		"formed_words": []string{},
		"refresh_count": 0,
	}

	// Marshal config to JSON for JSONB
	configJSON, err := json.Marshal(configMap)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal config",
		})
	}

	// Use raw SQL to properly handle PostgreSQL array type
	var sessionID int64
	err = h.DB.Raw(`
		INSERT INTO learning_activities 
		(user_id, activity_type, content_type, jlpt_level, item_ids, item_count, correct_count, total_time_seconds, started_at, config)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9::jsonb)
		RETURNING id
	`, userID, "word_builder", "kanji", req.JLPTLevel, kanjiIDs, 0, 0, 0, string(configJSON)).Scan(&sessionID).Error

	if err != nil {
		// Log the actual error for debugging
		fmt.Printf("Failed to create learning_activity: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create session",
			"details": err.Error(),
		})
	}

	// Convert kanji to response format
	kanjiData := make([]KanjiData, len(kanji))
	for i, k := range kanji {
		kanjiData[i] = KanjiData{
			ID:        k.ID,
			Character: k.Character,
			Onyomi:    k.Onyomi,
			Kunyomi:   k.Kunyomi,
			Meanings:  k.Meanings,
			JLPT:      k.JLPT,
		}
	}

	response := StartSessionResponse{
		SessionID:  sessionID,
		Kanji:      kanjiData,
		ValidWords: validWords,
		TimeLimit:  req.TimeLimit,
	}

	return c.JSON(response)
}

// RefreshKanji refreshes the kanji pool
func (h *WordBuilderHandler) RefreshKanji(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Get session to find JLPT level
	var activity LearningActivity
	result := h.DB.Table("learning_activities").
		Where("id = ? AND user_id = ?", req.SessionID, userID).
		First(&activity)
	
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	if activity.JLPTLevel == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Session missing JLPT level",
		})
	}

	// Get 5 new kanji, excluding used ones
	newKanji, err := h.getRandomKanji(*activity.JLPTLevel, 5, req.UsedKanjiIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get new kanji",
		})
	}

	// Pre-compute valid words from new kanji
	validWords, err := h.computeValidWords(newKanji)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to compute valid words",
		})
	}

	// Update session config with refresh count
	config := activity.Config
	if config == nil {
		config = make(map[string]interface{})
	}
	
	refreshCount := 0
	if rc, ok := config["refresh_count"].(float64); ok {
		refreshCount = int(rc)
	} else if rc, ok := config["refresh_count"].(int); ok {
		refreshCount = rc
	}
	config["refresh_count"] = refreshCount + 1

	// Update item_ids to include new kanji
	newKanjiIDs := make([]int64, len(newKanji))
	for i, k := range newKanji {
		newKanjiIDs[i] = k.ID
	}
	
	// Get existing item_ids and append new ones
	var existingItemIDs []int64
	if activity.ItemIDs != nil {
		existingItemIDs = activity.ItemIDs
	}
	updatedItemIDs := append(existingItemIDs, newKanjiIDs...)

	// Marshal config to JSON for JSONB
	configJSON, err := json.Marshal(config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal config",
		})
	}

	// Use raw SQL to properly handle PostgreSQL array type
	err = h.DB.Exec(`
		UPDATE learning_activities 
		SET item_ids = $1, config = $2::jsonb
		WHERE id = $3
	`, updatedItemIDs, string(configJSON), req.SessionID).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update session",
			"details": err.Error(),
		})
	}

	// Convert kanji to response format
	kanjiData := make([]KanjiData, len(newKanji))
	for i, k := range newKanji {
		kanjiData[i] = KanjiData{
			ID:        k.ID,
			Character: k.Character,
			Onyomi:    k.Onyomi,
			Kunyomi:   k.Kunyomi,
			Meanings:  k.Meanings,
			JLPT:      k.JLPT,
		}
	}

	response := RefreshResponse{
		Kanji:      kanjiData,
		ValidWords: validWords,
	}

	return c.JSON(response)
}

// SubmitResults submits the final results
func (h *WordBuilderHandler) SubmitResults(c *fiber.Ctx) error {
	var req SubmitRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Get session
	var activity LearningActivity
	result := h.DB.Table("learning_activities").
		Where("id = ? AND user_id = ?", req.SessionID, userID).
		First(&activity)
	
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Session not found",
		})
	}

	// Calculate accuracy
	var accuracy float64
	if req.TotalAttempts > 0 {
		accuracy = float64(len(req.FormedWords)) / float64(req.TotalAttempts) * 100
	}

	// Update config
	config := activity.Config
	if config == nil {
		config = make(map[string]interface{})
	}
	config["formed_words"] = req.FormedWords
	config["refresh_count"] = req.RefreshCount

	// Update session - GORM handles JSONB automatically with map[string]interface{}
	now := time.Now()
	updates := map[string]interface{}{
		"completed_at":       &now,
		"correct_count":      len(req.FormedWords),
		"item_count":         req.TotalAttempts,
		"total_time_seconds": req.TimeSpent,
		"config":             config,
	}

	if err := h.DB.Table("learning_activities").
		Where("id = ?", req.SessionID).
		Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update session",
		})
	}

	response := SubmitResponse{
		SessionID:   req.SessionID,
		WordsFormed: len(req.FormedWords),
		Accuracy:    accuracy,
		TimeSpent:   req.TimeSpent,
	}

	return c.JSON(response)
}

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
	rand.Seed(time.Now().UnixNano())
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

