package grammar

import (
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// GrammarHandler handles grammar quiz operations
type GrammarHandler struct {
	db *gorm.DB
}

func NewGrammarHandler(db *gorm.DB) *GrammarHandler {
	return &GrammarHandler{db: db}
}

// StartGrammarQuiz starts a new grammar quiz session
func (h *GrammarHandler) StartGrammarQuiz(c *fiber.Ctx) error {
	var config GrammarQuizConfig
	if err := c.BodyParser(&config); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid grammar quiz configuration",
		})
	}

	// Validate grammar quiz configuration
	if err := h.validateGrammarConfig(&config); err != nil {
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

	// Generate grammar questions based on configuration
	questions, err := h.generateGrammarQuestions(userID, &config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate grammar questions",
		})
	}

	// Shuffle options if requested
	if config.ShuffleOptions {
		for i := range questions {
			questions[i].Answers, questions[i].CorrectIndex = shuffleGrammarOptions(
				questions[i].Answers,
				questions[i].CorrectIndex,
			)
		}
	}

	// Create grammar quiz session
	session := GrammarQuizSession{
		UserID:    userID,
		Config:    config,
		Questions: questions,
		StartedAt: time.Now(),
		Total:     len(questions),
	}

	// Store session in database (same as flashcards)
	sessionID, err := h.createGrammarSession(&session, seed)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create grammar quiz session: %v", err),
		})
	}

	session.ID = sessionID

	return c.Status(fiber.StatusCreated).JSON(session)
}

// SubmitGrammarQuiz submits grammar quiz answers and calculates results
func (h *GrammarHandler) SubmitGrammarQuiz(c *fiber.Ctx) error {
	var submission GrammarSubmission
	if err := c.BodyParser(&submission); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid grammar quiz submission",
		})
	}

	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user ID",
		})
	}

	// Get grammar quiz session
	session, err := h.getGrammarSession(submission.SessionID, userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Grammar quiz session not found",
		})
	}

	// Calculate results
	result, err := h.calculateGrammarResults(session, &submission)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to calculate grammar quiz results",
		})
	}

	// Update SRS progress (simple, same as flashcards)
	err = h.updateGrammarSRSProgress(userID, result)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update progress",
		})
	}

	// End grammar quiz session
	err = h.endGrammarSession(submission.SessionID, result)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to end grammar quiz session",
		})
	}

	return c.JSON(result)
}

// GetGrammarQuizHistory gets user's grammar quiz history
func (h *GrammarHandler) GetGrammarQuizHistory(c *fiber.Ctx) error {
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

	// Get grammar quiz history from database
	sessions, total, err := h.getGrammarHistory(userID, pageSize, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get grammar quiz history",
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

// calculateGrammarResults calculates grammar quiz results
func (h *GrammarHandler) calculateGrammarResults(session *GrammarQuizSession, submission *GrammarSubmission) (*GrammarResult, error) {
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
			ItemID:       question.ID, // ID from jlpt_grammar_questions table
			ItemType:     "grammar",
			UserAnswer:   answer.Answer,
			CorrectIndex: question.CorrectIndex,
			IsCorrect:    isCorrect,
		})
	}

	percentage := float64(correctCount) / float64(len(results)) * 100
	if len(results) == 0 {
		percentage = 0
	}

	return &GrammarResult{
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

