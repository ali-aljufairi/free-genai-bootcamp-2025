package grammar

import (
	"encoding/json"
)

// generateGrammarQuestions generates grammar questions based on configuration
func (h *GrammarHandler) generateGrammarQuestions(userID int64, config *GrammarQuizConfig) ([]GrammarQuestion, error) {
	var questions []GrammarQuestion
	var err error

	if config.UseSRS {
		// Only show questions that need review (due items or not answered correctly enough times)
		questions, err = h.generateSRSGrammarQuestions(userID, config)
	} else {
		// Show questions filtered by JLPT level, excluding those already mastered
		questions, err = h.generateJLPTGrammarQuestions(userID, config)
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

// generateJLPTGrammarQuestions generates grammar questions from JLPT level
// Excludes questions that have been answered correctly enough times (based on required_correct_count)
func (h *GrammarHandler) generateJLPTGrammarQuestions(userID int64, config *GrammarQuizConfig) ([]GrammarQuestion, error) {
	var questions []GrammarQuestion

	requiredCorrectCount := 3 // Default
	if config.RequiredCorrectCount != nil {
		requiredCorrectCount = *config.RequiredCorrectCount
	}

	// Build query to join jlpt_grammar_questions with jlpt_questions
	// Exclude questions that have been answered correctly enough times
	query := h.db.Table("jlpt_grammar_questions").
		Select(`
			jlpt_grammar_questions.id,
			jlpt_grammar_questions.question_id,
			jlpt_grammar_questions.question_type,
			jlpt_grammar_questions.question_text,
			jlpt_grammar_questions.answers,
			jlpt_grammar_questions.correct_answer_index,
			jlpt_grammar_questions.explanation,
			jlpt_questions.level
		`).
		Joins("JOIN jlpt_questions ON jlpt_grammar_questions.question_id = jlpt_questions.id").
		Joins("LEFT JOIN progress p ON jlpt_grammar_questions.id = p.item_id AND p.user_id = ? AND p.item_type = 'grammar'", userID).
		Where("jlpt_questions.level = ?", config.Level).
		// Exclude questions that have been answered correctly enough times
		Where("p.correct_cnt IS NULL OR p.correct_cnt < ?", requiredCorrectCount)

	// Filter by question type if not "all"
	if config.QuestionType != GrammarQuestionTypeAll {
		query = query.Where("jlpt_grammar_questions.question_type = ?", string(config.QuestionType))
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
		Answers            string  `gorm:"column:answers"` // JSONB as string
		CorrectAnswerIndex int     `gorm:"column:correct_answer_index"`
		Explanation        *string `gorm:"column:explanation"`
		Level              int     `gorm:"column:level"`
	}

	err := query.Order("RANDOM()").Limit(limit).Find(&rows).Error
	if err != nil {
		return nil, err
	}

	// Convert rows to GrammarQuestion structs
	for _, row := range rows {
		// Parse answers JSONB array
		var answers []string
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			// Skip questions with invalid answers
			continue
		}

		question := GrammarQuestion{
			ID:           row.ID,
			QuestionID:   row.QuestionID,
			QuestionType: row.QuestionType,
			QuestionText: row.QuestionText,
			Answers:      answers,
			CorrectIndex: row.CorrectAnswerIndex,
			Explanation:  row.Explanation,
			Level:        row.Level,
		}

		questions = append(questions, question)
	}

	return questions, nil
}

// generateSRSGrammarQuestions generates grammar questions from SRS due items
func (h *GrammarHandler) generateSRSGrammarQuestions(userID int64, config *GrammarQuizConfig) ([]GrammarQuestion, error) {
	var questions []GrammarQuestion

	// Get SRS due items for grammar
	var progressItems []struct {
		ItemID int64 `gorm:"column:item_id"`
	}

	query := h.db.Table("progress").
		Select("item_id").
		Where("user_id = ? AND item_type = 'grammar' AND next_due <= NOW()", userID)

	err := query.Order("next_due").
		Limit(config.QuestionCount * 2).
		Find(&progressItems).Error

	if err != nil {
		return nil, err
	}

	// Get grammar questions for these item IDs
	if len(progressItems) == 0 {
		return questions, nil
	}

	var itemIDs []int64
	for _, item := range progressItems {
		itemIDs = append(itemIDs, item.ItemID)
	}

	// Build query to get grammar questions
	dbQuery := h.db.Table("jlpt_grammar_questions").
		Select(`
			jlpt_grammar_questions.id,
			jlpt_grammar_questions.question_id,
			jlpt_grammar_questions.question_type,
			jlpt_grammar_questions.question_text,
			jlpt_grammar_questions.answers,
			jlpt_grammar_questions.correct_answer_index,
			jlpt_grammar_questions.explanation,
			jlpt_questions.level
		`).
		Joins("JOIN jlpt_questions ON jlpt_grammar_questions.question_id = jlpt_questions.id").
		Where("jlpt_grammar_questions.id IN (?)", itemIDs)

	// Filter by question type if not "all"
	if config.QuestionType != GrammarQuestionTypeAll {
		dbQuery = dbQuery.Where("jlpt_grammar_questions.question_type = ?", string(config.QuestionType))
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
		Answers            string  `gorm:"column:answers"` // JSONB as string
		CorrectAnswerIndex int     `gorm:"column:correct_answer_index"`
		Explanation        *string `gorm:"column:explanation"`
		Level              int     `gorm:"column:level"`
	}

	err = dbQuery.Order("RANDOM()").Find(&rows).Error
	if err != nil {
		return nil, err
	}

	// Convert rows to GrammarQuestion structs
	for _, row := range rows {
		// Parse answers JSONB array
		var answers []string
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			// Skip questions with invalid answers
			continue
		}

		question := GrammarQuestion{
			ID:           row.ID,
			QuestionID:   row.QuestionID,
			QuestionType: row.QuestionType,
			QuestionText: row.QuestionText,
			Answers:      answers,
			CorrectIndex: row.CorrectAnswerIndex,
			Explanation:  row.Explanation,
			Level:        row.Level,
		}

		questions = append(questions, question)
	}

	return questions, nil
}
