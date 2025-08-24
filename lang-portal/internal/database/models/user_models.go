package models

import (
	"time"
)

// User represents a user account in the system
type User struct {
	ID               int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ClerkID          string    `json:"clerk_id" gorm:"uniqueIndex;not null"`
	Email            string    `json:"email" gorm:"not null"`
	DisplayName      *string   `json:"display_name"`
	StripeCustomerID *string   `json:"stripe_customer_id" gorm:"uniqueIndex"`
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}

// UserSettings represents user preferences and study settings
type UserSettings struct {
	UserID                    int64      `json:"user_id" gorm:"primaryKey"`
	HideEnglish               bool       `json:"hide_english" gorm:"default:false"`
	SRSResetAt                *time.Time `json:"srs_reset_at"`
	UILanguage                string     `json:"ui_language" gorm:"default:'en'"`
	Timezone                  string     `json:"timezone" gorm:"default:'UTC'"`
	DailyReviewTarget         int        `json:"daily_review_target" gorm:"default:20"`
	CurrentJLPTLevel          int        `json:"current_jlpt_level" gorm:"default:5;check:current_jlpt_level >= 1 AND current_jlpt_level <= 5"`
	JLPTLevelAssessedAt       *time.Time `json:"jlpt_level_assessed_at"`
	JLPTLevelAssessmentMethod *string    `json:"jlpt_level_assessment_method"`
	CreatedAt                 time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt                 time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for UserSettings
func (UserSettings) TableName() string {
	return "user_settings"
}

// Role represents system roles
type Role struct {
	ID       int    `json:"id" gorm:"primaryKey;autoIncrement"`
	RoleName string `json:"role_name" gorm:"uniqueIndex;not null"`
}

// TableName specifies the table name for Role
func (Role) TableName() string {
	return "roles"
}

// UserRole represents the many-to-many relationship between users and roles
type UserRole struct {
	UserID int64 `json:"user_id" gorm:"primaryKey"`
	RoleID int   `json:"role_id" gorm:"primaryKey"`

	// Include role name for easier access
	RoleName string `json:"role_name" gorm:"-"`
}

// TableName specifies the table name for UserRole
func (UserRole) TableName() string {
	return "user_roles"
}

// Subscription represents user subscription information
type Subscription struct {
	ID                   int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID               int64      `json:"user_id" gorm:"not null"`
	StripeSubscriptionID string     `json:"stripe_subscription_id" gorm:"uniqueIndex;not null"`
	Status               string     `json:"status" gorm:"not null"`
	CurrentPeriodEnd     *time.Time `json:"current_period_end"`
	CreatedAt            time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt            time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for Subscription
func (Subscription) TableName() string {
	return "subscriptions"
}

// UserProfile represents a complete user profile with all related data
type UserProfile struct {
	User         User          `json:"user"`
	Settings     UserSettings  `json:"settings"`
	Roles        []UserRole    `json:"roles"`
	Subscription *Subscription `json:"subscription,omitempty"`
}

// CreateUserRequest represents the request body for creating a user
type CreateUserRequest struct {
	ClerkID     string  `json:"clerk_id" validate:"required"`
	Email       string  `json:"email" validate:"required,email"`
	DisplayName *string `json:"display_name"`
}

// UpdateUserRequest represents the request body for updating a user
type UpdateUserRequest struct {
	Email            *string `json:"email" validate:"omitempty,email"`
	DisplayName      *string `json:"display_name"`
	StripeCustomerID *string `json:"stripe_customer_id"`
}

// UpdateUserSettingsRequest represents the request body for updating user settings
type UpdateUserSettingsRequest struct {
	HideEnglish               *bool      `json:"hide_english"`
	SRSResetAt                *time.Time `json:"srs_reset_at"`
	UILanguage                *string    `json:"ui_language"`
	Timezone                  *string    `json:"timezone"`
	DailyReviewTarget         *int       `json:"daily_review_target" validate:"omitempty,min=1,max=100"`
	CurrentJLPTLevel          *int       `json:"current_jlpt_level" validate:"omitempty,min=1,max=5"`
	JLPTLevelAssessedAt       *time.Time `json:"jlpt_level_assessed_at"`
	JLPTLevelAssessmentMethod *string    `json:"jlpt_level_assessment_method"`
}

// AssignRoleRequest represents the request body for assigning a role
type AssignRoleRequest struct {
	RoleName string `json:"role_name" validate:"required,oneof=admin teacher student"`
}

// CreateSubscriptionRequest represents the request body for creating a subscription
type CreateSubscriptionRequest struct {
	StripeSubscriptionID string     `json:"stripe_subscription_id" validate:"required"`
	Status               string     `json:"status" validate:"required"`
	CurrentPeriodEnd     *time.Time `json:"current_period_end"`
}

// UpdateSubscriptionRequest represents the request body for updating a subscription
type UpdateSubscriptionRequest struct {
	Status           *string    `json:"status"`
	CurrentPeriodEnd *time.Time `json:"current_period_end"`
}
