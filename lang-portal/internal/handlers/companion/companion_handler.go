package companion

import (
	"encoding/json"
	"fmt"
	"lang-portal/internal/services"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CompanionHandler handles companion study operations
type CompanionHandler struct {
	db                  *gorm.DB
	subscriptionService *services.SubscriptionService
}

// NewCompanionHandler creates a new instance of CompanionHandler
func NewCompanionHandler(db *gorm.DB) (*CompanionHandler, error) {
	// Initialize subscription service (may fail in dev, but that's OK)
	subscriptionService, err := services.NewSubscriptionService()
	if err != nil {
		// In development, allow handler to be created without subscription service
		// The checkCompanionStudyLimit will handle this gracefully
		fmt.Printf("Warning: Failed to initialize subscription service: %v (continuing without it)\n", err)
		return &CompanionHandler{
			db:                  db,
			subscriptionService: nil,
		}, nil
	}

	return &CompanionHandler{
		db:                  db,
		subscriptionService: subscriptionService,
	}, nil
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

	// Check subscription limit before saving
	if h.subscriptionService != nil {
		canStart, err := h.checkCompanionStudyLimit(c, userID)
		if err != nil {
			// Log error but don't block in case of Clerk API issues
			fmt.Printf("Warning: Failed to check subscription limit: %v\n", err)
		} else if !canStart {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":   "Companion study session limit reached",
				"code":    "LIMIT_REACHED",
				"message": "You have reached your monthly limit of 10 companion study sessions. Please upgrade to Pro for unlimited access.",
			})
		}
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

	// Increment usage counter after successful save
	if err := h.incrementUsage(userID); err != nil {
		// Log error but don't fail the request since session is already saved
		fmt.Printf("Warning: Failed to increment usage counter: %v\n", err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":         sessionID,
		"session_id": input.SessionID,
		"success":    true,
	})
}

// checkCompanionStudyLimit checks if user can start a companion study session
func (h *CompanionHandler) checkCompanionStudyLimit(c *fiber.Ctx, userID int64) (bool, error) {
	// If subscription service is not initialized, allow (for development)
	if h.subscriptionService == nil {
		return true, nil
	}

	clerkUserID, ok := c.Locals("clerk_user_id").(string)
	if !ok || clerkUserID == "" {
		// If no Clerk user ID, allow (for development)
		return true, nil
	}

	// Get subscription plan using the service (with caching)
	ctx := c.Context()
	plan, hasActive, err := h.subscriptionService.GetSubscriptionPlan(ctx, clerkUserID)
	if err != nil {
		// On error, log but allow access (graceful degradation)
		fmt.Printf("Warning: Failed to check subscription: %v (allowing access)\n", err)
		// Continue to check usage limits as fallback
		plan = "none"
		hasActive = false
	}

	// If Pro or Free plan, allow unlimited (both have same privileges)
	if hasActive && (plan == "pro" || plan == "free") {
		return true, nil
	}

	// For Basic plan or no plan, check usage count
	currentMonth := time.Now().Format("2006-01")
	var usage struct {
		SessionCount int `gorm:"column:session_count"`
	}

	err = h.db.Table("companion_study_usage").
		Where("user_id = ? AND month_year = ?", userID, currentMonth).
		First(&usage).Error

	sessionCount := 0
	if err == nil {
		sessionCount = usage.SessionCount
	}

	// Basic plan limit is 10 sessions per month
	limit := 10
	return sessionCount < limit, nil
}

// incrementUsage increments the usage counter for the current month
func (h *CompanionHandler) incrementUsage(userID int64) error {
	currentMonth := time.Now().Format("2006-01")

	// Use upsert to create or update usage record
	err := h.db.Exec(`
		INSERT INTO companion_study_usage (user_id, month_year, session_count, updated_at)
		VALUES (?, ?, 1, NOW())
		ON CONFLICT (user_id, month_year)
		DO UPDATE SET 
			session_count = companion_study_usage.session_count + 1,
			updated_at = NOW()
	`, userID, currentMonth).Error

	return err
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
