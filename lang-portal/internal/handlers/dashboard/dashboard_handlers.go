package dashboard

import (
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	DB *gorm.DB
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
	SuccessRate            float64 `json:"success_rate"`
	TotalStudySessions     int64   `json:"total_study_sessions"`
	TotalActiveGroups      int64   `json:"total_active_groups"`
	StudyStreakDays        int     `json:"study_streak_days"`
	TotalSessionsCompleted int64   `json:"total_sessions_completed"`
	ItemsInReview          int64   `json:"items_in_review"`
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{DB: db}
}

// GetLastStudySession returns information about the most recent study session
func (h *DashboardHandler) GetLastStudySession(c *fiber.Ctx) error {
	// Get user_id from the middleware (set by auth middleware)
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	// Use enhanced_study_sessions instead of study_sessions
	var session struct {
		ID        int64     `json:"id"`
		CreatedAt time.Time `json:"created_at"`
		StartedAt time.Time `json:"started_at"`
	}
	result := h.DB.Table("enhanced_study_sessions").
		Where("user_id = ?", userID).
		Order("started_at DESC").
		Limit(1).
		Scan(&session)

	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.JSON(session)
}

// GetStudyProgress returns study progress statistics
func (h *DashboardHandler) GetStudyProgress(c *fiber.Ctx) error {
	// Get user_id from the middleware (set by auth middleware)
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	var progress StudyProgress

	// Get total words studied (unique words that have been reviewed) from progress table
	h.DB.Table("progress").
		Where("user_id = ? AND item_type = 'word' AND seen_cnt > 0", userID).
		Select("COUNT(DISTINCT item_id)").
		Scan(&progress.TotalWordsStudied)

	// Get total available words
	h.DB.Table("words").Count(&progress.TotalAvailableWords)

	return c.JSON(progress)
}

// GetQuickStats returns quick overview statistics
func (h *DashboardHandler) GetQuickStats(c *fiber.Ctx) error {
	// Get user_id from the middleware (set by auth middleware)
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	var stats QuickStats

	// Calculate success rate for this user from progress table
	var totalReviews, correctReviews int64
	h.DB.Table("progress").Where("user_id = ? AND seen_cnt > 0", userID).Count(&totalReviews)
	h.DB.Table("progress").Where("user_id = ? AND seen_cnt > 0 AND correct_cnt > 0", userID).Count(&correctReviews)
	if totalReviews > 0 {
		stats.SuccessRate = float64(correctReviews) / float64(totalReviews) * 100
	}

	// Get total study sessions for this user from enhanced_study_sessions
	h.DB.Table("enhanced_study_sessions").Where("user_id = ?", userID).Count(&stats.TotalStudySessions)

	// Get total active groups - count distinct groups from user's groups table
	h.DB.Table("groups").Where("user_id = ?", userID).Count(&stats.TotalActiveGroups)

	// Get total completed sessions - count all sessions (mark as complete by default)
	h.DB.Table("enhanced_study_sessions").Where("user_id = ?", userID).Count(&stats.TotalSessionsCompleted)

	// Get items in review (SRS items due for review)
	h.DB.Table("progress").Where("user_id = ? AND next_due <= NOW()", userID).Count(&stats.ItemsInReview)

	// Calculate study streak - Check for any activity type for this user
	type StudyDate struct {
		Date string `gorm:"column:activity_date"`
	}
	var dates []StudyDate

	// Use Raw SQL to combine dates from all activity sources for this user
	// Include: enhanced_study_sessions (flashcards/grammar), learning_activities (word builder), chat_sessions (chat), and progress (SRS reviews)
	h.DB.Raw(`
		SELECT activity_date FROM (
			SELECT DATE(started_at) as activity_date FROM enhanced_study_sessions WHERE user_id = ?
			UNION
			SELECT DATE(started_at) as activity_date FROM learning_activities WHERE user_id = ?
			UNION
			SELECT DATE(started_at) as activity_date FROM chat_sessions WHERE user_id = ?
			UNION
			SELECT DATE(last_seen) as activity_date FROM progress WHERE user_id = ? AND last_seen IS NOT NULL
		) all_activity
		GROUP BY activity_date
		ORDER BY activity_date DESC
	`, userID, userID, userID, userID).Scan(&dates)

	streak := 0
	if len(dates) > 0 {
		today := time.Now().Truncate(24 * time.Hour)

		// Create a map of activity dates for quick lookup
		activityMap := make(map[string]bool)
		for _, dateItem := range dates {
			activityMap[dateItem.Date] = true
		}

		// Count consecutive days backwards from today
		// If there's activity today, streak starts at 1, then count backwards
		currentDate := today
		for {
			dateStr := currentDate.Format("2006-01-02")
			if activityMap[dateStr] {
				streak++
				// Move to previous day
				currentDate = currentDate.AddDate(0, 0, -1)
			} else {
				// No activity on this day, streak is broken
				break
			}
		}
	}
	stats.StudyStreakDays = streak

	return c.JSON(stats)
}

// GetActivityDates returns dates when the user had study activity (for calendar display)
func (h *DashboardHandler) GetActivityDates(c *fiber.Ctx) error {
	// Get user_id from the middleware (set by auth middleware)
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	type ActivityDate struct {
		Date string `json:"date" gorm:"column:activity_date"`
	}
	var dates []ActivityDate

	// Use the same logic as streak calculation - combine dates from all activity sources
	// Include: enhanced_study_sessions (flashcards/grammar), learning_activities (word builder), chat_sessions (chat), and progress (SRS reviews)
	h.DB.Raw(`
		SELECT activity_date FROM (
			SELECT DATE(started_at) as activity_date FROM enhanced_study_sessions WHERE user_id = ?
			UNION
			SELECT DATE(started_at) as activity_date FROM learning_activities WHERE user_id = ?
			UNION
			SELECT DATE(started_at) as activity_date FROM chat_sessions WHERE user_id = ?
			UNION
			SELECT DATE(last_seen) as activity_date FROM progress WHERE user_id = ? AND last_seen IS NOT NULL
		) all_activity
		GROUP BY activity_date
		ORDER BY activity_date DESC
	`, userID, userID, userID, userID).Scan(&dates)

	// Convert to simple array of date strings
	dateStrings := make([]string, len(dates))
	for i, d := range dates {
		dateStrings[i] = d.Date
	}

	return c.JSON(fiber.Map{
		"dates": dateStrings,
	})
}

// RecentActivity represents a recent activity item
type RecentActivity struct {
	ID          int64     `json:"id"`
	Type        string    `json:"type"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// GetRecentActivities returns recent activities from all sources (including started sessions)
func (h *DashboardHandler) GetRecentActivities(c *fiber.Ctx) error {
	// Get user_id from the middleware (set by auth middleware)
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 50 {
			limit = parsedLimit
		}
	}

	var activities []RecentActivity

	// Get activities from enhanced_study_sessions (flashcards, grammar)
	var flashcardActivities []struct {
		ID        int64     `gorm:"column:id"`
		Type      string    `gorm:"column:session_type"`
		StartedAt time.Time `gorm:"column:started_at"`
		Notes     *string   `gorm:"column:notes"`
	}
	h.DB.Table("enhanced_study_sessions").
		Where("user_id = ?", userID).
		Select("id, session_type, started_at, notes").
		Order("started_at DESC").
		Limit(limit).
		Find(&flashcardActivities)

	for _, act := range flashcardActivities {
		activityType := "flashcards"
		name := "Studied Flashcards"
		description := "Flashcard session"

		// Determine type from session_type or notes
		if act.Type == "kanji_study" {
			activityType = "flashcards"
			name = "Studied Kanji"
			description = "Kanji flashcards"
		} else if act.Notes != nil && len(*act.Notes) > 0 {
			// Check if it's a grammar session
			if contains(*act.Notes, "grammar_config") {
				activityType = "quiz"
				name = "Grammar Quiz"
				description = "Grammar practice"
			}
		}

		activities = append(activities, RecentActivity{
			ID:          act.ID,
			Type:        activityType,
			Name:        name,
			Description: description,
			CreatedAt:   act.StartedAt,
		})
	}

	// Get activities from learning_activities (word builder)
	var wordBuilderActivities []struct {
		ID          int64      `gorm:"column:id"`
		StartedAt   time.Time  `gorm:"column:started_at"`
		CompletedAt *time.Time `gorm:"column:completed_at"`
	}
	h.DB.Table("learning_activities").
		Where("user_id = ? AND activity_type = 'word_builder'", userID).
		Select("id, started_at, completed_at").
		Order("started_at DESC").
		Limit(limit).
		Find(&wordBuilderActivities)

	for _, act := range wordBuilderActivities {
		status := "Started"
		if act.CompletedAt != nil {
			status = "Completed"
		}
		activities = append(activities, RecentActivity{
			ID:          act.ID,
			Type:        "word_builder",
			Name:        "Word Builder",
			Description: status,
			CreatedAt:   act.StartedAt,
		})
	}

	// Get activities from chat_sessions
	var chatActivities []struct {
		ID        int64     `gorm:"column:id"`
		StartedAt time.Time `gorm:"column:started_at"`
	}
	h.DB.Table("chat_sessions").
		Where("user_id = ?", userID).
		Select("id, started_at").
		Order("started_at DESC").
		Limit(limit).
		Find(&chatActivities)

	for _, act := range chatActivities {
		activities = append(activities, RecentActivity{
			ID:          act.ID,
			Type:        "chat",
			Name:        "Chat Practice",
			Description: "Conversation practice",
			CreatedAt:   act.StartedAt,
		})
	}

	// Sort all activities by created_at descending and limit
	sort.Slice(activities, func(i, j int) bool {
		return activities[i].CreatedAt.After(activities[j].CreatedAt)
	})

	if len(activities) > limit {
		activities = activities[:limit]
	}

	return c.JSON(fiber.Map{
		"items": activities,
		"total": len(activities),
	})
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
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
