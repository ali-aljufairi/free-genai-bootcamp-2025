package subscription

import (
	"fmt"
	"lang-portal/internal/services"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// SubscriptionHandler handles subscription-related operations
type SubscriptionHandler struct {
	db                  *gorm.DB
	subscriptionService *services.SubscriptionService
}

// NewSubscriptionHandler creates a new instance of SubscriptionHandler
func NewSubscriptionHandler(db *gorm.DB) (*SubscriptionHandler, error) {
	subscriptionService, err := services.NewSubscriptionService()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize subscription service: %w", err)
	}

	return &SubscriptionHandler{
		db:                  db,
		subscriptionService: subscriptionService,
	}, nil
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

	// Get subscription plan using the service (with caching)
	ctx := c.Context()
	plan, hasActive, err := h.subscriptionService.GetSubscriptionPlan(ctx, clerkUserID)
	if err != nil {
		// Log error but don't block - allow access with basic plan limits as fallback
		// This ensures service continues to work if Clerk API is temporarily unavailable
		plan = "none"
		hasActive = false
	}

	// If Pro plan, allow unlimited. Free is treated as non-paid and follows usage limits.
	if hasActive && plan == "pro" {
		return c.JSON(fiber.Map{
			"can_start": true,
			"reason":    "unlimited",
			"plan":      plan,
		})
	}

	// For Basic plan or non-subscribers (including Free), check usage count
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
	} else if err != gorm.ErrRecordNotFound {
		// Log only if it's not a "record not found" error
		// Table missing errors will be logged by GORM, but we handle gracefully
		if !strings.Contains(err.Error(), "does not exist") {
			fmt.Printf("Warning: Error querying companion_study_usage: %v\n", err)
		}
	}

	// Determine limits:
	// - Pro: handled above (unlimited)
	// - Basic: 10 sessions per month
	// - Free/None: 0 sessions (blocked from starting companion study)
	limit := 0
	responsePlan := plan
	if hasActive && plan == "basic" {
		limit = 10
	} else {
		// Any non-paid plan (including free or none) is treated as having no allowance
		responsePlan = "none"
	}

	canStart := sessionCount < limit

	return c.JSON(fiber.Map{
		"can_start":     canStart,
		"reason":        "usage_limit",
		"plan":          responsePlan,
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
	} else if err != gorm.ErrRecordNotFound {
		// Log only if it's not a "record not found" error
		// Table missing errors will be logged by GORM, but we handle gracefully
		if !strings.Contains(err.Error(), "does not exist") {
			fmt.Printf("Warning: Error querying companion_study_usage: %v\n", err)
		}
	}

	// Get user's plan from subscription service (with caching)
	clerkUserID, _ := c.Locals("clerk_user_id").(string)
	plan := "none"
	limit := 0

	if clerkUserID != "" {
		ctx := c.Context()
		planStr, hasActive, err := h.subscriptionService.GetSubscriptionPlan(ctx, clerkUserID)
		if err == nil {
			plan = planStr
			if !hasActive {
				plan = "none"
			}
		}
		// If error, plan remains "none" as fallback
	}

	// Map plans to limits:
	// - Pro: unlimited (-1)
	// - Basic: 10
	// - Free/None: 0 (no allowance)
	if plan == "basic" {
		limit = 10
	} else if plan == "pro" {
		limit = -1 // unlimited
	} else {
		limit = 0
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
	// Use ON CONFLICT ON CONSTRAINT to explicitly reference the PRIMARY KEY constraint
	err := h.db.Exec(`
		INSERT INTO companion_study_usage (user_id, month_year, session_count, updated_at)
		VALUES ($1, $2, 1, NOW())
		ON CONFLICT ON CONSTRAINT companion_study_usage_pkey
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
