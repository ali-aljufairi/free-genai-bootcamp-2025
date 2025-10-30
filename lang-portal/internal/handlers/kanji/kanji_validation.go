package kanji

import (
	"errors"
)

// validateSearchParams validates kanji search parameters
func (h *KanjiHandler) validateSearchParams(params *KanjiSearchParams) error {
	if params.JLPT != nil {
		jlpt := *params.JLPT
		if jlpt < 0 || jlpt > 5 {
			return errors.New("JLPT level must be between 0 and 5")
		}
	}

	if params.StrokesMin != nil && params.StrokesMax != nil {
		if *params.StrokesMin > *params.StrokesMax {
			return errors.New("strokes_min cannot be greater than strokes_max")
		}
	}

	if params.StrokesMin != nil && *params.StrokesMin < 1 {
		return errors.New("strokes_min must be at least 1")
	}

	if params.StrokesMax != nil && *params.StrokesMax > 30 {
		return errors.New("strokes_max cannot exceed 30")
	}

	if params.FrequencyMin != nil && params.FrequencyMax != nil {
		if *params.FrequencyMin > *params.FrequencyMax {
			return errors.New("frequency_min cannot be greater than frequency_max")
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

