package reading

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"
)

// createReadingSession creates a reading quiz session in the database
func (h *ReadingHandler) createReadingSession(session *ReadingQuizSession, seed int64) (int64, error) {
	// Create payload with config and seed (don't cache questions to avoid JSON issues)
	payload := map[string]interface{}{
		"reading_config": session.Config,
		"seed":           seed,
		"question_count": len(session.Questions),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Insert session into enhanced_study_sessions
	// Use "vocabulary_review" as session_type to match database constraint
	var sessionID int64
	err = h.db.Raw(`
		INSERT INTO enhanced_study_sessions 
		(user_id, session_type, notes, created_at, started_at) 
		VALUES (?, ?, ?, NOW(), ?)
		RETURNING id
	`, session.UserID, "vocabulary_review", string(payloadJSON), session.StartedAt).Scan(&sessionID).Error

	if err != nil {
		return 0, fmt.Errorf("failed to create session: %w", err)
	}

	// Assign ephemeral IDs to questions using index (not stored). Client will return positions.
	for i := range session.Questions {
		session.Questions[i].ID = int64(i + 1)
	}

	return sessionID, nil
}

// getReadingSession gets a reading quiz session by ID
func (h *ReadingHandler) getReadingSession(sessionID int64, userID int64) (*ReadingQuizSession, error) {
	// Read config + seed from enhanced_study_sessions.notes
	var row struct {
		ID        int64      `gorm:"column:id"`
		UserID    int64      `gorm:"column:user_id"`
		Notes     *string    `gorm:"column:notes"`
		StartedAt time.Time  `gorm:"column:started_at"`
		EndedAt   *time.Time `gorm:"column:ended_at"`
	}
	// Look up session by ID and user_id, then verify it's a reading session
	if err := h.db.Table("enhanced_study_sessions").Where("id = ? AND user_id = ?", sessionID, userID).First(&row).Error; err != nil {
		return nil, err
	}

	// Parse notes and verify it's a reading session
	var cfg ReadingQuizConfig
	var seed int64
	var questions []ReadingQuestion

	if row.Notes == nil || len(*row.Notes) == 0 {
		return nil, fmt.Errorf("session has no notes")
	}

	var payload map[string]json.RawMessage
	if err := json.Unmarshal([]byte(*row.Notes), &payload); err != nil {
		return nil, fmt.Errorf("invalid session notes")
	}

	// Verify it's a reading session
	if _, ok := payload["reading_config"]; !ok {
		return nil, fmt.Errorf("not a reading session")
	}

	// Parse config and seed
	if b, ok := payload["reading_config"]; ok {
		if err := json.Unmarshal(b, &cfg); err != nil {
			return nil, fmt.Errorf("failed to parse reading config")
		}
	}
	if b, ok := payload["seed"]; ok {
		_ = json.Unmarshal(b, &seed)
	}

	// Always regenerate questions from config (simpler and more reliable)
	if seed != 0 {
		rand.Seed(seed)
	}
	var err error
	questions, err = h.generateReadingQuestions(userID, &cfg)
	if err != nil {
		return nil, err
	}

	// Assign ephemeral IDs to questions using index
	for i := range questions {
		questions[i].ID = int64(i + 1)
	}

	total := len(questions)
	return &ReadingQuizSession{
		ID:        sessionID,
		UserID:    userID,
		Config:    cfg,
		Questions: questions,
		StartedAt: row.StartedAt,
		EndedAt:   row.EndedAt,
		Total:     total,
	}, nil
}

// endReadingSession ends a reading quiz session
func (h *ReadingHandler) endReadingSession(sessionID int64, result *ReadingResult) error {
	// Update enhanced_study_sessions summary (ended_at, totals)
	return h.db.Table("enhanced_study_sessions").Where("id = ?", sessionID).Updates(map[string]any{
		"ended_at":        time.Now(),
		"total_correct":   result.CorrectCount,
		"total_incorrect": result.WrongCount,
	}).Error
}

// getReadingHistory gets user's reading quiz history
func (h *ReadingHandler) getReadingHistory(userID int64, limit int, offset int) ([]ReadingQuizSession, int64, error) {
	// Pull from enhanced_study_sessions filtered by session_type and notes containing reading_config
	var total int64
	if err := h.db.Table("enhanced_study_sessions").Where("user_id = ? AND session_type = ? AND notes LIKE ?", userID, "vocabulary_review", "%reading_config%").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []struct {
		ID             int64      `gorm:"column:id"`
		Notes          *string    `gorm:"column:notes"`
		StartedAt      time.Time  `gorm:"column:started_at"`
		EndedAt        *time.Time `gorm:"column:ended_at"`
		TotalCorrect   *int       `gorm:"column:total_correct"`
		TotalIncorrect *int       `gorm:"column:total_incorrect"`
	}
	if err := h.db.Table("enhanced_study_sessions").
		Where("user_id = ? AND session_type = ? AND notes LIKE ?", userID, "vocabulary_review", "%reading_config%").
		Order("started_at DESC").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	sessions := make([]ReadingQuizSession, 0, len(rows))
	for _, r := range rows {
		var cfg ReadingQuizConfig
		if r.Notes != nil && *r.Notes != "" {
			var payload map[string]json.RawMessage
			if err := json.Unmarshal([]byte(*r.Notes), &payload); err == nil {
				if b, ok := payload["reading_config"]; ok {
					_ = json.Unmarshal(b, &cfg)
				}
			}
		}
		sessions = append(sessions, ReadingQuizSession{
			ID:        r.ID,
			UserID:    userID,
			Config:    cfg,
			StartedAt: r.StartedAt,
			EndedAt:   r.EndedAt,
			Score:     r.TotalCorrect,
			Total: func() int {
				if r.TotalCorrect != nil && r.TotalIncorrect != nil {
					return *r.TotalCorrect + *r.TotalIncorrect
				}
				return 0
			}(),
		})
	}
	return sessions, total, nil
}

// updateReadingSRSProgress updates SRS progress based on reading quiz results
func (h *ReadingHandler) updateReadingSRSProgress(userID int64, result *ReadingResult) error {
	for _, questionResult := range result.Results {
		// Update SRS progress using existing function
		err := h.db.Exec(
			"SELECT update_srs_progress(?, ?, ?, ?)",
			userID,
			questionResult.ItemType,
			questionResult.ItemID,
			questionResult.IsCorrect,
		).Error

		if err != nil {
			return err
		}
	}

	return nil
}
