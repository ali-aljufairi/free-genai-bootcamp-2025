package word_builder

import (
	"fmt"
	"lang-portal/internal/handlers/kanji"
	"strings"
)

// getKanjiMeanings retrieves meanings for a kanji with fallback logic:
// 1. Try meanings (jsonb) - parse JSON array, take first 3 elements
// 2. If null/empty, try detail (text) - split by comma, take first 3 values
// 3. If null/empty, try heisig_en (text) - split by comma, take first 3 values
// Returns []string with at least one meaning (max 3) or error
func (h *WordBuilderHandler) getKanjiMeanings(kanjiID int64) ([]string, error) {
	// Helper function to take first 3 comma-separated values from a string (for TEXT fields only)
	takeFirst3FromText := func(s string) []string {
		parts := strings.Split(s, ",")
		result := make([]string, 0, 3)
		for i, part := range parts {
			if i >= 3 {
				break
			}
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		return result
	}

	// First try meanings (jsonb) - already a JSON array, no comma-splitting needed
	var kanjiModel struct {
		Meanings kanji.StringSlice `gorm:"type:jsonb"`
	}
	err := h.DB.Raw("SELECT meanings FROM kanji WHERE id = $1", kanjiID).Scan(&kanjiModel).Error
	if err == nil && len(kanjiModel.Meanings) > 0 {
		meanings := []string(kanjiModel.Meanings)
		// Take first 3 meanings (meanings are already separate array elements)
		if len(meanings) > 3 {
			meanings = meanings[:3]
		}
		if len(meanings) > 0 {
			return meanings, nil
		}
	}

	// Fallback to detail (text) - split by comma if it contains commas
	var detail *string
	err = h.DB.Raw("SELECT detail FROM kanji WHERE id = $1", kanjiID).Scan(&detail).Error
	if err == nil && detail != nil && *detail != "" {
		result := takeFirst3FromText(*detail)
		if len(result) > 0 {
			return result, nil
		}
	}

	// Fallback to heisig_en (text) - split by comma if it contains commas
	var heisigEn *string
	err = h.DB.Raw("SELECT heisig_en FROM kanji WHERE id = $1", kanjiID).Scan(&heisigEn).Error
	if err == nil && heisigEn != nil && *heisigEn != "" {
		result := takeFirst3FromText(*heisigEn)
		if len(result) > 0 {
			return result, nil
		}
	}

	// If all are null/empty, return error
	return nil, fmt.Errorf("no meanings found for kanji id %d", kanjiID)
}



