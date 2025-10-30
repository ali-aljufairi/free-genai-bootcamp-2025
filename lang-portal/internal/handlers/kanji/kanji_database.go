package kanji

// searchKanjiFromStore searches kanji from the store and converts them
func (h *KanjiHandler) searchKanjiFromStore(params KanjiSearchParams) ([]Kanji, int64, error) {
	kanjiModels, total, err := h.Store.Search(params)
	if err != nil {
		return nil, 0, err
	}

	converted := convertModelsToKanji(kanjiModels)
	return converted, total, nil
}

