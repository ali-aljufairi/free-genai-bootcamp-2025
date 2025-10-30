package session

import (
	"errors"
	"lang-portal/internal/database/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type StudyActivityHandler struct {
	db *gorm.DB
}

func NewStudyActivityHandler(db *gorm.DB) *StudyActivityHandler {
	return &StudyActivityHandler{db: db}
}

// GetStudyActivity returns a specific study activity by ID
func (h *StudyActivityHandler) GetStudyActivity(c *fiber.Ctx) error {
	// Parse the activity ID from URL parameters
	activityID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid activity ID"})
	}

	var activity models.StudyActivity
	result := h.db.First(&activity, activityID)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Study activity not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get study activity"})
	}

	return c.JSON(activity)
}

// GetStudyActivitySessions returns all study sessions for a specific activity
func (h *StudyActivityHandler) GetStudyActivitySessions(c *fiber.Ctx) error {
	// Parse the activity ID from URL parameters
	activityID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid activity ID"})
	}

	// Parse pagination parameters with defaults and basic validation
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	itemsPerPage, err := strconv.Atoi(c.Query("per_page", "10"))
	if err != nil || itemsPerPage < 1 {
		itemsPerPage = 10
	}
	offset := (page - 1) * itemsPerPage

	var sessions []models.StudySession
	var total int64

	// Count the total sessions for this activity
	countResult := h.db.
		Model(&models.StudySession{}).
		Where("study_activity_id = ?", activityID).
		Count(&total)
	if countResult.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get sessions count"})
	}

	// Retrieve the paginated sessions
	result := h.db.
		Model(&models.StudySession{}).
		Where("study_activity_id = ?", activityID).
		Offset(offset).
		Limit(itemsPerPage).
		Find(&sessions)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get sessions"})
	}

	return c.JSON(fiber.Map{
		"items": sessions,
		"total": total,
		"page":  page,
	})
}

// CreateStudyActivity creates a new study activity
func (h *StudyActivityHandler) CreateStudyActivity(c *fiber.Ctx) error {
	var input struct {
		Name         string              `json:"name"`
		ActivityType models.ActivityType `json:"activity_type"`
		Description  string              `json:"description"`
		IsActive     *bool               `json:"is_active,omitempty"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Validate the input
	if input.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name is required"})
	}
	if input.ActivityType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Activity type is required"})
	}

	description := input.Description
	activity := models.StudyActivity{
		Name:         input.Name,
		ActivityType: input.ActivityType,
		Description:  &description,
		IsActive:     input.IsActive,
		CreatedAt:    time.Now(),
	}

	result := h.db.Create(&activity)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create study activity"})
	}

	return c.Status(fiber.StatusCreated).JSON(activity)
}

// GetStudyActivities returns all study activities
func (h *StudyActivityHandler) GetStudyActivities(c *fiber.Ctx) error {
	// Parse pagination parameters with defaults
	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}
	itemsPerPage, err := strconv.Atoi(c.Query("per_page", "20"))
	if err != nil || itemsPerPage < 1 {
		itemsPerPage = 20
	}
	offset := (page - 1) * itemsPerPage

	var activities []models.StudyActivity
	var total int64

	// Count total activities
	countResult := h.db.Model(&models.StudyActivity{}).Count(&total)
	if countResult.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to count study activities",
		})
	}

	// Get activities with pagination
	result := h.db.
		Order("created_at DESC").
		Offset(offset).
		Limit(itemsPerPage).
		Find(&activities)

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get study activities",
		})
	}

	return c.JSON(fiber.Map{
		"items": activities,
		"total": total,
		"page":  page,
	})
}
