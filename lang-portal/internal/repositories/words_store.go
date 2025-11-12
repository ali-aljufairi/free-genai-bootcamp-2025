package repositories

import (
	"lang-portal/internal/database/models"
	"gorm.io/gorm"
)

type WordsStore struct {
	DB *gorm.DB
}

func NewWordsStore(db *gorm.DB) *WordsStore {
	return &WordsStore{DB: db}
}

// List returns paginated words
func (s *WordsStore) List(page, pageSize int) ([]models.Word, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	var words []models.Word
	var total int64

	offset := (page - 1) * pageSize

	if err := s.DB.Model(&models.Word{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := s.DB.Offset(offset).Limit(pageSize).Find(&words).Error; err != nil {
		return nil, 0, err
	}

	return words, total, nil
}

// Search searches words with filters
func (s *WordsStore) Search(params SearchWordsParams) ([]models.Word, int64, error) {
	limit := 50
	offset := 0
	if params.Limit != nil {
		limit = *params.Limit
		if limit <= 0 || limit > 100 {
			limit = 50
		}
	}
	if params.Offset != nil {
		offset = *params.Offset
		if offset < 0 {
			offset = 0
		}
	}

	query := s.DB.Model(&models.Word{})

	if params.Query != nil && *params.Query != "" {
		q := *params.Query
		query = query.Where(
			"kana ILIKE ? OR kanji ILIKE ? OR romaji ILIKE ? OR english ILIKE ?",
			"%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%",
		)
	}

	if params.JLPT != nil {
		jlpt := *params.JLPT
		if jlpt >= 1 && jlpt <= 5 {
			query = query.Where("jlpt = ?", jlpt)
		}
	}

	if params.PartOfSpeech != nil && *params.PartOfSpeech != "" {
		query = query.Where("part_of_speech = ?", *params.PartOfSpeech)
	}

	if params.Level != nil {
		level := *params.Level
		if level >= 1 && level <= 10 {
			query = query.Where("level = ?", level)
		}
	}

	if params.HasKanji != nil {
		if *params.HasKanji {
			query = query.Where("kanji IS NOT NULL AND kanji != ''")
		} else {
			query = query.Where("kanji IS NULL OR kanji = ''")
		}
	}

	if params.GroupID != nil && len(params.GroupID) > 0 {
		if len(params.GroupID) == 1 {
			query = query.Joins("JOIN word_groups ON words.id = word_groups.word_id").
				Where("word_groups.group_id = ?", params.GroupID[0])
		} else {
			// Multiple groups: find words that belong to ALL selected groups
			query = query.Where("EXISTS (SELECT 1 FROM word_groups WHERE word_groups.word_id = words.id AND word_groups.group_id IN ?)", params.GroupID).
				Group("words.id").
				Having("COUNT(DISTINCT word_groups.group_id) = ?", len(params.GroupID))
		}
	}

	var words []models.Word
	var total int64

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Limit(limit).Offset(offset).Order("id ASC").Find(&words).Error; err != nil {
		return nil, 0, err
	}

	return words, total, nil
}

type SearchWordsParams struct {
	Query        *string
	JLPT         *int
	PartOfSpeech *string
	Level        *int
	HasKanji     *bool
	GroupID      []int64
	Limit        *int
	Offset       *int
}

