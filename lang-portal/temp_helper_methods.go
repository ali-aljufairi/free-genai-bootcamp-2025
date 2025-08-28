// ensureStudyActivitiesExist creates required study activities if they don't exist
func (h *FlashcardHandler) ensureStudyActivitiesExist() error {
	activities := []struct {
		name         string
		activityType string
		description  string
	}{
		{"Word Flashcards", "flashcard", "Practice vocabulary with flashcards"},
		{"Kanji Flashcards", "flashcard", "Practice kanji with flashcards"},
	}

	for _, activity := range activities {
		var count int64
		err := h.db.Raw("SELECT COUNT(*) FROM study_activities WHERE name = ? AND activity_type = ?",
			activity.name, activity.activityType).Scan(&count).Error
		if err != nil {
			return fmt.Errorf("failed to check study activity existence: %w", err)
		}

		if count == 0 {
			err = h.db.Exec(`
				INSERT INTO study_activities (name, activity_type, description) 
				VALUES (?, ?, ?)
				ON CONFLICT (name, activity_type) DO NOTHING
			`, activity.name, activity.activityType, activity.description).Error

			if err != nil {
				return fmt.Errorf("failed to create study activity '%s': %w", activity.name, err)
			}
		}
	}

	return nil
}
