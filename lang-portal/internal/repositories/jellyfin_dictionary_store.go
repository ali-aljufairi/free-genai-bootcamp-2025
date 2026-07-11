package repositories

import "gorm.io/gorm"

// JellyfinDictionaryWord is read-only metadata from Sorami's words table.
type JellyfinDictionaryWord struct {
	ID           int64
	Kanji        string
	Kana         string
	English      string
	PartOfSpeech string
	JLPT         *int
}

// JellyfinDictionaryStore resolves surface, dictionary, and reading forms
// without consulting Sorami users or learning state. It retains duplicate
// candidates so the handler can select the row matching a token's reading.
type JellyfinDictionaryStore interface {
	FindWords(forms []string) ([]JellyfinDictionaryWord, error)
}

type GormJellyfinDictionaryStore struct{ db *gorm.DB }

func NewJellyfinDictionaryStore(db *gorm.DB) *GormJellyfinDictionaryStore {
	return &GormJellyfinDictionaryStore{db: db}
}

func (s *GormJellyfinDictionaryStore) FindWords(forms []string) ([]JellyfinDictionaryWord, error) {
	if len(forms) == 0 {
		return []JellyfinDictionaryWord{}, nil
	}

	var rows []JellyfinDictionaryWord
	err := s.db.Raw(`SELECT id, COALESCE(kanji, '') AS kanji, COALESCE(kana, '') AS kana,
		COALESCE(english, '') AS english,
		COALESCE(CAST(part_of_speech AS TEXT), '') AS part_of_speech, jlpt
		FROM words WHERE kanji IN ? OR kana IN ? ORDER BY id`, forms, forms).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}
