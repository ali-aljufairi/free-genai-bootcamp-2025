package kanji

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

// StringSlice is a custom type for scanning JSONB array of strings from PostgreSQL
type StringSlice []string

// Scan implements the sql.Scanner interface for StringSlice
func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
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
		*s = []string{}
		return nil
	}

	// Handle empty JSON array
	if len(data) == 2 && data[0] == '[' && data[1] == ']' {
		*s = []string{}
		return nil
	}

	return json.Unmarshal(data, s)
}

// Value implements the driver.Valuer interface for StringSlice
func (s StringSlice) Value() (driver.Value, error) {
	if s == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(s)
}

// KanjiModel represents the kanji database model (GORM model)
type KanjiModel struct {
	ID          int         `json:"id" gorm:"primaryKey"`
	Character   string      `json:"character" gorm:"not null"`
	HeisigEn    *string     `json:"heisig_en" gorm:"column:heisig_en"`
	Meanings    StringSlice `json:"meanings" gorm:"type:jsonb"`
	Detail      *string     `json:"detail"`
	Unicode     string      `json:"unicode"`
	Onyomi      *string     `json:"onyomi"`
	Kunyomi     *string     `json:"kunyomi"`
	JLPT        *int        `json:"jlpt"`
	Frequency   *int         `json:"frequency"`
	Components  *string      `json:"components"`
	StrokeCount *int         `json:"stroke_count" gorm:"column:stroke_count"`
	StrokesSVG  *string      `json:"strokes_svg" gorm:"column:strokes_svg"`
	AudioPath   *string      `json:"audio_path" gorm:"column:audio_path"`
}

// TableName specifies the table name for KanjiModel
func (KanjiModel) TableName() string {
	return "kanji"
}

