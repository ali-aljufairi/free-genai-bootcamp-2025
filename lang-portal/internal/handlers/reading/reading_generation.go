package reading

import (
	"encoding/json"
)

// generateReadingQuestions generates reading questions based on configuration
func (h *ReadingHandler) generateReadingQuestions(userID int64, config *ReadingQuizConfig) ([]ReadingQuestion, error) {
	var questions []ReadingQuestion
	var err error

	if config.UseSRS {
		// Only show questions that need review (due items or not answered correctly enough times)
		questions, err = h.generateSRSReadingQuestions(userID, config)
	} else {
		// Show questions filtered by JLPT level, excluding those already mastered
		questions, err = h.generateJLPTReadingQuestions(userID, config)
	}

	if err != nil {
		return nil, err
	}

	// Limit questions to requested count
	if len(questions) > config.QuestionCount {
		questions = questions[:config.QuestionCount]
	}

	return questions, nil
}

// generateJLPTReadingQuestions generates reading questions from JLPT level
// Excludes questions that have been answered correctly enough times (based on required_correct_count)
func (h *ReadingHandler) generateJLPTReadingQuestions(userID int64, config *ReadingQuizConfig) ([]ReadingQuestion, error) {
	var questions []ReadingQuestion

	requiredCorrectCount := 3 // Default
	if config.RequiredCorrectCount != nil {
		requiredCorrectCount = *config.RequiredCorrectCount
	}

	query := h.db.Table("jlpt_reading_questions").
		Select(`
			jlpt_reading_questions.id,
			jlpt_reading_questions.question_id,
			jlpt_reading_questions.question_type,
			jlpt_reading_questions.question_text,
			jlpt_reading_questions.passage,
			jlpt_reading_questions.answers,
			jlpt_reading_questions.correct_answer_index,
			COALESCE(
				NULLIF(jlpt_reading_questions.explanations->>'en', ''),
				jlpt_reading_questions.explanation
			) AS explanation,
			jlpt_questions.level
		`).
		Joins("JOIN jlpt_questions ON jlpt_reading_questions.question_id = jlpt_questions.id").
		Joins("LEFT JOIN progress p ON jlpt_reading_questions.id = p.item_id AND p.user_id = ? AND p.item_type = 'reading'", userID).
		Where("jlpt_questions.level = ?", config.Level).
		Where("jlpt_questions.tag = ?", "read").
		Where("p.correct_cnt IS NULL OR p.correct_cnt < ?", requiredCorrectCount)

	// Filter by question type if not "all"
	if config.QuestionType != ReadingQuestionTypeAll {
		query = query.Where("jlpt_reading_questions.question_type = ?", string(config.QuestionType))
	}

	// Get more questions than needed to have options
	limit := config.QuestionCount * 2
	if limit > 100 {
		limit = 100
	}

	var rows []struct {
		ID                 int64   `gorm:"column:id"`
		QuestionID         int64   `gorm:"column:question_id"`
		QuestionType       string  `gorm:"column:question_type"`
		QuestionText       string  `gorm:"column:question_text"`
		Passage            *string `gorm:"column:passage"`
		Answers            string  `gorm:"column:answers"` // JSONB as string
		CorrectAnswerIndex int     `gorm:"column:correct_answer_index"`
		Explanation        *string `gorm:"column:explanation"`
		Level              int     `gorm:"column:level"`
	}

	err := query.Order("RANDOM()").Limit(limit).Find(&rows).Error
	if err != nil {
		return nil, err
	}

	// Convert rows to ReadingQuestion structs
	for _, row := range rows {
		// Parse answers JSONB array
		var answers []string
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			// Skip questions with invalid answers
			continue
		}

		question := ReadingQuestion{
			ID:           row.ID,
			QuestionID:   row.QuestionID,
			QuestionType: row.QuestionType,
			QuestionText: row.QuestionText,
			Passage:      row.Passage,
			Answers:      answers,
			CorrectIndex: row.CorrectAnswerIndex,
			Explanation:  row.Explanation,
			Level:        row.Level,
		}

		questions = append(questions, question)
	}

	return questions, nil
}

// generateSRSReadingQuestions generates reading questions from SRS due items
func (h *ReadingHandler) generateSRSReadingQuestions(userID int64, config *ReadingQuizConfig) ([]ReadingQuestion, error) {
	var questions []ReadingQuestion

	// Get SRS due items for reading
	var progressItems []struct {
		ItemID int64 `gorm:"column:item_id"`
	}

	query := h.db.Table("progress").
		Select("item_id").
		Where("user_id = ? AND item_type = 'reading' AND next_due <= NOW()", userID)

	err := query.Order("next_due").
		Limit(config.QuestionCount * 2).
		Find(&progressItems).Error

	if err != nil {
		return nil, err
	}

	// Get reading questions for these item IDs
	if len(progressItems) == 0 {
		return questions, nil
	}

	var itemIDs []int64
	for _, item := range progressItems {
		itemIDs = append(itemIDs, item.ItemID)
	}

	// Build query to get reading questions
	// CRITICAL: Filter by tag='read' to ensure we only get reading questions
	dbQuery := h.db.Table("jlpt_reading_questions").
		Select(`
			jlpt_reading_questions.id,
			jlpt_reading_questions.question_id,
			jlpt_reading_questions.question_type,
			jlpt_reading_questions.question_text,
			jlpt_reading_questions.passage,
			jlpt_reading_questions.answers,
			jlpt_reading_questions.correct_answer_index,
			COALESCE(
				NULLIF(jlpt_reading_questions.explanations->>'en', ''),
				jlpt_reading_questions.explanation
			) AS explanation,
			jlpt_questions.level
		`).
		Joins("JOIN jlpt_questions ON jlpt_reading_questions.question_id = jlpt_questions.id").
		Where("jlpt_reading_questions.id IN (?)", itemIDs).
		Where("jlpt_questions.tag = ?", "read") // Ensure only reading questions are returned

	// Filter by question type if not "all"
	if config.QuestionType != ReadingQuestionTypeAll {
		dbQuery = dbQuery.Where("jlpt_reading_questions.question_type = ?", string(config.QuestionType))
	}

	// Filter by level if specified
	if config.Level > 0 {
		dbQuery = dbQuery.Where("jlpt_questions.level = ?", config.Level)
	}

	var rows []struct {
		ID                 int64   `gorm:"column:id"`
		QuestionID         int64   `gorm:"column:question_id"`
		QuestionType       string  `gorm:"column:question_type"`
		QuestionText       string  `gorm:"column:question_text"`
		Passage            *string `gorm:"column:passage"`
		Answers            string  `gorm:"column:answers"` // JSONB as string
		CorrectAnswerIndex int     `gorm:"column:correct_answer_index"`
		Explanation        *string `gorm:"column:explanation"`
		Level              int     `gorm:"column:level"`
	}

	err = dbQuery.Order("RANDOM()").Find(&rows).Error
	if err != nil {
		return nil, err
	}

	// Convert rows to ReadingQuestion structs
	for _, row := range rows {
		// Parse answers JSONB array
		var answers []string
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			// Skip questions with invalid answers
			continue
		}

		question := ReadingQuestion{
			ID:           row.ID,
			QuestionID:   row.QuestionID,
			QuestionType: row.QuestionType,
			QuestionText: row.QuestionText,
			Passage:      row.Passage,
			Answers:      answers,
			CorrectIndex: row.CorrectAnswerIndex,
			Explanation:  row.Explanation,
			Level:        row.Level,
		}

		questions = append(questions, question)
	}

	return questions, nil
}
