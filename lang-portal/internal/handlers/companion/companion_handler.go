package companion

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CompanionHandler handles companion study operations
type CompanionHandler struct {
	db *gorm.DB
}

// NewCompanionHandler creates a new instance of CompanionHandler
func NewCompanionHandler(db *gorm.DB) *CompanionHandler {
	return &CompanionHandler{db: db}
}

// SaveCompanionStudySession saves a companion study session to the database
func (h *CompanionHandler) SaveCompanionStudySession(c *fiber.Ctx) error {
	var input struct {
		SessionID           string `json:"session_id"`
		AssistantID         string `json:"assistant_id"`
		UserTranscript      string `json:"user_transcript"`
		AssistantTranscript string `json:"assistant_transcript"`
		DurationSeconds     int    `json:"duration_seconds"`
		StartedAt           string `json:"started_at"`
		EndedAt             string `json:"ended_at"`
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
		"session_id":           input.SessionID,
		"assistant_id":         input.AssistantID,
		"user_transcript":      input.UserTranscript,
		"assistant_transcript": input.AssistantTranscript,
		"duration_seconds":     input.DurationSeconds,
		"started_at":           input.StartedAt,
		"ended_at":             input.EndedAt,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal payload",
		})
	}

	// Parse timestamps
	var startedAt, endedAt time.Time
	if input.StartedAt != "" {
		startedAt, _ = time.Parse(time.RFC3339, input.StartedAt)
	} else {
		startedAt = time.Now()
	}
	if input.EndedAt != "" {
		endedAt, _ = time.Parse(time.RFC3339, input.EndedAt)
	} else {
		endedAt = time.Now()
	}

	// Calculate duration in minutes
	durationMinutes := int(endedAt.Sub(startedAt).Minutes())

	// Insert session into enhanced_study_sessions
	// Use "speech" as session_type as per plan (companion is voice-based like speech)
	var sessionID int64
	err = h.db.Raw(`
		INSERT INTO enhanced_study_sessions 
		(user_id, session_type, notes, started_at, ended_at, duration_minutes, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, NOW())
		RETURNING id
	`, userID, "speech", string(payloadJSON), startedAt, endedAt, durationMinutes).Scan(&sessionID).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create companion study session: %v", err),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         sessionID,
		"session_id": input.SessionID,
		"success":    true,
	})
}

// getUserID gets user ID from context - requires authentication
func (h *CompanionHandler) getUserID(c *fiber.Ctx) (int64, error) {
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
