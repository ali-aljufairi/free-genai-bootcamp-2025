package word_builder

import (
	"encoding/json"
	"fmt"
	"lang-portal/internal/repositories"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// wordBuilderLogger writes to a dedicated log file for Word Builder debugging
var wordBuilderLogger *log.Logger

func init() {
	// Create or open log file
	logFile, err := os.OpenFile("word_builder_debug.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		// Fallback to stderr if file can't be opened
		wordBuilderLogger = log.New(os.Stderr, "[WORD_BUILDER] ", log.LstdFlags|log.Lmicroseconds)
		wordBuilderLogger.Printf("Warning: Could not open log file, using stderr: %v", err)
	} else {
		wordBuilderLogger = log.New(logFile, "[WORD_BUILDER] ", log.LstdFlags|log.Lmicroseconds)
	}
}

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

	// Get 6 smart kanji (that can form words together via chain traversal)
	wordBuilderLogger.Printf("StartSession: Requesting kanji for JLPT level %d", req.JLPTLevel)
	kanji, err := h.getSmartKanji(req.JLPTLevel, 6, nil)
	if err != nil {
		wordBuilderLogger.Printf("StartSession: Failed to get kanji: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get kanji",
			"details": err.Error(),
			"debug": map[string]interface{}{
				"jlpt_level": req.JLPTLevel,
			},
		})
	}

	wordBuilderLogger.Printf("StartSession: Got %d kanji: %v", len(kanji), func() []string {
		chars := make([]string, len(kanji))
		for i, k := range kanji {
			chars[i] = fmt.Sprintf("%s(id:%d)", k.Character, k.ID)
		}
		return chars
	}())

	// Pre-compute all valid words
	wordBuilderLogger.Printf("StartSession: Computing valid words for %d kanji", len(kanji))
	validWords, err := h.ComputeValidWords(kanji)
	if err != nil {
		wordBuilderLogger.Printf("StartSession: Failed to compute valid words: %v", err)
	} else {
		wordBuilderLogger.Printf("StartSession: Found %d valid words", len(validWords))
		if len(validWords) > 0 {
			wordBuilderLogger.Printf("StartSession: Sample words: %v", func() []string {
				words := make([]string, 0, 5)
				max := 5
				if len(validWords) < max {
					max = len(validWords)
				}
				for i := 0; i < max; i++ {
					words = append(words, validWords[i].Kanji)
				}
				return words
			}())
		} else {
			wordBuilderLogger.Printf("StartSession: WARNING - No valid words found for kanji: %v", func() []int64 {
				ids := make([]int64, len(kanji))
				for i, k := range kanji {
					ids[i] = k.ID
				}
				return ids
			}())
		}
	}
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

	if err != nil {
		// Log the actual error for debugging
		fmt.Printf("Failed to create learning_activity: %v\n", err)
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

	return c.JSON(response)
}

// RefreshKanji refreshes the kanji pool
func (h *WordBuilderHandler) RefreshKanji(c *fiber.Ctx) error {
	var req RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		fmt.Printf("RefreshKanji: Failed to parse request body: %v\n", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	fmt.Printf("RefreshKanji: Request received - session_id=%d, used_kanji_ids=%v\n", req.SessionID, req.UsedKanjiIDs)

	userID, err := h.getUserID(c)
	if err != nil {
		fmt.Printf("RefreshKanji: Failed to get user ID: %v\n", err)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	fmt.Printf("RefreshKanji: User ID extracted: %d\n", userID)

	// Validate JLPT level from request (no need to lookup session!)
	if req.JLPTLevel < 1 || req.JLPTLevel > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "JLPT level must be between 1 and 5",
		})
	}

	// Get 6 new smart kanji, excluding used ones - use JLPT level from request directly
	newKanji, err := h.getSmartKanji(req.JLPTLevel, 6, req.UsedKanjiIDs)
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
	validWords, err := h.ComputeValidWords(newKanji)
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
