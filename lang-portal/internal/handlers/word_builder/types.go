package word_builder

import "time"

// LearningActivity represents the learning_activities table structure
type LearningActivity struct {
	ID               int64                  `gorm:"primaryKey"`
	UserID           int64                  `gorm:"column:user_id"`
	ActivityType     string                 `gorm:"column:activity_type"`
	ContentType      string                 `gorm:"column:content_type"`
	JLPTLevel        *int                   `gorm:"column:jlpt_level"`
	ItemIDs          []int64                `gorm:"column:item_ids;type:integer[]"`
	ItemCount        int                    `gorm:"column:item_count"`
	CorrectCount     int                    `gorm:"column:correct_count"`
	TotalTimeSeconds int                    `gorm:"column:total_time_seconds"`
	StartedAt        time.Time              `gorm:"column:started_at"`
	CompletedAt      *time.Time             `gorm:"column:completed_at"`
	Config           map[string]interface{} `gorm:"column:config;type:jsonb"`
}

func (LearningActivity) TableName() string {
	return "learning_activities"
}

// ValidWord represents a valid word that can be formed from kanji
type ValidWord struct {
	Kanji    string  `json:"kanji"`
	Kana     string  `json:"kana"`
	English  string  `json:"english"`
	WordID   int64   `json:"word_id"`
	KanjiIDs []int64 `json:"kanji_ids"`
}

// KanjiData represents kanji information
type KanjiData struct {
	ID        int64    `json:"id"`
	Character string   `json:"character"`
	Onyomi    *string  `json:"onyomi"`
	Kunyomi   *string  `json:"kunyomi"`
	Meanings  []string `json:"meanings"`
	JLPT      *int     `json:"jlpt"`
}

// StartSessionRequest represents the request to start a word builder session
type StartSessionRequest struct {
	JLPTLevel int `json:"jlpt_level"`
	TimeLimit int `json:"time_limit"` // in seconds
}

// StartSessionResponse represents the response from starting a session
type StartSessionResponse struct {
	SessionID  int64       `json:"session_id"`
	Kanji      []KanjiData `json:"kanji"`
	ValidWords []ValidWord `json:"valid_words"`
	TimeLimit  int         `json:"time_limit"`
}

// RefreshRequest represents the request to refresh kanji
type RefreshRequest struct {
	SessionID    int64   `json:"session_id"`     // Optional - for tracking, but not required for lookup
	JLPTLevel    int     `json:"jlpt_level"`     // Required - JLPT level for kanji selection
	UsedKanjiIDs []int64 `json:"used_kanji_ids"` // Required - kanji IDs to exclude
}

// RefreshResponse represents the response from refreshing kanji
type RefreshResponse struct {
	Kanji      []KanjiData `json:"kanji"`
	ValidWords []ValidWord `json:"valid_words"`
}

// SubmitRequest represents the request to submit results
type SubmitRequest struct {
	SessionID     int64    `json:"session_id"`
	FormedWords   []string `json:"formed_words"`
	TotalAttempts int      `json:"total_attempts"`
	TimeSpent     int      `json:"time_spent"`
	RefreshCount  int      `json:"refresh_count"`
}

// SubmitResponse represents the response from submitting results
type SubmitResponse struct {
	SessionID   int64   `json:"session_id"`
	WordsFormed int     `json:"words_formed"`
	Accuracy    float64 `json:"accuracy"`
	TimeSpent   int     `json:"time_spent"`
}
