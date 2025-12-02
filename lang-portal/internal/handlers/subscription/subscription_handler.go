package subscription

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

// SubscriptionHandler handles subscription-related operations
type SubscriptionHandler struct {
	db        *gorm.DB
	secretKey string
}

// NewSubscriptionHandler creates a new instance of SubscriptionHandler
func NewSubscriptionHandler(db *gorm.DB) (*SubscriptionHandler, error) {
	secretKey := os.Getenv("CLERK_SECRET_KEY")
	if secretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY environment variable not set")
	}

	return &SubscriptionHandler{
		db:        db,
		secretKey: secretKey,
	}, nil
}

// fetchClerkUser fetches user data from Clerk API
func (h *SubscriptionHandler) fetchClerkUser(userID string) (*ClerkUser, error) {
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

// CheckCompanionStudyLimit checks if user can start a companion study session
func (h *SubscriptionHandler) CheckCompanionStudyLimit(c *fiber.Ctx) error {
	// Get Clerk user ID from context
	clerkUserID, ok := c.Locals("clerk_user_id").(string)
	if !ok || clerkUserID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Get internal user ID
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Fetch user from Clerk to check subscription
	user, err := h.fetchClerkUser(clerkUserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch user subscription",
		})
	}

	// Check if user has Pro plan (unlimited access)
	hasProPlan := false
	if user.PublicMetadata != nil {
		if plan, ok := user.PublicMetadata["subscription_plan"].(string); ok {
			hasProPlan = plan == "pro"
		}
	}

	// Also check Clerk's subscription data if available
	// Note: Clerk Billing stores subscription info differently, we need to check the actual subscription
	// For now, we'll use a helper to check if user has the "pro" plan via Clerk's has() method
	// Since we're in Go backend, we'll check the subscription items directly

	// If Pro plan, allow unlimited
	if hasProPlan {
		return c.JSON(fiber.Map{
			"can_start": true,
			"reason":    "unlimited",
			"plan":      "pro",
		})
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
	canStart := sessionCount < limit

	return c.JSON(fiber.Map{
		"can_start":     canStart,
		"reason":        "usage_limit",
		"plan":          "basic",
		"session_count": sessionCount,
		"limit":         limit,
		"remaining":     limit - sessionCount,
	})
}

// GetUsageCount returns the current month's usage count
func (h *SubscriptionHandler) GetUsageCount(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	currentMonth := time.Now().Format("2006-01")
	var usage struct {
		SessionCount int       `gorm:"column:session_count"`
		MonthYear    string    `gorm:"column:month_year"`
		ResetAt      time.Time `gorm:"column:reset_at"`
	}

	err = h.db.Table("companion_study_usage").
		Where("user_id = ? AND month_year = ?", userID, currentMonth).
		First(&usage).Error

	sessionCount := 0
	if err == nil {
		sessionCount = usage.SessionCount
	}

	// Get user's plan from Clerk
	clerkUserID, _ := c.Locals("clerk_user_id").(string)
	plan := "none"
	limit := 0

	if clerkUserID != "" {
		user, err := h.fetchClerkUser(clerkUserID)
		if err == nil && user.PublicMetadata != nil {
			if planStr, ok := user.PublicMetadata["subscription_plan"].(string); ok {
				plan = planStr
			}
		}
	}

	if plan == "basic" {
		limit = 10
	} else if plan == "pro" {
		limit = -1 // unlimited
	}

	return c.JSON(fiber.Map{
		"session_count": sessionCount,
		"month_year":    currentMonth,
		"plan":          plan,
		"limit":         limit,
		"remaining": func() int {
			if limit == -1 {
				return -1 // unlimited
			}
			remaining := limit - sessionCount
			if remaining < 0 {
				return 0
			}
			return remaining
		}(),
	})
}

// IncrementUsage increments the usage counter for the current month
func (h *SubscriptionHandler) IncrementUsage(userID int64) error {
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

// getUserID gets user ID from context
func (h *SubscriptionHandler) getUserID(c *fiber.Ctx) (int64, error) {
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
