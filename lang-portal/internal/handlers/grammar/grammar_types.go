package grammar

import "time"

// GrammarQuestionType represents the type of grammar question
type GrammarQuestionType string

const (
	GrammarQuestionTypeChoice          GrammarQuestionType = "grammar_choice"
	GrammarQuestionTypePassage         GrammarQuestionType = "passage_grammar"
	GrammarQuestionTypeSentenceComposition GrammarQuestionType = "sentence_composition"
	GrammarQuestionTypeAll             GrammarQuestionType = "all"
)

// GrammarQuizConfig represents the complete grammar quiz configuration
type GrammarQuizConfig struct {
	Level                int                `json:"level"`                 // JLPT level (1-5)
	QuestionType         GrammarQuestionType `json:"question_type"`       // Specific type or "all"
	UseSRS               bool               `json:"use_srs"`             // If true, only show questions that need review (due items)
	QuestionCount        int                `json:"question_count"`      // Number of questions (1-100)
	TimeLimit            *int               `json:"time_limit"`          // seconds per question, nil for no limit
	ShuffleOptions       bool               `json:"shuffle_options"`     // Whether to shuffle multiple choice options
	RequiredCorrectCount *int               `json:"required_correct_count"` // How many correct answers needed for SRS progression (default: 3)
}

// GrammarQuestion represents a single grammar question
type GrammarQuestion struct {
	ID               int64    `json:"id"`
	QuestionID       int64    `json:"question_id"`       // FK to jlpt_questions
	QuestionType     string   `json:"question_type"`    // grammar_choice, passage_grammar, sentence_composition
	QuestionText     string   `json:"question_text"`     // Question with blank already included
	Answers          []string `json:"answers"`          // Array of answer options
	CorrectIndex     int      `json:"correct_index"`     // Index of correct answer in answers array
	Explanation      *string  `json:"explanation"`      // Explanation shown when wrong
	Level            int      `json:"level"`            // JLPT level from jlpt_questions
}

// GrammarQuizSession represents a grammar quiz session
type GrammarQuizSession struct {
	ID        int64              `json:"id"`
	UserID    int64              `json:"user_id"`
	Config    GrammarQuizConfig  `json:"config"`
	Questions []GrammarQuestion  `json:"questions"`
	StartedAt time.Time          `json:"started_at"`
	EndedAt   *time.Time         `json:"ended_at"`
	Score     *int               `json:"score"`
	Total     int                `json:"total"`
}

// GrammarAnswer represents a user's answer to a grammar question
type GrammarAnswer struct {
	QuestionID int64 `json:"question_id"` // ID from GrammarQuestion
	Answer     int   `json:"answer"`      // index of selected option
}

// GrammarSubmission represents a complete grammar quiz submission
type GrammarSubmission struct {
	SessionID int64           `json:"session_id"`
	Answers   []GrammarAnswer `json:"answers"`
}

// GrammarResult represents grammar quiz results
type GrammarResult struct {
	SessionID    int64            `json:"session_id"`
	Score        int              `json:"score"`
	Total        int              `json:"total"`
	Percentage   float64          `json:"percentage"`
	CorrectCount int              `json:"correct_count"`
	WrongCount   int              `json:"wrong_count"`
	Duration     int              `json:"duration"` // seconds
	Results      []QuestionResult  `json:"results"`
}

// QuestionResult represents individual question results
type QuestionResult struct {
	QuestionID   int64  `json:"question_id"`
	ItemID       int64  `json:"item_id"`       // ID from jlpt_grammar_questions table
	ItemType     string `json:"item_type"`     // Always "grammar"
	UserAnswer   int    `json:"user_answer"`   // Selected option index
	CorrectIndex int    `json:"correct_index"` // Correct option index
	IsCorrect    bool   `json:"is_correct"`
}

// Note: GrammarPoint, GrammarPointDetail, GrammarExample, GrammarDetails, and GrammarReading
// are defined in internal/repositories/grammar_store.go to avoid import cycles.
// Import them from repositories when needed.

