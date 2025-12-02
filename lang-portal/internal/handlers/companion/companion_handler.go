package companion

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ClerkUser represents user data from Clerk API
type ClerkUser struct {
	ID             string                 `json:"id"`
	PublicMetadata map[string]interface{} `json:"public_metadata"`
}

// CompanionHandler handles companion study operations
type CompanionHandler struct {
	db        *gorm.DB
	secretKey string
}

// NewCompanionHandler creates a new instance of CompanionHandler
func NewCompanionHandler(db *gorm.DB) (*CompanionHandler, error) {
	secretKey := os.Getenv("CLERK_SECRET_KEY")
	// Return handler even without secret key for development
	return &CompanionHandler{
		db:        db,
		secretKey: secretKey,
	}, nil
}

// fetchClerkUser fetches user data from Clerk API
func (h *CompanionHandler) fetchClerkUser(userID string) (*ClerkUser, error) {
	if h.secretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY not configured")
	}

	url := fmt.Sprintf("https://api.clerk.com/v1/users/%s", userID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+h.secretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clerk API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var user ClerkUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &user, nil
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
	if h.secretKey != "" {
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
	clerkUserID, ok := c.Locals("clerk_user_id").(string)
	if !ok || clerkUserID == "" || h.secretKey == "" {
		// If no Clerk secret key or user ID, allow (for development)
		return true, nil
	}

	// Fetch user from Clerk to check subscription
	user, err := h.fetchClerkUser(clerkUserID)
	if err != nil {
		return false, fmt.Errorf("failed to fetch user: %w", err)
	}

	// Check if user has Pro plan (unlimited access)
	hasProPlan := false
	if user.PublicMetadata != nil {
		if plan, ok := user.PublicMetadata["subscription_plan"].(string); ok {
			hasProPlan = plan == "pro"
		}
	}

	// If Pro plan, allow unlimited
	if hasProPlan {
		return true, nil
	}

	// For Basic plan, check usage count
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
