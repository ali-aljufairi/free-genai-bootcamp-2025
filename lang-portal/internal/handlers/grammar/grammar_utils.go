package grammar

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gofiber/fiber/v2"
)

// getUserID gets user ID from context - requires authentication
func (h *GrammarHandler) getUserID(c *fiber.Ctx) (int64, error) {
	// Get user ID from context (set by auth middleware)
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return 0, fmt.Errorf("user not authenticated")
	}

	userID, ok := userIDInterface.(int64)
	if !ok || userID == 0 {
		return 0, fmt.Errorf("invalid user ID in context")
	}

	return userID, nil
}

// shuffleGrammarOptions randomizes options and returns new slice and new correct index
func shuffleGrammarOptions(answers []string, correctIndex int) ([]string, int) {
	rand.Seed(time.Now().UnixNano())
	// Pair answer with original index
	type pair struct {
		answer     string
		wasCorrect bool
	}
	pairs := make([]pair, len(answers))
	for i, a := range answers {
		pairs[i] = pair{answer: a, wasCorrect: i == correctIndex}
	}
	rand.Shuffle(len(pairs), func(i, j int) { pairs[i], pairs[j] = pairs[j], pairs[i] })
	newAnswers := make([]string, len(answers))
	newCorrect := 0
	for i, p := range pairs {
		newAnswers[i] = p.answer
		if p.wasCorrect {
			newCorrect = i
		}
	}
	return newAnswers, newCorrect
}

// validateGrammarConfig validates grammar quiz configuration
func (h *GrammarHandler) validateGrammarConfig(config *GrammarQuizConfig) error {
	// Validate level
	if config.Level < 1 || config.Level > 5 {
		return fmt.Errorf("invalid JLPT level: must be between 1 and 5")
	}

	// Validate question count
	if config.QuestionCount < 1 || config.QuestionCount > 100 {
		return fmt.Errorf("invalid question count: must be between 1 and 100")
	}

	// Validate question type
	if config.QuestionType != GrammarQuestionTypeAll &&
		config.QuestionType != GrammarQuestionTypeChoice &&
		config.QuestionType != GrammarQuestionTypePassage &&
		config.QuestionType != GrammarQuestionTypeSentenceComposition {
		return fmt.Errorf("invalid question type")
	}

	// use_srs is a boolean, no validation needed

	// Validate time limit if provided
	if config.TimeLimit != nil && *config.TimeLimit < 0 {
		return fmt.Errorf("invalid time limit: must be non-negative")
	}

	return nil
}

