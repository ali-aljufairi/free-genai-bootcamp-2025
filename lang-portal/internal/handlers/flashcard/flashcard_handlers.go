package flashcard

import (
	"math/rand"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// FlashcardHandler handles flashcard operations
type FlashcardHandler struct {
	db *gorm.DB
}

func NewFlashcardHandler(db *gorm.DB) *FlashcardHandler {
	return &FlashcardHandler{db: db}
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
		requiredCorrectCount := 3 // Default
		if session.Config.RequiredCorrectCount != nil {
			requiredCorrectCount = *session.Config.RequiredCorrectCount
		}
		err = h.checkUnitCompletion(userID, *session.Config.UnitID, requiredCorrectCount)
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