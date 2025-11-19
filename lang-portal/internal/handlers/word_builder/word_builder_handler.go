package word_builder

import (
	"encoding/json"
	"fmt"
	"lang-portal/internal/repositories"
	"log"
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
	startTime := time.Now()
	
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

	// Get 6 kanji using fast iterative selection
	kanjiStartTime := time.Now()
	kanji, err := h.getSimpleKanji(req.JLPTLevel, 6, nil)
	kanjiDuration := time.Since(kanjiStartTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get kanji",
			"details": err.Error(),
		})
	}

	// Pre-compute all valid words
	wordsStartTime := time.Now()
	validWords, err := h.ComputeValidWords(kanji)
	wordsDuration := time.Since(wordsStartTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to compute valid words",
			"details": err.Error(),
			"debug": map[string]interface{}{
				"kanji_count": len(kanji),
				"kanji_ids": func() []int64 {
					ids := make([]int64, len(kanji))
					for i, k := range kanji {
						ids[i] = k.ID
					}
					return ids
				}(),
			},
		})
	}

	// Create session in learning_activities
	dbStartTime := time.Now()
	kanjiIDs := make([]int64, len(kanji))
	for i, k := range kanji {
		kanjiIDs[i] = k.ID
	}

	configMap := map[string]interface{}{
		"time_limit":    req.TimeLimit,
		"formed_words":  []string{},
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
	dbDuration := time.Since(dbStartTime)

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create session",
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

	totalDuration := time.Since(startTime)
	log.Printf("[StartSession] TIMING - Total: %v | Kanji selection: %v | Word computation: %v | DB insert: %v | Valid words: %d | Kanji count: %d",
		totalDuration, kanjiDuration, wordsDuration, dbDuration, len(validWords), len(kanji))

	return c.JSON(response)
}

// RefreshKanji refreshes the kanji pool
func (h *WordBuilderHandler) RefreshKanji(c *fiber.Ctx) error {
	startTime := time.Now()
	
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

	// Validate JLPT level from request (no need to lookup session!)
	if req.JLPTLevel < 1 || req.JLPTLevel > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "JLPT level must be between 1 and 5",
		})
	}

	// Get 6 new kanji, excluding used ones
	kanjiStartTime := time.Now()
	newKanji, err := h.getSimpleKanji(req.JLPTLevel, 6, req.UsedKanjiIDs)
	kanjiDuration := time.Since(kanjiStartTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get new kanji",
			"details": err.Error(),
			"debug": map[string]interface{}{
				"jlpt_level":    req.JLPTLevel,
				"used_kanji_ids": req.UsedKanjiIDs,
			},
		})
	}

	// Pre-compute valid words from new kanji
	wordsStartTime := time.Now()
	validWords, err := h.ComputeValidWords(newKanji)
	wordsDuration := time.Since(wordsStartTime)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to compute valid words",
			"details": err.Error(),
			"debug": map[string]interface{}{
				"kanji_count": len(newKanji),
				"kanji_ids": func() []int64 {
					ids := make([]int64, len(newKanji))
					for i, k := range newKanji {
						ids[i] = k.ID
					}
					return ids
				}(),
			},
		})
	}

	// Optionally update session if session_id is provided (for tracking purposes)
	// But don't fail if session doesn't exist - refresh should work regardless
	dbStartTime := time.Now()
	if req.SessionID > 0 {
		var activity LearningActivity
		result := h.DB.Table("learning_activities").
			Where("id = ? AND user_id = ?", req.SessionID, userID).
			First(&activity)

		if result.Error == nil {
			// Session exists - update it with refresh count and new kanji
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

			var existingItemIDs []int64
			if activity.ItemIDs != nil {
				existingItemIDs = activity.ItemIDs
			}
			updatedItemIDs := append(existingItemIDs, newKanjiIDs...)

			// Marshal config to JSON for JSONB
			configJSON, err := json.Marshal(config)
			if err == nil {
				// Update session (ignore errors - refresh should still work)
				h.DB.Exec(`
					UPDATE learning_activities 
					SET item_ids = $1, config = $2::jsonb
					WHERE id = $3
				`, updatedItemIDs, string(configJSON), req.SessionID)
			}
		}
		// If session doesn't exist, that's fine - just continue without updating
	}
	dbDuration := time.Since(dbStartTime)

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

	totalDuration := time.Since(startTime)
	log.Printf("[RefreshKanji] TIMING - Total: %v | Kanji selection: %v | Word computation: %v | DB update: %v | Valid words: %d",
		totalDuration, kanjiDuration, wordsDuration, dbDuration, len(validWords))

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
