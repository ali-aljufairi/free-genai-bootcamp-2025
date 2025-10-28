package flashcard

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"lang-portal/internal/database/models"

	"github.com/gofiber/fiber/v2"
)

// getFirstMeaning extracts the first meaning from a comma-separated string
func getFirstMeaning(meanings string) string {
	if meanings == "" {
		return ""
	}
	parts := strings.Split(meanings, ",")
	if len(parts) > 0 {
		return strings.TrimSpace(parts[0])
	}
	return meanings
}

// getUserID gets user ID from context or falls back to first available user
func (h *FlashcardHandler) getUserID(c *fiber.Ctx) (int64, error) {
	// Try to get user ID from context first (from auth middleware)
	if userIDInterface := c.Locals("user_id"); userIDInterface != nil {
		if userID, ok := userIDInterface.(int64); ok && userID > 0 {
			return userID, nil
		}
	}

	// Fallback: get first available user from database
	var userID int64
	err := h.db.Raw("SELECT id FROM users ORDER BY id LIMIT 1").Scan(&userID).Error
	if err != nil {
		return 0, fmt.Errorf("no users found in database: %w", err)
	}

	if userID == 0 {
		return 0, fmt.Errorf("no valid user ID found")
	}

	return userID, nil
}

// shuffleFlashcardOptions randomizes options and returns new slice and new correct index
func shuffleFlashcardOptions(options []FlashcardContent, correctIndex int) ([]FlashcardContent, int) {
	rand.Seed(time.Now().UnixNano())
	// Pair option with original index
	type pair struct {
		opt        FlashcardContent
		wasCorrect bool
	}
	pairs := make([]pair, len(options))
	for i, o := range options {
		pairs[i] = pair{opt: o, wasCorrect: i == correctIndex}
	}
	rand.Shuffle(len(pairs), func(i, j int) { pairs[i], pairs[j] = pairs[j], pairs[i] })
	newOpts := make([]FlashcardContent, len(options))
	newCorrect := 0
	for i, p := range pairs {
		newOpts[i] = p.opt
		if p.wasCorrect {
			newCorrect = i
		}
	}
	return newOpts, newCorrect
}

// ensureDevUserExists creates a development user if it doesn't exist
func (h *FlashcardHandler) ensureDevUserExists(userID int64) error {
	// Check if user exists
	var count int64
	err := h.db.Raw("SELECT COUNT(*) FROM users WHERE id = ?", userID).Scan(&count).Error
	if err != nil {
		return fmt.Errorf("failed to check user existence: %w", err)
	}

	if count == 0 {
		// Create development user
		err = h.db.Exec(`
			INSERT INTO users (id, clerk_id, email, display_name) 
			VALUES (?, ?, ?, ?)
			ON CONFLICT (id) DO NOTHING
		`, userID, fmt.Sprintf("dev_user_%d", userID), fmt.Sprintf("dev%d@example.com", userID), fmt.Sprintf("Dev User %d", userID)).Error

		if err != nil {
			return fmt.Errorf("failed to create development user: %w", err)
		}
	}

	return nil
}

// ensureStudyActivitiesExist creates required study activities if they don't exist
func (h *FlashcardHandler) ensureStudyActivitiesExist() error {
	activities := []struct {
		name         string
		activityType models.ActivityType
		description  string
	}{
		{"SRS Flashcards", "flashcard", "Practice vocabulary with spaced repetition"},
	}

	for _, activity := range activities {
		studyActivity := models.StudyActivity{
			ActivityType: activity.activityType,
		}

		// FirstOrCreate will find existing or create new based on ActivityType (unique constraint)
		result := h.db.Where(models.StudyActivity{ActivityType: activity.activityType}).
			Assign(models.StudyActivity{
				Name:        activity.name,
				Description: &activity.description,
			}).
			FirstOrCreate(&studyActivity)

		if result.Error != nil {
			return fmt.Errorf("failed to ensure study activity '%s' exists: %w", activity.name, result.Error)
		}
	}

	return nil
}
