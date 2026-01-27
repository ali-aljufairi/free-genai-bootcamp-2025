package reading

import "time"

// ReadingQuestionType represents the type of reading question
type ReadingQuestionType string

const (
	ReadingQuestionTypeInformationSearch ReadingQuestionType = "information_search"
	ReadingQuestionTypeLongPassage       ReadingQuestionType = "long_passage"
	ReadingQuestionTypeMediumPassage     ReadingQuestionType = "medium_passage"
	ReadingQuestionTypeComprehensive     ReadingQuestionType = "reading_comprehensive"
	ReadingQuestionTypeTopic             ReadingQuestionType = "reading_topic"
	ReadingQuestionTypeShortPassage      ReadingQuestionType = "short_passage"
	ReadingQuestionTypeAll               ReadingQuestionType = "all"
)

// ReadingQuizConfig represents the complete reading quiz configuration
type ReadingQuizConfig struct {
	Level                int                `json:"level"`                 // JLPT level (1-5)
	QuestionType         ReadingQuestionType `json:"question_type"`       // Specific type or "all"
	UseSRS               bool               `json:"use_srs"`             // If true, only show questions that need review (due items)
	QuestionCount        int                `json:"question_count"`        // Number of questions (1-100)
	TimeLimit            *int               `json:"time_limit"`           // seconds per question, nil for no limit
	ShuffleOptions       bool               `json:"shuffle_options"`       // Whether to shuffle multiple choice options
	RequiredCorrectCount *int               `json:"required_correct_count"` // How many correct answers needed for SRS progression (default: 3)
}

// ReadingQuestion represents a single reading question
type ReadingQuestion struct {
	ID           int64    `json:"id"`
	QuestionID  int64    `json:"question_id"`  // FK to jlpt_questions
	QuestionType string   `json:"question_type"` // information_search, long_passage, medium_passage, etc.
	QuestionText string   `json:"question_text"` // Question text
	Passage      *string  `json:"passage,omitempty"` // Reading passage
	Answers      []string `json:"answers"`       // Array of answer options
	CorrectIndex int      `json:"correct_index"`  // Index of correct answer in answers array
	Explanation  *string  `json:"explanation"`  // Explanation shown when wrong
	Level        int      `json:"level"`        // JLPT level from jlpt_questions
}

// ReadingQuizSession represents a reading quiz session
type ReadingQuizSession struct {
	ID        int64              `json:"id"`
	UserID    int64              `json:"user_id"`
	Config    ReadingQuizConfig  `json:"config"`
	Questions []ReadingQuestion  `json:"questions"`
	StartedAt time.Time          `json:"started_at"`
	EndedAt   *time.Time         `json:"ended_at"`
	Score     *int               `json:"score"`
	Total     int                `json:"total"`
}

// ReadingAnswer represents a user's answer to a reading question
type ReadingAnswer struct {
	QuestionID int64 `json:"question_id"` // ID from ReadingQuestion
	Answer     int   `json:"answer"`      // index of selected option
}

// ReadingSubmission represents a complete reading quiz submission
type ReadingSubmission struct {
	SessionID int64           `json:"session_id"`
	Answers   []ReadingAnswer `json:"answers"`
}

// ReadingResult represents reading quiz results
type ReadingResult struct {
	SessionID    int64            `json:"session_id"`
	Score        int               `json:"score"`
	Total        int               `json:"total"`
	Percentage   float64           `json:"percentage"`
	CorrectCount int               `json:"correct_count"`
	WrongCount   int               `json:"wrong_count"`
	Duration     int               `json:"duration"` // seconds
	Results      []QuestionResult  `json:"results"`
}

// QuestionResult represents individual question results
type QuestionResult struct {
	QuestionID   int64  `json:"question_id"`
	ItemID       int64  `json:"item_id"`       // ID from jlpt_reading_questions table
	ItemType     string `json:"item_type"`     // Always "reading"
	UserAnswer   int    `json:"user_answer"`    // Selected option index
	CorrectIndex int    `json:"correct_index"`  // Correct option index
	IsCorrect    bool   `json:"is_correct"`
}
