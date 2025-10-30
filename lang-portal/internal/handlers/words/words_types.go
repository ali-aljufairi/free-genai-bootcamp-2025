package words

import "time"

// WordSearchParams represents search parameters for words
type WordSearchParams struct {
	Query        *string `json:"query"`
	JLPT         *int    `json:"jlpt"`
	PartOfSpeech *string `json:"part_of_speech"`
	Level        *int    `json:"level"`
	HasKanji     *bool   `json:"has_kanji"`
	Limit        *int    `json:"limit"`
	Offset       *int    `json:"offset"`
}

// WordListParams represents pagination parameters for word listing
type WordListParams struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
}

// WordResponse represents a paginated word response
type WordResponse struct {
	Items      []Word `json:"items"`
	Total      int64  `json:"total"`
	Page       int    `json:"page"`
	PageSize   int    `json:"page_size"`
	TotalPages int64  `json:"total_pages"`
}

// Word represents a vocabulary word in responses
type Word struct {
	ID           int64     `json:"id"`
	Kana         string    `json:"kana"`
	Kanji        *string   `json:"kanji"`
	Romaji       string    `json:"romaji"`
	English      string    `json:"english"`
	PartOfSpeech string    `json:"part_of_speech"`
	JLPT         *int      `json:"jlpt"`
	Level        int       `json:"level"`
	CorrectCount int       `json:"correct_count"`
	AudioPath    *string   `json:"audio_path"`
	CreatedAt    time.Time `json:"created_at"`
}

// WordSearchResponse represents a search result response
type WordSearchResponse struct {
	Items []Word `json:"items"`
	Total int64  `json:"total"`
}

