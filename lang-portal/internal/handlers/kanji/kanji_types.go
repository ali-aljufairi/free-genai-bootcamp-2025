package kanji

// KanjiSearchParams represents search parameters for kanji
type KanjiSearchParams struct {
	Query        *string `json:"query"`
	JLPT         *int    `json:"jlpt"`
	StrokesMin   *int    `json:"strokes_min"`
	StrokesMax   *int    `json:"strokes_max"`
	HasSVG       *bool   `json:"has_svg"`
	FrequencyMin *int    `json:"frequency_min"`
	FrequencyMax *int    `json:"frequency_max"`
	Onyomi       *bool   `json:"onyomi"`
	Kunyomi      *bool   `json:"kunyomi"`
	Components   *string `json:"components"`
	GroupID      *int64  `json:"group_id"`
	Limit        *int    `json:"limit"`
	Offset       *int    `json:"offset"`
	Page         *int    `json:"page"`
	PageSize     *int    `json:"page_size"`
}

// KanjiResponse represents a paginated kanji response
type KanjiResponse struct {
	Items      []Kanji `json:"items"`
	Total      int64   `json:"total"`
	Page       int     `json:"page"`
	PageSize   int     `json:"page_size"`
	TotalPages int64   `json:"total_pages"`
}

// Kanji represents a kanji character in responses
type Kanji struct {
	ID          int      `json:"id"`
	Character   string   `json:"character"`
	HeisigEn    *string  `json:"heisig_en"`
	Meanings    []string `json:"meanings"`
	Detail      *string  `json:"detail"`
	Unicode     string   `json:"unicode"`
	Onyomi      *string  `json:"onyomi"`
	Kunyomi     *string  `json:"kunyomi"`
	JLPT        *int     `json:"jlpt"`
	Frequency   *int     `json:"frequency"`
	Components  *string  `json:"components"`
	StrokeCount *int     `json:"stroke_count"`
	StrokesSVG  *string  `json:"strokes_svg"`
}

// KanjiSearchResponse represents a search result response
type KanjiSearchResponse struct {
	Items []Kanji `json:"items"`
	Total int64   `json:"total"`
}

