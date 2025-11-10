package flashcard

import "time"

// FlashcardType represents the type of content
type FlashcardType string

const (
	FlashcardTypeWord  FlashcardType = "word"
	FlashcardTypeKanji FlashcardType = "kanji"
)

// ContentSource represents the source of flashcard content
type ContentSource string

const (
	ContentSourceUnit  ContentSource = "unit"
	ContentSourceGroup ContentSource = "group"
	ContentSourceJLPT  ContentSource = "jlpt"
	ContentSourceSRS   ContentSource = "srs"
)

// WordPracticeOptions represents what the user wants to practice for words
type WordPracticeOptions struct {
	ShowKana    bool `json:"show_kana"`    // Show hiragana/katakana reading
	ShowKanji   bool `json:"show_kanji"`   // Show kanji writing
	ShowRomaji  bool `json:"show_romaji"`  // Show romanized reading
	ShowEnglish bool `json:"show_english"` // Show English meaning

	// What to ask for (one must be true)
	AskForKana    bool `json:"ask_for_kana"`    // Ask for hiragana/katakana
	AskForKanji   bool `json:"ask_for_kanji"`   // Ask for kanji writing
	AskForRomaji  bool `json:"ask_for_romaji"`  // Ask for romaji
	AskForEnglish bool `json:"ask_for_english"` // Ask for English meaning
}

// KanjiPracticeOptions represents what the user wants to practice for kanji
type KanjiPracticeOptions struct {
	ShowCharacter bool `json:"show_character"` // Show kanji character
	ShowOnyomi    bool `json:"show_onyomi"`    // Show onyomi reading
	ShowKunyomi   bool `json:"show_kunyomi"`   // Show kunyomi reading
	ShowEnglish   bool `json:"show_english"`   // Show English meaning

	// What to ask for (one must be true)
	AskForCharacter bool `json:"ask_for_character"` // Ask for kanji character
	AskForOnyomi    bool `json:"ask_for_onyomi"`    // Ask for onyomi reading
	AskForKunyomi   bool `json:"ask_for_kunyomi"`   // Ask for kunyomi reading
	AskForEnglish   bool `json:"ask_for_english"`   // Ask for English meaning
}

// ContentFilters represents filters for content selection
type ContentFilters struct {
	JLPTLevels       []int    `json:"jlpt_levels"`       // Filter by JLPT levels (1-5)
	PartsOfSpeech    []string `json:"parts_of_speech"`   // Filter by parts of speech
	DifficultyLevels []int    `json:"difficulty_levels"` // Filter by difficulty levels
	HasKanji         *bool    `json:"has_kanji"`         // Filter words that have/don't have kanji
}

// FlashcardConfig represents the complete flashcard configuration
type FlashcardConfig struct {
	FlashcardType FlashcardType `json:"flashcard_type"`
	ContentSource ContentSource `json:"content_source"`

	// Content source specific IDs
	CourseID *int `json:"course_id"` // Required for unit-based practice
	UnitID   *int `json:"unit_id"`   // Optional: specific unit
	GroupID  *int `json:"group_id"`  // Required for group-based practice

	// Practice options
	WordOptions  *WordPracticeOptions  `json:"word_options"`  // Required if flashcard_type is "word"
	KanjiOptions *KanjiPracticeOptions `json:"kanji_options"` // Required if flashcard_type is "kanji"

	// Content filters
	Filters ContentFilters `json:"filters"`

	// Session settings
	CardCount            int  `json:"card_count"`             // Number of cards (1-100)
	TimeLimit            *int `json:"time_limit"`             // seconds per card, nil for no limit
	ShuffleOptions       bool `json:"shuffle_options"`        // Whether to shuffle multiple choice options
	RequiredCorrectCount *int `json:"required_correct_count"` // How many correct answers needed for SRS progression (default: 3)
}

// FlashcardContent represents the content shown on a flashcard
type FlashcardContent struct {
	// Word content
	Kana         *string `json:"kana,omitempty"`
	Kanji        *string `json:"kanji,omitempty"`
	Romaji       *string `json:"romaji,omitempty"`
	English      *string `json:"english,omitempty"`
	PartOfSpeech *string `json:"part_of_speech,omitempty"`

	// Kanji content
	Character *string `json:"character,omitempty"`
	Onyomi    *string `json:"onyomi,omitempty"`
	Kunyomi   *string `json:"kunyomi,omitempty"`
	Meanings  *string `json:"meanings,omitempty"`
}

// Flashcard represents a single flashcard
type Flashcard struct {
	ID           int64              `json:"id"`
	Type         FlashcardType      `json:"type"`
	Question     FlashcardContent   `json:"question"`      // What user sees
	Answer       FlashcardContent   `json:"answer"`        // What user should answer
	Options      []FlashcardContent `json:"options"`       // Multiple choice options (includes correct answer)
	CorrectIndex int                `json:"correct_index"` // Index of correct answer in options
	ItemID       int64              `json:"item_id"`
	ItemType     string             `json:"item_type"`
	AudioPath    *string            `json:"audio_path,omitempty"` // Audio file path for pronunciation
}

// FlashcardSession represents a flashcard session
type FlashcardSession struct {
	ID        int64           `json:"id"`
	UserID    int64           `json:"user_id"`
	Config    FlashcardConfig `json:"config"`
	Cards     []Flashcard     `json:"cards"`
	StartedAt time.Time       `json:"started_at"`
	EndedAt   *time.Time      `json:"ended_at"`
	Score     *int            `json:"score"`
	Total     int             `json:"total"`
}

// FlashcardAnswer represents a user's answer to a flashcard
type FlashcardAnswer struct {
	CardID int64 `json:"card_id"`
	Answer int   `json:"answer"` // index of selected option
}

// FlashcardSubmission represents a complete flashcard submission
type FlashcardSubmission struct {
	SessionID int64             `json:"session_id"`
	Answers   []FlashcardAnswer `json:"answers"`
}

// FlashcardResult represents flashcard results
type FlashcardResult struct {
	SessionID    int64        `json:"session_id"`
	Score        int          `json:"score"`
	Total        int          `json:"total"`
	Percentage   float64      `json:"percentage"`
	CorrectCount int          `json:"correct_count"`
	WrongCount   int          `json:"wrong_count"`
	Duration     int          `json:"duration"` // seconds
	Results      []CardResult `json:"results"`
}

// CardResult represents individual card results
type CardResult struct {
	CardID       int64  `json:"card_id"`
	ItemID       int64  `json:"item_id"`
	ItemType     string `json:"item_type"`
	UserAnswer   int    `json:"user_answer"`
	CorrectIndex int    `json:"correct_index"`
	IsCorrect    bool   `json:"is_correct"`
}
