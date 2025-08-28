package handlers

import (
	"lang-portal/internal/database"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
)

type DashboardHandler struct {
	DB *database.DB
}

type LastStudySession struct {
	ID              int       `json:"id"`
	GroupID         int       `json:"group_id"`
	CreatedAt       time.Time `json:"created_at"`
	StudyActivityID int       `json:"study_activity_id"`
	GroupName       string    `json:"group_name"`
}

type StudyProgress struct {
	TotalWordsStudied   int64 `json:"total_words_studied"`
	TotalAvailableWords int64 `json:"total_available_words"`
}

type QuickStats struct {
	SuccessRate        float64 `json:"success_rate"`
	TotalStudySessions int64   `json:"total_study_sessions"`
	TotalActiveGroups  int64   `json:"total_active_groups"`
	StudyStreakDays    int     `json:"study_streak_days"`
}

func NewDashboardHandler(db *database.DB) *DashboardHandler {
	return &DashboardHandler{DB: db}
}

// GetLastStudySession returns information about the most recent study session
func (h *DashboardHandler) GetLastStudySession(c *fiber.Ctx) error {
	var session LastStudySession
	result := h.DB.GetDB().Table("study_sessions").Select(
		"study_sessions.id, study_sessions.group_id, study_sessions.created_at, study_sessions.study_activity_id, groups.name as group_name",
	).Joins(
		"JOIN groups ON study_sessions.group_id = groups.id",
	).Order("study_sessions.created_at DESC").Limit(1).Scan(&session)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(session)
}

// GetStudyProgress returns study progress statistics
func (h *DashboardHandler) GetStudyProgress(c *fiber.Ctx) error {
	var progress StudyProgress

	// Get total words studied (unique words that have been reviewed)
	h.DB.GetDB().Table("word_review_items").Select("COUNT(DISTINCT word_id)").Scan(&progress.TotalWordsStudied)

	// Get total available words
	h.DB.GetDB().Table("words").Count(&progress.TotalAvailableWords)

	return c.JSON(progress)
}

// GetQuickStats returns quick overview statistics
func (h *DashboardHandler) GetQuickStats(c *fiber.Ctx) error {
	var stats QuickStats

	// Calculate success rate
	var totalReviews, correctReviews int64
	h.DB.GetDB().Table("word_review_items").Count(&totalReviews)
	h.DB.GetDB().Table("word_review_items").Where("correct = ?", true).Count(&correctReviews)
	if totalReviews > 0 {
		stats.SuccessRate = float64(correctReviews) / float64(totalReviews) * 100
	}

	// Get total study sessions
	h.DB.GetDB().Table("study_sessions").Count(&stats.TotalStudySessions)

	// Get total active groups
	h.DB.GetDB().Table("study_sessions").Select("COUNT(DISTINCT group_id)").Scan(&stats.TotalActiveGroups)

	// Calculate study streak - Check for any activity type
	type StudyDate struct {
		Date string `gorm:"column:activity_date"`
	}
	var dates []StudyDate

	// Use Raw SQL to combine dates from both study_sessions and study_activities
	h.DB.GetDB().Raw(`
		SELECT activity_date FROM (
			SELECT DATE(created_at) as activity_date FROM study_sessions
			UNION
			SELECT DATE(created_at) as activity_date FROM study_activities
			UNION
			SELECT DATE(created_at) as activity_date FROM word_review_items
		) all_activity
		GROUP BY activity_date
		ORDER BY activity_date DESC
	`).Scan(&dates)

	streak := 0
	if len(dates) > 0 {
		streak = 1
		today := time.Now().Truncate(24 * time.Hour)

		// Parse the most recent date
		lastActivity, err := time.Parse("2006-01-02", dates[0].Date)
		if err != nil {
			// If parsing fails, default to 1 day streak
			stats.StudyStreakDays = streak
			return c.JSON(stats)
		}

		// Check if the streak is broken (no activity today or yesterday)
		lastActivity = lastActivity.Truncate(24 * time.Hour)
		daysSinceLastActivity := int(today.Sub(lastActivity).Hours() / 24)

		if daysSinceLastActivity > 1 {
			// Streak is broken - only count the past consecutive days
			stats.StudyStreakDays = 0
			return c.JSON(stats)
		}

		// Parse dates manually and count consecutive days
		var prevDate time.Time
		for i, dateItem := range dates {
			currentDate, err := time.Parse("2006-01-02", dateItem.Date)
			if err != nil {
				continue
			}

			// Initialize on first valid date
			if i == 0 {
				prevDate = currentDate
				continue
			}

			// Check for consecutive days
			daysBetween := int(prevDate.Sub(currentDate).Hours() / 24)
			if daysBetween == 1 {
				// Consecutive day found
				streak++
				prevDate = currentDate
			} else if daysBetween > 1 {
				// Gap found, stop counting
				break
			} else {
				// Same day (should not happen with GROUP BY, but just in case)
				prevDate = currentDate
			}
		}
	}
	stats.StudyStreakDays = streak

	return c.JSON(stats)
}

// TestSentry is a test endpoint to verify Sentry error reporting
func (h *DashboardHandler) TestSentry(c *fiber.Ctx) error {
	// Test different types of Sentry events
	testType := c.Query("type", "error")

	switch testType {
	case "error":
		// Test error reporting
		sentry.CaptureException(fiber.NewError(fiber.StatusInternalServerError, "Test error from backend"))
		return c.JSON(fiber.Map{"message": "Test error sent to Sentry"})

	case "message":
		// Test message reporting
		sentry.CaptureMessage("Test message from backend")
		return c.JSON(fiber.Map{"message": "Test message sent to Sentry"})

	case "performance":
		// Test performance monitoring
		transaction := sentry.StartTransaction(c.Context(), "Test Transaction")
		defer transaction.Finish()

		// Simulate some work
		time.Sleep(100 * time.Millisecond)

		return c.JSON(fiber.Map{"message": "Test performance transaction sent to Sentry"})

	default:
		return c.JSON(fiber.Map{"error": "Invalid test type. Use: error, message, or performance"})
	}
}
