package words

import (
	"lang-portal/internal/database/models"
	"lang-portal/internal/repositories"
)

// convertModelToWord converts database model to response type
func convertModelToWord(w models.Word) Word {
	return Word{
		ID:           w.ID,
		Kana:         w.Kana,
		Kanji:        w.Kanji,
		Romaji:       w.Romaji,
		English:      w.English,
		PartOfSpeech: w.PartOfSpeech,
		JLPT:         w.JLPT,
		Level:        w.Level,
		CorrectCount: w.CorrectCount,
		AudioPath:    w.AudioPath,
	}
}

// convertModelsToWords converts slice of database models to response types
func convertModelsToWords(words []models.Word) []Word {
	result := make([]Word, len(words))
	for i, w := range words {
		result[i] = convertModelToWord(w)
	}
	return result
}

// buildSearchParams builds search parameters from query strings
func buildSearchParams(query string, jlpt *int, pos *string, level *int, hasKanji *bool, limit *int, offset *int) repositories.SearchWordsParams {
	params := repositories.SearchWordsParams{}

	if query != "" {
		params.Query = &query
	}
	if jlpt != nil {
		params.JLPT = jlpt
	}
	if pos != nil && *pos != "" {
		params.PartOfSpeech = pos
	}
	if level != nil {
		params.Level = level
	}
	if hasKanji != nil {
		params.HasKanji = hasKanji
	}
	if limit != nil {
		params.Limit = limit
	}
	if offset != nil {
		params.Offset = offset
	}

	return params
}

