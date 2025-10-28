package flashcard

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"lang-portal/internal/database/models"

	"gorm.io/gorm"
)

// createFlashcardSession creates a flashcard session in the database
func (h *FlashcardHandler) createFlashcardSession(session *FlashcardSession, seed int64) (int64, error) {
	// Create payload with config and seed for deterministic regeneration
	payload := map[string]interface{}{
		"flashcard_config": session.Config,
		"seed":             seed,
		"card_count":       len(session.Cards),
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Determine session type based on flashcard type
	sessionType := "vocabulary_review"
	if session.Config.FlashcardType == FlashcardTypeKanji {
		sessionType = "kanji_study"
	}

	// Insert session into enhanced_study_sessions
	var sessionID int64
	err = h.db.Raw(`
		INSERT INTO enhanced_study_sessions 
		(user_id, session_type, notes, created_at, started_at) 
		VALUES (?, ?, ?, NOW(), ?)
		RETURNING id
	`, session.UserID, sessionType, string(payloadJSON), session.StartedAt).Scan(&sessionID).Error

	if err != nil {
		return 0, fmt.Errorf("failed to create session: %w", err)
	}

	// Assign ephemeral IDs to cards using index (not stored). Client will return positions.
	for i := range session.Cards {
		session.Cards[i].ID = int64(i + 1)
	}

	return sessionID, nil
}

// getFlashcardSession gets a flashcard session by ID
func (h *FlashcardHandler) getFlashcardSession(sessionID int64, userID int64) (*FlashcardSession, error) {
	// Read config + seed from enhanced_study_sessions.notes
	var row struct {
		ID        int64      `gorm:"column:id"`
		UserID    int64      `gorm:"column:user_id"`
		Notes     *string    `gorm:"column:notes"`
		StartedAt time.Time  `gorm:"column:started_at"`
		EndedAt   *time.Time `gorm:"column:ended_at"`
	}
	if err := h.db.Table("enhanced_study_sessions").Where("id = ? AND user_id = ?", sessionID, userID).First(&row).Error; err != nil {
		return nil, err
	}

	var cfg FlashcardConfig
	var seed int64
	if row.Notes != nil && *row.Notes != "" {
		var payload map[string]json.RawMessage
		if err := json.Unmarshal([]byte(*row.Notes), &payload); err == nil {
			if b, ok := payload["flashcard_config"]; ok {
				_ = json.Unmarshal(b, &cfg)
			}
			if b, ok := payload["seed"]; ok {
				_ = json.Unmarshal(b, &seed)
			}
		}
	}

	// Regenerate cards deterministically using the same config and seed
	if seed != 0 {
		rand.Seed(seed)
	}
	cards, err := h.generateFlashcards(userID, &cfg)
	if err != nil {
		return nil, err
	}
	for i := range cards {
		cards[i].ID = int64(i + 1)
	}

	total := len(cards)
	return &FlashcardSession{
		ID:        sessionID,
		UserID:    userID,
		Config:    cfg,
		Cards:     cards,
		StartedAt: row.StartedAt,
		EndedAt:   row.EndedAt,
		Total:     total,
	}, nil
}

// endFlashcardSession ends a flashcard session
func (h *FlashcardHandler) endFlashcardSession(sessionID int64, result *FlashcardResult) error {
	// Update enhanced_study_sessions summary (ended_at, totals)
	return h.db.Table("enhanced_study_sessions").Where("id = ?", sessionID).Updates(map[string]any{
		"ended_at":        time.Now(),
		"total_correct":   result.CorrectCount,
		"total_incorrect": result.WrongCount,
	}).Error
}

// getFlashcardHistory gets user's flashcard history
func (h *FlashcardHandler) getFlashcardHistory(userID int64, limit int, offset int) ([]FlashcardSession, int64, error) {
	// Pull from enhanced_study_sessions filtered by session_type
	var total int64
	if err := h.db.Table("enhanced_study_sessions").Where("user_id = ? AND session_type IN ('vocabulary_review','kanji_study')", userID).Count(&total).Error; err != nil {
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
		Where("user_id = ? AND session_type IN ('vocabulary_review','kanji_study')", userID).
		Order("started_at DESC").Limit(limit).Offset(offset).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	sessions := make([]FlashcardSession, 0, len(rows))
	for _, r := range rows {
		var cfg FlashcardConfig
		if r.Notes != nil && *r.Notes != "" {
			var payload map[string]json.RawMessage
			if err := json.Unmarshal([]byte(*r.Notes), &payload); err == nil {
				if b, ok := payload["flashcard_config"]; ok {
					_ = json.Unmarshal(b, &cfg)
				}
			}
		}
		sessions = append(sessions, FlashcardSession{
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

// updateSRSProgress updates SRS progress based on flashcard results
func (h *FlashcardHandler) updateSRSProgress(userID int64, result *FlashcardResult) error {
	for _, cardResult := range result.Results {
		// Update SRS progress using existing function
		err := h.db.Exec(
			"SELECT update_srs_progress(?, ?, ?, ?)",
			userID,
			cardResult.ItemType,
			cardResult.ItemID,
			cardResult.IsCorrect,
		).Error

		if err != nil {
			return err
		}

		// Update correct_count in words table if it's a word
		if cardResult.ItemType == "word" {
			correctIncrement := 0
			if cardResult.IsCorrect {
				correctIncrement = 1
			}
			err = h.db.Model(&models.Word{}).Where("id = ?", cardResult.ItemID).Update("correct_count", gorm.Expr("correct_count + ?", correctIncrement)).Error

			if err != nil {
				return err
			}
		}
	}

	return nil
}

// checkUnitCompletion checks if a unit is completed
func (h *FlashcardHandler) checkUnitCompletion(userID int64, unitID int, requiredCorrectCount int) error {
	// Check if all words in unit have been correctly answered the required number of times
	var incompleteWords int64
	err := h.db.Raw(`
		SELECT COUNT(*) FROM unit_items ui
		LEFT JOIN progress p ON ui.item_type = p.item_type AND ui.item_id = p.item_id AND p.user_id = ?
		WHERE ui.unit_id = ? AND ui.item_type = 'word'
		AND (p.correct_cnt IS NULL OR p.correct_cnt < ?)
	`, userID, unitID, requiredCorrectCount).Scan(&incompleteWords).Error

	if err != nil {
		return err
	}

	// If no incomplete words, mark unit as completed
	if incompleteWords == 0 {
		err = h.db.Exec(`
			INSERT INTO user_course_progress (user_id, unit_id, completion_percentage, completed_at)
			VALUES (?, ?, 100, NOW())
			ON CONFLICT (user_id, unit_id) DO UPDATE SET
			completion_percentage = 100,
			completed_at = NOW()
		`, userID, unitID).Error

		return err
	}

	return nil
}
