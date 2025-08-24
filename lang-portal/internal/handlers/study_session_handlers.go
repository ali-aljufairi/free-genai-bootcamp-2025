package handlers

import (
	"fmt"
	"lang-portal/internal/database"
	"lang-portal/internal/database/models"
	"math/rand"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// StudySessionHandler contains all study session related handlers
type StudySessionHandler struct {
	db *database.DB
}

// DB returns the database instance
func (h *StudySessionHandler) DB() *database.DB {
	return h.db
}

// NewStudySessionHandler creates a new instance of StudySessionHandler
func NewStudySessionHandler(db *database.DB) *StudySessionHandler {
	return &StudySessionHandler{db: db}
}

// CreateStudySession creates a new study session
func (h *StudySessionHandler) CreateStudySession(c *fiber.Ctx) error {
	var input struct {
		GroupID     int64  `json:"group_id"`
		Type        string `json:"type"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Create the activity first
	activity := models.StudyActivity{
		Type:        models.ActivityType(input.Type),
		Name:        input.Name,
		Description: input.Description,
		GroupID:     input.GroupID,
		CreatedAt:   time.Now(),
	}

	result := h.db.GetDB().Create(&activity)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create study activity"})
	}

	// Create the study session linked to the activity
	session := models.StudySession{
		GroupID:         input.GroupID,
		StudyActivityID: activity.ID,
		CreatedAt:       time.Now(),
	}

	result = h.db.GetDB().Create(&session)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create study session"})
	}

	// Update the activity with the session ID
	activity.StudySessionID = session.ID
	result = h.db.GetDB().Save(&activity)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update study activity with session ID"})
	}

	// Return both the session and activity information
	return c.JSON(fiber.Map{
		"id":          session.ID,
		"group_id":    session.GroupID,
		"created_at":  session.CreatedAt,
		"activity_id": activity.ID,
		"type":        activity.Type,
		"name":        activity.Name,
		"description": activity.Description,
	})
}

// GetStudySessionWords handles retrieving words for a specific study session
func (h *StudySessionHandler) GetStudySessionWords(c *fiber.Ctx) error {
	sessionID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	words, err := h.db.GetStudySessionWords(sessionID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get study session words",
		})
	}

	return c.JSON(fiber.Map{
		"items": words,
	})
}

// GetStudySessions handles retrieving all study sessions
func (h *StudySessionHandler) GetStudySessions(c *fiber.Ctx) error {
	sessions, err := h.db.GetStudySessions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get study sessions",
		})
	}

	return c.JSON(fiber.Map{
		"items": sessions,
	})
}

// GetStudySession handles retrieving a specific study session
func (h *StudySessionHandler) GetStudySession(c *fiber.Ctx) error {
	sessionID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	session, err := h.db.GetStudySession(sessionID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get study session",
		})
	}

	return c.JSON(session)
}

// ReviewWord handles recording a word review in a study session
func (h *StudySessionHandler) ReviewWord(c *fiber.Ctx) error {
	sessionID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session ID",
		})
	}

	wordID, err := strconv.ParseInt(c.Params("word_id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid word ID",
		})
	}

	type ReviewRequest struct {
		Correct bool `json:"correct"`
	}

	var req ReviewRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid request body: %v", err),
		})
	}

	err = h.db.CreateWordReview(sessionID, wordID, req.Correct)
	if err != nil {
		fmt.Printf("Error creating word review: %v\n", err) // Add logging
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create word review: %v", err),
		})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"word_id":          wordID,
		"study_session_id": sessionID,
		"correct":          req.Correct,
		"created_at":       time.Now(),
	})
}

// CreateFlashcardQuiz generates a flashcard with 4 options where one is correct
func (h *StudySessionHandler) CreateFlashcardQuiz(c *fiber.Ctx) error {
	// Parse limit parameter - if not specified or invalid, get all words
	var limit int
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Get words for target flashcards
	var targetWords []models.Word
	query := h.db.GetDB().Order("RANDOM()")
	if limit > 0 {
		query = query.Limit(limit)
	}
	result := query.Find(&targetWords)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve words for flashcards",
		})
	}

	if len(targetWords) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No words found in the database",
		})
	}

	// Get a pool of words to use for wrong answers
	var wordPool []models.Word
	result = h.db.GetDB().Order("RANDOM()").Limit(limit * 10).Find(&wordPool)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve word pool for options",
		})
	}

	// Create flashcards with options
	flashcards := make([]map[string]interface{}, 0, limit)

	for _, targetWord := range targetWords {
		// Get 3 random incorrect options that are different from the target word
		wrongOptions := make([]map[string]interface{}, 0, 3)
		for _, word := range wordPool {
			if word.ID != targetWord.ID && len(wrongOptions) < 3 {
				japanese := word.Kana
				if word.Kanji != nil {
					japanese = *word.Kanji
				}
				wrongOptions = append(wrongOptions, map[string]interface{}{
					"id":       word.ID,
					"japanese": japanese,
					"romaji":   word.Romaji,
					"english":  word.English,
					"correct":  false,
				})
			}
		}

		// If we couldn't get enough wrong options, continue
		if len(wrongOptions) < 3 {
			continue
		}

		// Create the correct option
		japanese := targetWord.Kana
		if targetWord.Kanji != nil {
			japanese = *targetWord.Kanji
		}
		correctOption := map[string]interface{}{
			"id":       targetWord.ID,
			"japanese": japanese,
			"romaji":   targetWord.Romaji,
			"english":  targetWord.English,
			"correct":  true,
		}

		// Combine all options and shuffle them
		allOptions := append(wrongOptions, correctOption)
		rand.Shuffle(len(allOptions), func(i, j int) {
			allOptions[i], allOptions[j] = allOptions[j], allOptions[i]
		})

		// Create the flashcard
		flashcard := map[string]interface{}{
			"word": map[string]interface{}{
				"id":       targetWord.ID,
				"japanese": japanese, // reuse the japanese variable from above
				"romaji":   targetWord.Romaji,
				"english":  targetWord.English,
			},
			"options": allOptions,
		}

		flashcards = append(flashcards, flashcard)
	}

	if len(flashcards) == 0 {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate flashcards",
		})
	}

	return c.JSON(fiber.Map{
		"flashcards": flashcards,
		"count":      len(flashcards),
	})
}

// ResetHistory handles resetting study history
func (h *StudySessionHandler) ResetHistory(c *fiber.Ctx) error {
	err := h.db.ResetStudyHistory()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to reset study history",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Study history has been reset",
	})
}

// FullReset handles resetting the entire system
func (h *StudySessionHandler) FullReset(c *fiber.Ctx) error {
	err := h.db.FullReset()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to perform full reset",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "System has been fully reset",
	})
}

// StudyProgress handles retrieving study progress statistics
func (h *StudySessionHandler) StudyProgress(c *fiber.Ctx) error {
	// Get total words studied from word_review_items
	totalWordsStudied, err := h.db.GetTotalWordsStudied()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get total words studied",
		})
	}

	// Get total available words from words table
	totalAvailableWords, err := h.db.GetTotalAvailableWords()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get total available words",
		})
	}

	return c.JSON(fiber.Map{
		"total_words_studied":   totalWordsStudied,
		"total_available_words": totalAvailableWords,
	})
}
