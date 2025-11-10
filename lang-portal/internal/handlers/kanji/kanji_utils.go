package kanji

import (
	"encoding/json"
)

// convertModelToKanji converts database model to response type
func convertModelToKanji(k KanjiModel) Kanji {
	meanings := make([]string, 0)
	if len(k.Meanings) > 0 {
		meanings = []string(k.Meanings)
	}

	return Kanji{
		ID:          k.ID,
		Character:   k.Character,
		HeisigEn:    k.HeisigEn,
		Meanings:    meanings,
		Detail:      k.Detail,
		Unicode:     k.Unicode,
		Onyomi:      k.Onyomi,
		Kunyomi:     k.Kunyomi,
		JLPT:        k.JLPT,
		Frequency:   k.Frequency,
		Components:  k.Components,
		StrokeCount: k.StrokeCount,
		StrokesSVG:  k.StrokesSVG,
		AudioPath:   k.AudioPath,
	}
}

// convertModelsToKanji converts slice of database models to response types
func convertModelsToKanji(kanji []KanjiModel) []Kanji {
	result := make([]Kanji, len(kanji))
	for i, k := range kanji {
		result[i] = convertModelToKanji(k)
	}
	return result
}

// buildSearchParams builds search parameters from query strings
func buildSearchParams(query string, jlpt *int, strokesMin *int, strokesMax *int, hasSVG *bool,
	frequencyMin *int, frequencyMax *int, onyomi *bool, kunyomi *bool, components *string,
	groupID *int64, limit *int, offset *int) KanjiSearchParams {

	params := KanjiSearchParams{}

	if query != "" {
		params.Query = &query
	}
	if jlpt != nil {
		params.JLPT = jlpt
	}
	if strokesMin != nil {
		params.StrokesMin = strokesMin
	}
	if strokesMax != nil {
		params.StrokesMax = strokesMax
	}
	if hasSVG != nil {
		params.HasSVG = hasSVG
	}
	if frequencyMin != nil {
		params.FrequencyMin = frequencyMin
	}
	if frequencyMax != nil {
		params.FrequencyMax = frequencyMax
	}
	if onyomi != nil {
		params.Onyomi = onyomi
	}
	if kunyomi != nil {
		params.Kunyomi = kunyomi
	}
	if components != nil && *components != "" {
		params.Components = components
	}
	if groupID != nil {
		params.GroupID = groupID
	}
	if limit != nil {
		params.Limit = limit
	}
	if offset != nil {
		params.Offset = offset
	}

	return params
}

// parseMeaningsFromJSONB parses JSONB meanings field
func parseMeaningsFromJSONB(data interface{}) []string {
	if data == nil {
		return []string{}
	}

	var meanings []string
	bytes, ok := data.([]byte)
	if !ok {
		return []string{}
	}

	if err := json.Unmarshal(bytes, &meanings); err != nil {
		return []string{}
	}

	return meanings
}

// calculateTotalPages calculates total pages from total count and page size
func calculateTotalPages(total int64, pageSize int) int64 {
	if pageSize <= 0 {
		return 0
	}
	return (total + int64(pageSize) - 1) / int64(pageSize)
}
