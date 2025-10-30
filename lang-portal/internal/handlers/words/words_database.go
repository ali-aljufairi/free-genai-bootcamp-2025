package words

import (
	"lang-portal/internal/repositories"
)

// getWordsFromStore retrieves words from the store and converts them
func (h *WordsHandler) getWordsFromStore(page, pageSize int) ([]Word, int64, error) {
	words, total, err := h.Store.List(page, pageSize)
	if err != nil {
		return nil, 0, err
	}

	converted := convertModelsToWords(words)
	return converted, total, nil
}

// searchWordsFromStore searches words from the store and converts them
func (h *WordsHandler) searchWordsFromStore(params repositories.SearchWordsParams) ([]Word, int64, error) {
	words, total, err := h.Store.Search(params)
	if err != nil {
		return nil, 0, err
	}

	converted := convertModelsToWords(words)
	return converted, total, nil
}

// calculateTotalPages calculates total pages from total count and page size
func calculateTotalPages(total int64, pageSize int) int64 {
	if pageSize <= 0 {
		return 0
	}
	return (total + int64(pageSize) - 1) / int64(pageSize)
}
