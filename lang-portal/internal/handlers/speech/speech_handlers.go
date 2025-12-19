package speech

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// SpeechHandler handles speech study operations
type SpeechHandler struct {
	db *gorm.DB
}

// NewSpeechHandler creates a new instance of SpeechHandler
func NewSpeechHandler(db *gorm.DB) *SpeechHandler {
	return &SpeechHandler{db: db}
}

// SaveSpeechStudySession saves a speech study session to the database
func (h *SpeechHandler) SaveSpeechStudySession(c *fiber.Ctx) error {
	var input struct {
		SessionID                string `json:"session_id"`
		Transcription            string `json:"transcription"`
		Analysis                 string `json:"analysis"`
		ImageURL                 string `json:"image_url"`
		RecordingDurationSeconds int    `json:"recording_duration_seconds"`
		ModelUsed                string `json:"model_used"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get user ID from context (set by auth middleware)
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Create payload with session data
	payload := map[string]interface{}{
		"transcription":              input.Transcription,
		"analysis":                   input.Analysis,
		"image_url":                  input.ImageURL,
		"recording_duration_seconds": input.RecordingDurationSeconds,
		"model_used":                 input.ModelUsed,
		"session_id":                 input.SessionID,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal payload",
		})
	}

	// Insert session into enhanced_study_sessions
	// Use "mixed" as session_type since speech study is a mixed activity
	var sessionID int64
	err = h.db.Raw(`
		INSERT INTO enhanced_study_sessions 
		(user_id, session_type, notes, created_at, started_at, ended_at) 
		VALUES (?, ?, ?, NOW(), NOW(), NOW())
		RETURNING id
	`, userID, "mixed", string(payloadJSON)).Scan(&sessionID).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create speech study session: %v", err),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         sessionID,
		"session_id": input.SessionID,
		"success":    true,
	})
}

// getUserID gets user ID from context - requires authentication
func (h *SpeechHandler) getUserID(c *fiber.Ctx) (int64, error) {
	// Get user ID from context (set by auth middleware)
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



















