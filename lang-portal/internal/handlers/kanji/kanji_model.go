package kanji

// KanjiModel represents the kanji database model (GORM model)
type KanjiModel struct {
	ID          int      `json:"id" gorm:"primaryKey"`
	Character   string   `json:"character" gorm:"not null"`
	HeisigEn    *string  `json:"heisig_en" gorm:"column:heisig_en"`
	Meanings    []string `json:"meanings" gorm:"type:jsonb"`
	Detail      *string  `json:"detail"`
	Unicode     string   `json:"unicode"`
	Onyomi      *string  `json:"onyomi"`
	Kunyomi     *string  `json:"kunyomi"`
	JLPT        *int     `json:"jlpt"`
	Frequency   *int     `json:"frequency"`
	Components  *string  `json:"components"`
	StrokeCount *int     `json:"stroke_count" gorm:"column:stroke_count"`
	StrokesSVG  *string  `json:"strokes_svg" gorm:"column:strokes_svg"`
}

// TableName specifies the table name for KanjiModel
func (KanjiModel) TableName() string {
	return "kanji"
}

