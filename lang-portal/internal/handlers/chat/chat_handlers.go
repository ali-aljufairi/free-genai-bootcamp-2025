package chat

import (
	"fmt"
	"lang-portal/internal/database/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ChatHandler handles chat session operations
type ChatHandler struct {
	db *gorm.DB
}

// NewChatHandler creates a new chat handler
func NewChatHandler(db *gorm.DB) *ChatHandler {
	return &ChatHandler{db: db}
}

// SaveChatSessionRequest represents the request body for saving a chat session
type SaveChatSessionRequest struct {
	SessionID   string                   `json:"session_id" validate:"required"`
	Messages    []map[string]interface{} `json:"messages" validate:"required"`
	ModelUsed   string                   `json:"model_used" validate:"required"`
	PromptUsed  string                   `json:"prompt_used" validate:"required"`
}

// SaveSkillAssessmentRequest represents the request body for saving a skill assessment
type SaveSkillAssessmentRequest struct {
	SkillSummary map[string]interface{} `json:"skill_summary" validate:"required"`
}

// getUserID gets user ID from context - requires authentication
func (h *ChatHandler) getUserID(c *fiber.Ctx) (int64, error) {
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return 0, fmt.Errorf("user not authenticated")
	}
	
	userID, ok := userIDInterface.(int64)
	if !ok || userID == 0 {
		return 0, fmt.Errorf("invalid user ID in context")
	}
	
	return userID, nil
}

// SaveChatSession saves a chat session with messages
func (h *ChatHandler) SaveChatSession(c *fiber.Ctx) error {
	var req SaveChatSessionRequest
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

	// Check if session already exists
	var existingSession models.ChatSession
	result := h.db.Where("session_id = ? AND user_id = ?", req.SessionID, userID).First(&existingSession)

	if result.Error == nil {
		// Update existing session
		existingSession.Messages = models.JSONB{Data: req.Messages}
		existingSession.ModelUsed = req.ModelUsed
		existingSession.PromptUsed = req.PromptUsed
		existingSession.UpdatedAt = time.Now()

		if err := h.db.Save(&existingSession).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update chat session",
			})
		}

		return c.JSON(fiber.Map{
			"id":         existingSession.ID,
			"session_id": existingSession.SessionID,
			"updated":    true,
		})
	}

	// Create new session
	session := models.ChatSession{
		UserID:     userID,
		SessionID:  req.SessionID,
		Messages:   models.JSONB{Data: req.Messages},
		ModelUsed:  req.ModelUsed,
		PromptUsed: req.PromptUsed,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := h.db.Create(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create chat session",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         session.ID,
		"session_id": session.SessionID,
		"created":    true,
	})
}

// GetChatHistory retrieves user's chat session history
func (h *ChatHandler) GetChatHistory(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	var sessions []models.ChatSession
	if err := h.db.Where("user_id = ?", userID).
		Order("started_at DESC").
		Limit(50). // Limit to last 50 sessions
		Find(&sessions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve chat history",
		})
	}

	return c.JSON(sessions)
}

// SaveSkillAssessment saves or updates the skill assessment for a chat session
func (h *ChatHandler) SaveSkillAssessment(c *fiber.Ctx) error {
	sessionID := c.Params("id")
	if sessionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Session ID is required",
		})
	}

	var req SaveSkillAssessmentRequest
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

	// Find the session
	var session models.ChatSession
	if err := h.db.Where("session_id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Chat session not found",
		})
	}

	// Update skill summary
	session.SkillSummary = &models.JSONB{Data: req.SkillSummary}
	session.UpdatedAt = time.Now()

	if err := h.db.Save(&session).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update skill assessment",
		})
	}

	return c.JSON(fiber.Map{
		"id":            session.ID,
		"session_id":    session.SessionID,
		"skill_summary": session.SkillSummary,
	})
}

