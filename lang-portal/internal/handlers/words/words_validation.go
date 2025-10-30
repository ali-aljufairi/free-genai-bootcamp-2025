package words

import (
	"errors"
	"lang-portal/internal/repositories"
)

// validateSearchParams validates word search parameters
func (h *WordsHandler) validateSearchParams(params *repositories.SearchWordsParams) error {
	if params.JLPT != nil {
		jlpt := *params.JLPT
		if jlpt < 1 || jlpt > 5 {
			return errors.New("JLPT level must be between 1 and 5")
		}
	}

	if params.Level != nil {
		level := *params.Level
		if level < 1 || level > 10 {
			return errors.New("level must be between 1 and 10")
		}
	}

	if params.Limit != nil {
		limit := *params.Limit
		if limit <= 0 || limit > 100 {
			return errors.New("limit must be between 1 and 100")
		}
	}

	if params.Offset != nil {
		offset := *params.Offset
		if offset < 0 {
			return errors.New("offset must be non-negative")
		}
	}

	return nil
}

// validateListParams validates pagination parameters
func (h *WordsHandler) validateListParams(page, pageSize int) error {
	if page < 1 {
		return errors.New("page must be at least 1")
	}

	if pageSize < 1 || pageSize > 100 {
		return errors.New("page_size must be between 1 and 100")
	}

	return nil
}

