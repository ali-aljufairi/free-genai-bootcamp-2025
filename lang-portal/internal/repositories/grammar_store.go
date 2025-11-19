package repositories

import (
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
)

type GrammarStore struct {
	DB *gorm.DB
}

func NewGrammarStore(db *gorm.DB) *GrammarStore {
	return &GrammarStore{DB: db}
}

// GetUserJLPTLevel gets the user's current JLPT level from user_settings
func (s *GrammarStore) GetUserJLPTLevel(userID int64) (int, error) {
	var level *int
	err := s.DB.Table("user_settings").
		Select("current_jlpt_level").
		Where("user_id = ?", userID).
		Scan(&level).Error

	if err != nil {
		return 5, err // Default to N5 if error or not found
	}

	if level == nil {
		return 5, nil // Default to N5
	}

	return *level, nil
}

// GetGrammarLevelsForUser returns an array of grammar level strings (e.g., ["N5", "N4"]) based on user's JLPT level
// If user is level 4, returns ["N4", "N5"]
func (s *GrammarStore) GetGrammarLevelsForUser(userID int64) ([]string, error) {
	userLevel, err := s.GetUserJLPTLevel(userID)
	if err != nil {
		userLevel = 5 // Default to N5
	}

	// Map integer level to grammar level strings
	// Level 5 → ["N5"], Level 4 → ["N4", "N5"], etc.
	allLevels := []string{"N5", "N4", "N3", "N2", "N1"}
	startIndex := 5 - userLevel
	if startIndex < 0 {
		startIndex = 0
	}
	if startIndex >= len(allLevels) {
		startIndex = len(allLevels) - 1
	}

	return allLevels[startIndex:], nil
}

// GrammarPoint represents a grammar point for browsing
type GrammarPoint struct {
	ID        int64   `json:"id"`
	Key       string  `json:"key"`
	BaseForm  string  `json:"base_form"`
	Level     string  `json:"level"`
	Structure *string `json:"structure"`
}

// GrammarPointDetail represents a full grammar point with all related data
type GrammarPointDetail struct {
	GrammarPoint
	Examples []GrammarExample `json:"examples"`
	Details  *GrammarDetails  `json:"details"`
	Readings []GrammarReading `json:"readings"`
}

// GrammarExample represents an example sentence for a grammar point
type GrammarExample struct {
	ID       int64  `json:"id"`
	Japanese string `json:"japanese"`
	English  string `json:"english"`
}

// GrammarDetails represents detailed information about a grammar point
type GrammarDetails struct {
	Meaning *string  `json:"meaning"`
	Notes   *string  `json:"notes"`
	Caution []string `json:"caution"`
	FunFact *string  `json:"fun_fact"`
}

// GrammarReading represents furigana reading information
type GrammarReading struct {
	Kanji    string `json:"kanji"`
	Reading  string `json:"reading"`
	Position int    `json:"position"`
}

// ListGrammarPoints lists grammar points for user's JLPT level (and below)
func (s *GrammarStore) ListGrammarPoints(userID int64) ([]GrammarPoint, error) {
	levels, err := s.GetGrammarLevelsForUser(userID)
	if err != nil {
		return nil, err
	}

	var grammarPoints []GrammarPoint

	// Build query with level filter
	query := s.DB.Table("grammar_points").
		Select("id, key, base_form, level, structure").
		Where("level IN ?", levels).
		Order("CASE level WHEN 'N5' THEN 5 WHEN 'N4' THEN 4 WHEN 'N3' THEN 3 WHEN 'N2' THEN 2 WHEN 'N1' THEN 1 END DESC, key")

	err = query.Find(&grammarPoints).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list grammar points: %w", err)
	}

	return grammarPoints, nil
}

// CheckGrammarLearnedStatus checks if a grammar point is already learned by the user
func (s *GrammarStore) CheckGrammarLearnedStatus(userID int64, grammarID int64) (bool, error) {
	var count int64
	err := s.DB.Table("progress").
		Where("user_id = ? AND item_type = 'grammar' AND item_id = ?", userID, grammarID).
		Count(&count).Error

	if err != nil {
		return false, fmt.Errorf("failed to check grammar learned status: %w", err)
	}

	return count > 0, nil
}

// GetGrammarPointDetail gets a full grammar point with all related data
func (s *GrammarStore) GetGrammarPointDetail(grammarID int64) (*GrammarPointDetail, error) {
	// Get base grammar point
	var gp GrammarPoint
	err := s.DB.Table("grammar_points").
		Select("id, key, base_form, level, structure").
		Where("id = ?", grammarID).
		First(&gp).Error

	if err != nil {
		return nil, fmt.Errorf("grammar point not found: %w", err)
	}

	// Get examples
	var examples []GrammarExample
	err = s.DB.Table("grammar_examples").
		Select("id, japanese, english").
		Where("grammar_id = ?", grammarID).
		Order("id").
		Find(&examples).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get examples: %w", err)
	}

	// Get details
	var details *GrammarDetails
	var detailRow struct {
		Meaning *string
		Notes   *string
		Caution *string // JSON array stored as text
		FunFact *string
	}

	err = s.DB.Table("grammar_details").
		Select("meaning, notes, caution, fun_fact").
		Where("grammar_id = ?", grammarID).
		First(&detailRow).Error

	if err == nil {
		// Parse caution JSON array
		var caution []string
		if detailRow.Caution != nil && *detailRow.Caution != "" {
			if err := json.Unmarshal([]byte(*detailRow.Caution), &caution); err != nil {
				// If parsing fails, try treating as single string
				caution = []string{*detailRow.Caution}
			}
		}

		details = &GrammarDetails{
			Meaning: detailRow.Meaning,
			Notes:   detailRow.Notes,
			Caution: caution,
			FunFact: detailRow.FunFact,
		}
	}
	// If no details found, details remains nil (not an error)

	// Get readings
	var readings []GrammarReading
	err = s.DB.Table("grammar_readings").
		Select("kanji, reading, position").
		Where("grammar_id = ?", grammarID).
		Order("position").
		Find(&readings).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get readings: %w", err)
	}

	result := &GrammarPointDetail{
		GrammarPoint: gp,
		Examples:     examples,
		Details:      details,
		Readings:     readings,
	}

	return result, nil
}

// RecentGrammarProgress represents recently studied grammar for chat context
type RecentGrammarProgress struct {
	GrammarPoint
	LastSeen   string `json:"last_seen"`
	CorrectCnt int    `json:"correct_cnt"`
	SeenCnt    int    `json:"seen_cnt"`
}

// GetRecentGrammarProgress gets user's recently studied grammar points for chat context
func (s *GrammarStore) GetRecentGrammarProgress(userID int64, limit int) ([]RecentGrammarProgress, error) {
	var results []RecentGrammarProgress

	// Get recently studied grammar points from progress table
	err := s.DB.Table("progress").
		Select(`
			grammar_points.id,
			grammar_points.key,
			grammar_points.base_form,
			grammar_points.level,
			grammar_points.structure,
			progress.last_seen,
			progress.correct_cnt,
			progress.seen_cnt
		`).
		Joins("JOIN grammar_points ON progress.item_id = grammar_points.id").
		Where("progress.user_id = ? AND progress.item_type = 'grammar'", userID).
		Where("progress.last_seen IS NOT NULL").
		Order("progress.last_seen DESC").
		Limit(limit).
		Find(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get recent grammar progress: %w", err)
	}

	return results, nil
}

// MarkGrammarAsLearned marks a grammar point as learned and adds it to SRS
func (s *GrammarStore) MarkGrammarAsLearned(userID int64, grammarID int64) error {
	// Use the existing update_srs_progress function to mark as learned
	// Passing correct=true will create/update the progress entry with initial interval
	err := s.DB.Exec(
		"SELECT update_srs_progress(?, ?, ?, ?)",
		userID,
		"grammar",
		grammarID,
		true, // Mark as correct/learned
	).Error

	if err != nil {
		return fmt.Errorf("failed to mark grammar as learned: %w", err)
	}

	return nil
}
