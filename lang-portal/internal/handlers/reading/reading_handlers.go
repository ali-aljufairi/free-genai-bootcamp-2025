package reading

import (
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ReadingHandler handles reading quiz operations
type ReadingHandler struct {
	db *gorm.DB
}

func NewReadingHandler(db *gorm.DB) *ReadingHandler {
	return &ReadingHandler{db: db}
}

// StartReadingQuiz starts a new reading quiz session
func (h *ReadingHandler) StartReadingQuiz(c *fiber.Ctx) error {
	var config ReadingQuizConfig
	if err := c.BodyParser(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid reading quiz configuration",
		})
	}

	// Validate reading quiz configuration
	if err := h.validateReadingConfig(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Get user ID from context - requires authentication
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Generate a deterministic seed and use it for option shuffling
	seed := time.Now().UnixNano()
	rand.Seed(seed)

	// Generate reading questions based on configuration
	questions, err := h.generateReadingQuestions(userID, &config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate reading questions",
		})
	}

	// Shuffle options if requested
	if config.ShuffleOptions {
		for i := range questions {
			questions[i].Answers, questions[i].CorrectIndex = shuffleReadingOptions(
				questions[i].Answers,
				questions[i].CorrectIndex,
			)
		}
	}

	// Create reading quiz session
	session := ReadingQuizSession{
		UserID:    userID,
		Config:    config,
		Questions: questions,
		StartedAt: time.Now(),
		Total:     len(questions),
	}

	// Store session in database (same as flashcards)
	sessionID, err := h.createReadingSession(&session, seed)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create reading quiz session: %v", err),
		})
	}

	session.ID = sessionID

	return c.Status(fiber.StatusCreated).JSON(session)
}

// SubmitReadingQuiz submits reading quiz answers and calculates results
func (h *ReadingHandler) SubmitReadingQuiz(c *fiber.Ctx) error {
	var submission ReadingSubmission
	if err := c.BodyParser(&submission); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid reading quiz submission",
		})
	}

	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user ID",
		})
	}

	// Get reading quiz session
	session, err := h.getReadingSession(submission.SessionID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Reading quiz session not found",
		})
	}

	// Calculate results
	result, err := h.calculateReadingResults(session, &submission)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate reading quiz results",
		})
	}

	// Update SRS progress (simple, same as flashcards)
	err = h.updateReadingSRSProgress(userID, result)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update progress",
		})
	}

	// End reading quiz session
	err = h.endReadingSession(submission.SessionID, result)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to end reading quiz session",
		})
	}

	return c.JSON(result)
}

// GetReadingQuizHistory gets user's reading quiz history
func (h *ReadingHandler) GetReadingQuizHistory(c *fiber.Ctx) error {
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

	// Get reading quiz history from database
	sessions, total, err := h.getReadingHistory(userID, pageSize, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get reading quiz history",
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

// calculateReadingResults calculates reading quiz results
func (h *ReadingHandler) calculateReadingResults(session *ReadingQuizSession, submission *ReadingSubmission) (*ReadingResult, error) {
	correctCount := 0
	var results []QuestionResult

	// Calculate duration
	duration := int(time.Since(session.StartedAt).Seconds())

	for _, answer := range submission.Answers {
		// Match by ephemeral ID (position-based: 1, 2, 3...)
		// Ephemeral IDs are assigned as index + 1, so answer.QuestionID should match the position
		questionIndex := int(answer.QuestionID) - 1
		if questionIndex < 0 || questionIndex >= len(session.Questions) {
			continue
		}

		question := session.Questions[questionIndex]

		isCorrect := answer.Answer == question.CorrectIndex
		if isCorrect {
			correctCount++
		}

		results = append(results, QuestionResult{
			QuestionID:   answer.QuestionID,
			ItemID:       question.ID, // ID from jlpt_reading_questions table
			ItemType:     "reading",
			UserAnswer:   answer.Answer,
			CorrectIndex: question.CorrectIndex,
			IsCorrect:    isCorrect,
		})
	}

	percentage := float64(correctCount) / float64(len(results)) * 100
	if len(results) == 0 {
		percentage = 0
	}

	return &ReadingResult{
		SessionID:    submission.SessionID,
		Score:        correctCount,
		Total:        len(results),
		Percentage:   percentage,
		CorrectCount: correctCount,
		WrongCount:   len(results) - correctCount,
		Duration:     duration,
		Results:      results,
	}, nil
}
