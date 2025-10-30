package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// ActivityType represents the type of study activity
type ActivityType string

const (
	ActivityTypeFlashcards ActivityType = "flashcards"
	ActivityTypeQuiz       ActivityType = "quiz"
	ActivityTypeChat       ActivityType = "chat"
	ActivityTypeDrawing    ActivityType = "drawing"
	ActivityTypeAgent      ActivityType = "agent"
	ActivityTypeSpeech     ActivityType = "speech"
)

// Word represents a vocabulary word in the system (PostgreSQL schema)
type Word struct {
	ID           int64     `json:"id" gorm:"primaryKey"`
	Kana         string    `json:"kana" gorm:"not null"`      // hiragana/katakana reading
	Kanji        *string   `json:"kanji" gorm:"column:kanji"` // kanji writing if applicable
	Romaji       string    `json:"romaji" gorm:"not null"`    // romanized reading
	English      string    `json:"english" gorm:"not null"`   // English meaning
	PartOfSpeech string    `json:"part_of_speech" gorm:"column:part_of_speech;type:pos_enum;not null"`
	JLPT         *int      `json:"jlpt" gorm:"column:jlpt"`                    // JLPT level 1-5
	Level        int       `json:"level" gorm:"default:5"`                     // difficulty level
	CorrectCount int       `json:"correct_count" gorm:"default:0"`             // study progress
	AudioPath    *string   `json:"audio_path" gorm:"column:audio_path"`        // future audio file path
	Embedding    []float32 `json:"embedding" gorm:"type:vector(384)"`          // AI embeddings
	RawData      *string   `json:"raw_data" gorm:"column:raw_data;type:jsonb"` // complete original JSON
}

// TableName specifies the table name for Word
func (Word) TableName() string {
	return "words"
}

type WordPartsJSON struct {
	Type      string `json:"type"`
	Formality string `json:"formality,omitempty"`
	Category  string `json:"category,omitempty"`
}

// Value implements the driver.Valuer interface
func (w WordPartsJSON) Value() (driver.Value, error) {
	return json.Marshal(w)
}

// Scan implements the sql.Scanner interface
func (w *WordPartsJSON) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed")
	}

	if len(data) == 0 {
		return nil
	}

	return json.Unmarshal(data, &w)
}

// Group represents a thematic group of words
type Group struct {
	ID          int64     `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null;uniqueIndex"`
	Description *string   `json:"description"`
	UserID      *int64    `json:"user_id" gorm:"column:user_id"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// WordGroup represents the many-to-many relationship between words and groups
type WordGroup struct {
	ID      int64 `json:"id"`
	WordID  int64 `json:"word_id"`
	GroupID int64 `json:"group_id"`
}

// StudySession represents a learning session
type StudySession struct {
	ID              int64     `json:"id"`
	GroupID         int64     `json:"group_id"`
	CreatedAt       time.Time `json:"created_at"`
	StudyActivityID int64     `json:"study_activity_id"`
}

// StudyActivity represents a specific learning activity
type StudyActivity struct {
	ID           int64        `json:"id" gorm:"primaryKey"`
	Name         string       `json:"name" gorm:"not null"`
	ActivityType ActivityType `json:"activity_type" gorm:"column:activity_type;type:activity_type_enum;not null;uniqueIndex"`
	Description  *string      `json:"description"`
	IsActive     *bool        `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time    `json:"created_at" gorm:"default:now()"`
}

// TableName specifies the table name for StudyActivity
func (StudyActivity) TableName() string {
	return "study_activities"
}

// WordReviewItem represents a practice record for a word
type WordReviewItem struct {
	WordID         int64     `json:"word_id"`
	StudySessionID int64     `json:"study_session_id"`
	Correct        bool      `json:"correct"`
	CreatedAt      time.Time `json:"created_at"`
}
