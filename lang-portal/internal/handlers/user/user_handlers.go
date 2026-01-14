package user

import (
	"context"
	"fmt"
	"lang-portal/internal/database/models"
	"lang-portal/internal/services"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB                  *gorm.DB
	subscriptionService *services.SubscriptionService
}

func NewUserHandler(db *gorm.DB) (*UserHandler, error) {
	// Initialize subscription service (may fail in dev, but that's OK)
	subscriptionService, err := services.NewSubscriptionService()
	if err != nil {
		// In development, allow handler to be created without subscription service
		// The GetMe handler will handle this gracefully
		fmt.Printf("Warning: Failed to initialize subscription service: %v (continuing without it)\n", err)
		return &UserHandler{
			DB:                  db,
			subscriptionService: nil,
		}, nil
	}

	return &UserHandler{
		DB:                  db,
		subscriptionService: subscriptionService,
	}, nil
}

// updateUserFromClerk updates user data with real information from Clerk API
func (h *UserHandler) updateUserFromClerk(clerkID string) error {
	// This would need the same fetchClerkUser function from auth_middleware
	// For now, we'll just return nil - you could move fetchClerkUser to a shared package
	// or duplicate the logic here
	return nil
}

// GetMe returns the current authenticated user's profile
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
	// Get user_id from the middleware (set by auth middleware)
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	var profile models.UserProfile

	// Get user information - use PostgreSQL for user data
	if err := h.DB.First(&profile.User, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	// Get user settings - use PostgreSQL for user settings
	if err := h.DB.Where("user_id = ?", userID).First(&profile.Settings).Error; err != nil {
		// Create default settings if not found
		profile.Settings = models.UserSettings{
			UserID:            userID,
			HideEnglish:       false,
			UILanguage:        "en",
			Timezone:          "UTC",
			DailyReviewTarget: 20,
			CurrentJLPTLevel:  5,
		}
		// Save the default settings
		h.DB.Create(&profile.Settings)
	}

	// Get user roles - use PostgreSQL for user data
	if err := h.DB.Table("user_roles").
		Select("user_roles.user_id, user_roles.role_id, roles.role_name").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Scan(&profile.Roles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get user roles"})
	}

	// Get active subscription from Clerk Billing API (source of truth)
	profile.Subscription = nil
	if h.subscriptionService != nil {
		// Get Clerk user ID from context (set by auth middleware)
		clerkUserID, ok := c.Locals("clerk_user_id").(string)
		if ok && clerkUserID != "" {
			ctx := context.Background()
			plan, hasActive, err := h.subscriptionService.GetSubscriptionPlan(ctx, clerkUserID)
			if err != nil {
				// Log error but don't fail the request - subscription check is optional
				// This allows graceful degradation if Clerk API is unavailable
				fmt.Printf("Warning: Failed to check subscription for user %s: %v\n", clerkUserID, err)
			} else if hasActive && plan != "none" {
				// Create subscription model from Clerk data
				// Note: Clerk is the source of truth, so we create a minimal subscription object
				// StripeSubscriptionID and CurrentPeriodEnd may not be available from Clerk Billing API
				// in the current implementation, so we set them as empty/nil
				profile.Subscription = &models.Subscription{
					UserID:               userID,
					StripeSubscriptionID: "", // Not available from Clerk Billing API in current implementation
					Status:               "active",
					CurrentPeriodEnd:     nil, // Not available from Clerk Billing API in current implementation
				}
			}
		}
	}

	return c.JSON(profile)
}

func (h *UserHandler) GetUserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var profile models.UserProfile

	// Get user information
	if err := h.DB.First(&profile.User, userIDInt).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	// Get user settings
	if err := h.DB.Where("user_id = ?", userIDInt).First(&profile.Settings).Error; err != nil {
		// Create default settings if not found
		profile.Settings = models.UserSettings{
			UserID:            userIDInt,
			HideEnglish:       false,
			UILanguage:        "en",
			Timezone:          "UTC",
			DailyReviewTarget: 20,
			CurrentJLPTLevel:  5,
		}
	}

	// Get user roles with role names
	if err := h.DB.Raw(`
		SELECT ur.user_id, ur.role_id, r.role_name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = ?
	`, userIDInt).Scan(&profile.Roles).Error; err != nil {
		profile.Roles = []models.UserRole{}
	}

	// Get active subscription
	if err := h.DB.Where("user_id = ? AND status = 'active'", userIDInt).First(&profile.Subscription).Error; err != nil {
		profile.Subscription = nil
	}

	return c.JSON(profile)
}

func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req models.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Create user
	user := models.User{
		ClerkID:     req.ClerkID,
		Email:       req.Email,
		DisplayName: req.DisplayName,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
	}

	// Create default user settings
	settings := models.UserSettings{
		UserID:            user.ID,
		HideEnglish:       false,
		UILanguage:        "en",
		Timezone:          "UTC",
		DailyReviewTarget: 20,
		CurrentJLPTLevel:  5,
	}

	if err := h.DB.Create(&settings).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user settings"})
	}

	// Assign default student role
	var role models.Role
	if err := h.DB.Where("role_name = 'student'").First(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Default role not found"})
	}

	userRole := models.UserRole{
		UserID: user.ID,
		RoleID: role.ID,
	}

	if err := h.DB.Create(&userRole).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to assign default role"})
	}

	return c.Status(201).JSON(user)
}

func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req models.UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Build update map
	updates := make(map[string]interface{})
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.DisplayName != nil {
		updates["display_name"] = *req.DisplayName
	}
	if req.StripeCustomerID != nil {
		updates["stripe_customer_id"] = *req.StripeCustomerID
	}

	if err := h.DB.Model(&models.User{}).Where("id = ?", userIDInt).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user"})
	}

	return c.JSON(fiber.Map{"message": "User updated successfully"})
}

func (h *UserHandler) GetUserSettings(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var settings models.UserSettings
	if err := h.DB.Where("user_id = ?", userIDInt).First(&settings).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "User settings not found"})
	}

	return c.JSON(settings)
}

func (h *UserHandler) UpdateUserSettings(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req models.UpdateUserSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Build update map
	updates := make(map[string]interface{})
	if req.HideEnglish != nil {
		updates["hide_english"] = *req.HideEnglish
	}
	if req.SRSResetAt != nil {
		updates["srs_reset_at"] = *req.SRSResetAt
	}
	if req.UILanguage != nil {
		updates["ui_language"] = *req.UILanguage
	}
	if req.Timezone != nil {
		updates["timezone"] = *req.Timezone
	}
	if req.DailyReviewTarget != nil {
		updates["daily_review_target"] = *req.DailyReviewTarget
	}
	if req.CurrentJLPTLevel != nil {
		// Validate JLPT level range (1-5)
		if *req.CurrentJLPTLevel < 1 || *req.CurrentJLPTLevel > 5 {
			return c.Status(400).JSON(fiber.Map{"error": "JLPT level must be between 1 and 5"})
		}
		updates["current_jlpt_level"] = *req.CurrentJLPTLevel
	}
	if req.JLPTLevelAssessedAt != nil {
		updates["jlpt_level_assessed_at"] = *req.JLPTLevelAssessedAt
	}
	if req.JLPTLevelAssessmentMethod != nil {
		updates["jlpt_level_assessment_method"] = *req.JLPTLevelAssessmentMethod
	}

	// If no updates, return early
	if len(updates) == 0 {
		// Get existing settings or return default
		var settings models.UserSettings
		if err := h.DB.Where("user_id = ?", userIDInt).First(&settings).Error; err != nil {
			// Return default settings if not found
			settings = models.UserSettings{
				UserID:            userIDInt,
				HideEnglish:       false,
				UILanguage:        "en",
				Timezone:          "UTC",
				DailyReviewTarget: 20,
				CurrentJLPTLevel:  5,
			}
		}
		return c.JSON(settings)
	}

	// Use FirstOrCreate to ensure settings exist, then update
	var settings models.UserSettings
	result := h.DB.Where("user_id = ?", userIDInt).FirstOrCreate(&settings, models.UserSettings{
		UserID:            userIDInt,
		HideEnglish:       false,
		UILanguage:        "en",
		Timezone:          "UTC",
		DailyReviewTarget: 20,
		CurrentJLPTLevel:  5,
	})

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to get or create user settings",
			"details": result.Error.Error(),
		})
	}

	// Apply updates
	if err := h.DB.Model(&settings).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to update user settings",
			"details": err.Error(),
		})
	}

	// Reload settings to get updated values
	if err := h.DB.Where("user_id = ?", userIDInt).First(&settings).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to reload user settings",
			"details": err.Error(),
		})
	}

	return c.JSON(settings)
}

func (h *UserHandler) GetUserRoles(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var roles []models.UserRole
	if err := h.DB.Raw(`
		SELECT ur.user_id, ur.role_id, r.role_name
		FROM user_roles ur
		JOIN roles r ON ur.role_id = r.id
		WHERE ur.user_id = ?
	`, userIDInt).Scan(&roles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get user roles"})
	}

	return c.JSON(roles)
}

func (h *UserHandler) AssignRole(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req models.AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Get role ID
	var role models.Role
	if err := h.DB.Where("role_name = ?", req.RoleName).First(&role).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid role name"})
	}

	// Assign role
	userRole := models.UserRole{
		UserID: userIDInt,
		RoleID: role.ID,
	}

	if err := h.DB.Create(&userRole).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to assign role"})
	}

	return c.JSON(fiber.Map{"message": "Role assigned successfully"})
}

func (h *UserHandler) GetUserSubscription(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var subscription models.Subscription
	if err := h.DB.Where("user_id = ? AND status = 'active'", userIDInt).First(&subscription).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "No active subscription found"})
	}

	return c.JSON(subscription)
}

func (h *UserHandler) CreateSubscription(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req models.CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	subscription := models.Subscription{
		UserID:               userIDInt,
		StripeSubscriptionID: req.StripeSubscriptionID,
		Status:               req.Status,
		CurrentPeriodEnd:     req.CurrentPeriodEnd,
	}

	if err := h.DB.Create(&subscription).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create subscription"})
	}

	return c.Status(201).JSON(subscription)
}

func (h *UserHandler) UpdateSubscription(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req models.UpdateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Build update map
	updates := make(map[string]interface{})
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.CurrentPeriodEnd != nil {
		updates["current_period_end"] = *req.CurrentPeriodEnd
	}

	if err := h.DB.Model(&models.Subscription{}).Where("user_id = ?", userIDInt).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update subscription"})
	}

	return c.JSON(fiber.Map{"message": "Subscription updated successfully"})
}

// AssessUserJLPTLevel assesses the user's JLPT level based on their performance
func (h *UserHandler) AssessUserJLPTLevel(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Call the database function to assess JLPT level
	var result struct {
		AssessedLevel int    `json:"assessed_level"`
		Method        string `json:"method"`
		Message       string `json:"message"`
	}

	if err := h.DB.Raw("SELECT * FROM assess_user_jlpt_level(?)", userIDInt).Scan(&result).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to assess JLPT level"})
	}

	return c.JSON(result)
}

// GetUserJLPTLevel gets the current JLPT level for a user
func (h *UserHandler) GetUserJLPTLevel(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Call the database function to get JLPT level
	var result struct {
		CurrentLevel int       `json:"current_level"`
		AssessedAt   time.Time `json:"assessed_at"`
		Method       string    `json:"method"`
	}

	if err := h.DB.Raw("SELECT * FROM get_user_jlpt_level(?)", userIDInt).Scan(&result).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get JLPT level"})
	}

	return c.JSON(result)
}

// ResetUserSRSProgress resets the user's SRS progress
func (h *UserHandler) ResetUserSRSProgress(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Update user settings to reset SRS
	now := time.Now()
	if err := h.DB.Model(&models.UserSettings{}).
		Where("user_id = ?", userIDInt).
		Update("srs_reset_at", now).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to reset SRS progress"})
	}

	return c.JSON(fiber.Map{
		"message":  "SRS progress reset successfully",
		"reset_at": now,
	})
}

// CheckSubscriptionStatus checks if user has active subscription
func (h *UserHandler) CheckSubscriptionStatus(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var subscription models.Subscription
	if err := h.DB.Where("user_id = ? AND status = 'active'", userIDInt).First(&subscription).Error; err != nil {
		return c.JSON(fiber.Map{
			"has_active_subscription": false,
			"subscription":            nil,
		})
	}

	// Check if subscription is still valid
	hasActiveSubscription := true
	if subscription.CurrentPeriodEnd != nil && time.Now().After(*subscription.CurrentPeriodEnd) {
		hasActiveSubscription = false
	}

	return c.JSON(fiber.Map{
		"has_active_subscription": hasActiveSubscription,
		"subscription":            subscription,
	})
}

// CancelSubscription cancels a user's subscription
func (h *UserHandler) CancelSubscription(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Update subscription status to canceled
	if err := h.DB.Model(&models.Subscription{}).
		Where("user_id = ? AND status = 'active'", userIDInt).
		Update("status", "canceled").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to cancel subscription"})
	}

	return c.JSON(fiber.Map{"message": "Subscription canceled successfully"})
}

// SetFavoriteGroup sets the user's favorite group
func (h *UserHandler) SetFavoriteGroup(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	var req struct {
		GroupID *int64 `json:"group_id"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate group exists and user has access if groupID is provided
	if req.GroupID != nil {
		var group models.Group
		if err := h.DB.First(&group, *req.GroupID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Group not found"})
		}

		// Check if user owns the group or if it's a system group (user_id is nil)
		if group.UserID != nil && *group.UserID != userID {
			return c.Status(403).JSON(fiber.Map{"error": "Not authorized to set this group as favorite"})
		}
	}

	// Update user's favorite group
	if err := h.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("favorite_group_id", req.GroupID).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update favorite group"})
	}

	return c.JSON(fiber.Map{"success": true})
}
