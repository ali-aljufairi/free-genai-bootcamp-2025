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

const (
	MaxRetriesKanjiSelection = 10
	MaxRetriesKanjiChain     = 10
	MaxWordTriesPerKanji     = 5
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

func (h *WordBuilderHandler) getUserID(c *fiber.Ctx) (int64, error) {
	userID, ok := c.Locals("user_id").(int64)
	if !ok {
		return 0, fmt.Errorf("user not authenticated")
	}
	return userID, nil
}

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

	maxRetries := MaxRetriesKanjiSelection
	kanji := []KanjiData{}
	var validWords []ValidWord
	var kanjiDuration time.Duration
	var wordsDuration time.Duration
	excludeIDs := []int64{}

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Get kanji (excluding previously tried sets)
		kanjiAttemptStart := time.Now()
		kanji, err = h.getSimpleKanji(req.JLPTLevel, 6, excludeIDs)
		kanjiDuration = time.Since(kanjiAttemptStart)
		if err != nil {
			if attempt == maxRetries-1 {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":       "Failed to get kanji after multiple attempts",
					"details":     err.Error(),
					"attempts":    attempt + 1,
					"max_retries": maxRetries,
					"retry_type":  "kanji_selection",
				})
			}
			log.Printf("[StartSession] Attempt %d: Failed to get kanji: %v, retrying...", attempt+1, err)
			continue
		}

		// Pre-compute all valid words
		wordsStartTime := time.Now()
		validWords, err = h.ComputeValidWords(kanji)
		wordsDuration = time.Since(wordsStartTime)
		if err != nil {
			if attempt == maxRetries-1 {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":       "Failed to compute valid words after multiple attempts",
					"details":     err.Error(),
					"attempts":    attempt + 1,
					"max_retries": maxRetries,
					"retry_type":  "word_computation",
				})
			}
			log.Printf("[StartSession] Attempt %d: Failed to compute valid words: %v, retrying...", attempt+1, err)
			// Exclude these kanji and retry
			for _, k := range kanji {
				excludeIDs = append(excludeIDs, k.ID)
			}
			continue
		}

		// If we found valid words, break out of retry loop
		if len(validWords) > 0 {
			if attempt > 0 {
				log.Printf("[StartSession] Auto-refresh succeeded on attempt %d (found %d valid words)", attempt+1, len(validWords))
			}
			break
		}

		// No valid words found - exclude these kanji and retry
		log.Printf("[StartSession] Attempt %d: Found 0 valid words, auto-refreshing kanji...", attempt+1)
		for _, k := range kanji {
			excludeIDs = append(excludeIDs, k.ID)
		}

		if attempt == maxRetries-1 {
			// Last attempt failed - return error
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":       "Could not find kanji that form valid words after multiple attempts",
				"details":     fmt.Sprintf("Tried %d times but no valid words found", maxRetries),
				"attempts":    attempt + 1,
				"max_retries": maxRetries,
				"retry_type":  "valid_words",
			})
		}
	}

	// Create session in learning_activities
	dbStartTime := time.Now()
	kanjiIDs := make([]int64, 0, len(kanji))
	for _, k := range kanji {
		kanjiIDs = append(kanjiIDs, k.ID)
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
	// If kanji is empty but we have valid words, extract kanji IDs from valid words
	if len(kanji) == 0 && len(validWords) > 0 {
		kanjiIDSet := make(map[int64]bool)
		for _, word := range validWords {
			for _, kanjiID := range word.KanjiIDs {
				kanjiIDSet[kanjiID] = true
			}
		}
		kanjiIDsFromWords := make([]int64, 0, len(kanjiIDSet))
		for id := range kanjiIDSet {
			kanjiIDsFromWords = append(kanjiIDsFromWords, id)
		}
		var err error
		kanji, err = h.getKanjiDetails(kanjiIDsFromWords)
		if err != nil {
			log.Printf("[StartSession] Failed to fetch kanji details from valid words: %v", err)
		}
	}

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

	// Get 6 new kanji with auto-refresh if no valid words found
	// Retry up to MaxRetriesKanjiSelection times to find kanji that form valid words
	maxRetries := MaxRetriesKanjiSelection
	var newKanji []KanjiData
	var validWords []ValidWord
	var kanjiDuration time.Duration
	var wordsDuration time.Duration
	excludeIDs := make([]int64, len(req.UsedKanjiIDs))
	copy(excludeIDs, req.UsedKanjiIDs)

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Get kanji (excluding previously tried sets)
		kanjiAttemptStart := time.Now()
		newKanji, err = h.getSimpleKanji(req.JLPTLevel, 6, excludeIDs)
		kanjiDuration = time.Since(kanjiAttemptStart)
		if err != nil {
			if attempt == maxRetries-1 {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":       "Failed to get new kanji after multiple attempts",
					"details":     err.Error(),
					"attempts":    attempt + 1,
					"max_retries": maxRetries,
					"retry_type":  "kanji_selection",
					"debug": map[string]interface{}{
						"jlpt_level":     req.JLPTLevel,
						"used_kanji_ids": req.UsedKanjiIDs,
					},
				})
			}
			log.Printf("[RefreshKanji] Attempt %d: Failed to get kanji: %v, retrying...", attempt+1, err)
			continue
		}

		// Pre-compute valid words from new kanji
		wordsStartTime := time.Now()
		validWords, err = h.ComputeValidWords(newKanji)
		wordsDuration = time.Since(wordsStartTime)
		if err != nil {
			if attempt == maxRetries-1 {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error":       "Failed to compute valid words after multiple attempts",
					"details":     err.Error(),
					"attempts":    attempt + 1,
					"max_retries": maxRetries,
					"retry_type":  "word_computation",
				})
			}
			log.Printf("[RefreshKanji] Attempt %d: Failed to compute valid words: %v, retrying...", attempt+1, err)
			for _, k := range newKanji {
				excludeIDs = append(excludeIDs, k.ID)
			}
			continue
		}

		// If we found valid words, break out of retry loop
		if len(validWords) > 0 {
			if attempt > 0 {
				log.Printf("[RefreshKanji] Auto-refresh succeeded on attempt %d (found %d valid words)", attempt+1, len(validWords))
			}
			break
		}

		log.Printf("[RefreshKanji] Attempt %d: Found 0 valid words, auto-refreshing kanji...", attempt+1)
		for _, k := range newKanji {
			excludeIDs = append(excludeIDs, k.ID)
		}

		if attempt == maxRetries-1 {
			// Last attempt failed - return error
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":       "Could not find kanji that form valid words after multiple attempts",
				"details":     fmt.Sprintf("Tried %d times but no valid words found", maxRetries),
				"attempts":    attempt + 1,
				"max_retries": maxRetries,
				"retry_type":  "valid_words",
			})
		}
	}

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
			if len(activity.ItemIDs) > 0 {
				existingItemIDs = []int64(activity.ItemIDs)
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
