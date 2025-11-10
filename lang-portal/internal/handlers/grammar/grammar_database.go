package grammar

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"
)

// createGrammarSession creates a grammar quiz session in the database
func (h *GrammarHandler) createGrammarSession(session *GrammarQuizSession, seed int64) (int64, error) {
	// Create payload with config and seed (don't cache questions to avoid JSON issues)
	payload := map[string]interface{}{
		"grammar_config": session.Config,
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

// getGrammarSession gets a grammar quiz session by ID
func (h *GrammarHandler) getGrammarSession(sessionID int64, userID int64) (*GrammarQuizSession, error) {
	// Read config + seed from enhanced_study_sessions.notes
	var row struct {
		ID        int64      `gorm:"column:id"`
		UserID    int64      `gorm:"column:user_id"`
		Notes     *string    `gorm:"column:notes"`
		StartedAt time.Time  `gorm:"column:started_at"`
		EndedAt   *time.Time `gorm:"column:ended_at"`
	}
	// Look up session by ID and user_id, then verify it's a grammar session
	if err := h.db.Table("enhanced_study_sessions").Where("id = ? AND user_id = ?", sessionID, userID).First(&row).Error; err != nil {
		return nil, err
	}

	// Parse notes and verify it's a grammar session
	var cfg GrammarQuizConfig
	var seed int64
	var questions []GrammarQuestion

	if row.Notes == nil || len(*row.Notes) == 0 {
		return nil, fmt.Errorf("session has no notes")
	}

	var payload map[string]json.RawMessage
	if err := json.Unmarshal([]byte(*row.Notes), &payload); err != nil {
		return nil, fmt.Errorf("invalid session notes")
	}

	// Verify it's a grammar session
	if _, ok := payload["grammar_config"]; !ok {
		return nil, fmt.Errorf("not a grammar session")
	}

	// Parse config and seed
	if b, ok := payload["grammar_config"]; ok {
		if err := json.Unmarshal(b, &cfg); err != nil {
			return nil, fmt.Errorf("failed to parse grammar config")
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
	questions, err = h.generateGrammarQuestions(userID, &cfg)
	if err != nil {
		return nil, err
	}

	// Assign ephemeral IDs to questions using index
	for i := range questions {
		questions[i].ID = int64(i + 1)
	}

	total := len(questions)
	return &GrammarQuizSession{
		ID:        sessionID,
		UserID:    userID,
		Config:    cfg,
		Questions: questions,
		StartedAt: row.StartedAt,
		EndedAt:   row.EndedAt,
		Total:     total,
	}, nil
}

// endGrammarSession ends a grammar quiz session
func (h *GrammarHandler) endGrammarSession(sessionID int64, result *GrammarResult) error {
	// Update enhanced_study_sessions summary (ended_at, totals)
	return h.db.Table("enhanced_study_sessions").Where("id = ?", sessionID).Updates(map[string]any{
		"ended_at":        time.Now(),
		"total_correct":   result.CorrectCount,
		"total_incorrect": result.WrongCount,
	}).Error
}

// getGrammarHistory gets user's grammar quiz history
func (h *GrammarHandler) getGrammarHistory(userID int64, limit int, offset int) ([]GrammarQuizSession, int64, error) {
	// Pull from enhanced_study_sessions filtered by session_type and notes containing grammar_config
	var total int64
	if err := h.db.Table("enhanced_study_sessions").Where("user_id = ? AND session_type = ? AND notes LIKE ?", userID, "vocabulary_review", "%grammar_config%").Count(&total).Error; err != nil {
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
		Where("user_id = ? AND session_type = ? AND notes LIKE ?", userID, "vocabulary_review", "%grammar_config%").
		Order("started_at DESC").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	sessions := make([]GrammarQuizSession, 0, len(rows))
	for _, r := range rows {
		var cfg GrammarQuizConfig
		if r.Notes != nil && *r.Notes != "" {
			var payload map[string]json.RawMessage
			if err := json.Unmarshal([]byte(*r.Notes), &payload); err == nil {
				if b, ok := payload["grammar_config"]; ok {
					_ = json.Unmarshal(b, &cfg)
				}
			}
		}
		sessions = append(sessions, GrammarQuizSession{
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

// updateGrammarSRSProgress updates SRS progress based on grammar quiz results
func (h *GrammarHandler) updateGrammarSRSProgress(userID int64, result *GrammarResult) error {
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

