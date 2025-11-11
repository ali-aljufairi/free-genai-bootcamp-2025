package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// ChatSession represents a chat study session
type ChatSession struct {
	ID           int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID       int64     `json:"user_id" gorm:"not null;index"`
	SessionID    string    `json:"session_id" gorm:"uniqueIndex;not null"`    // Frontend session ID
	Messages     JSONB     `json:"messages" gorm:"type:jsonb"`                // Full conversation array
	SkillSummary *JSONB    `json:"skill_summary,omitempty" gorm:"type:jsonb"` // AI-generated assessment
	ModelUsed    string    `json:"model_used" gorm:"not null"`
	PromptUsed   string    `json:"prompt_used" gorm:"not null"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for ChatSession
func (ChatSession) TableName() string {
	return "chat_sessions"
}

// JSONB is a custom type for PostgreSQL JSONB fields
type JSONB struct {
	Data interface{} `json:"data"`
}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j.Data == nil {
		return nil, nil
	}
	return json.Marshal(j.Data)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		j.Data = nil
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
		j.Data = nil
		return nil
	}

	return json.Unmarshal(data, &j.Data)
}
