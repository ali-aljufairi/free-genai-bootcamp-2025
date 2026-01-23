package group

import "time"

// GroupCreateRequest represents a request to create a group
type GroupCreateRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
}

// GroupUpdateRequest represents a request to update a group
type GroupUpdateRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=100"`
	Description *string `json:"description" validate:"omitempty,max=500"`
}

// GroupResponse represents a group in responses
type GroupResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	UserID      *int64    `json:"user_id"`
	WordCount   int64     `json:"word_count"`
	KanjiCount  int64     `json:"kanji_count"`
	CreatedAt   time.Time `json:"created_at"`
}

// AddWordRequest represents a request to add a word to a group
type AddWordRequest struct {
	WordID int64 `json:"word_id" validate:"required,min=1"`
}

// AddKanjiRequest represents a request to add a kanji to a group
type AddKanjiRequest struct {
	KanjiID int64 `json:"kanji_id" validate:"required,min=1"`
}

// GroupsListResponse represents a list of groups
type GroupsListResponse []GroupResponse

