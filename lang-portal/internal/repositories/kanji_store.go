package repositories

import (
	"lang-portal/internal/database/models"
	"lang-portal/internal/handlers/kanji"
	"gorm.io/gorm"
)

type KanjiStore struct {
	DB *gorm.DB
}

func NewKanjiStore(db *gorm.DB) *KanjiStore {
	return &KanjiStore{DB: db}
}

// Search searches kanji with filters
// Note: This uses kanji.KanjiSearchParams to avoid import cycles
func (s *KanjiStore) Search(params kanji.KanjiSearchParams) ([]kanji.KanjiModel, int64, error) {
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

	query := s.DB.Model(&kanji.KanjiModel{})

	if params.Query != nil && *params.Query != "" {
		q := *params.Query
		query = query.Where(
			"character ILIKE ? OR heisig_en ILIKE ? OR detail ILIKE ? OR onyomi ILIKE ? OR kunyomi ILIKE ? OR components ILIKE ?",
			"%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%", "%"+q+"%",
		)
	}

	if params.JLPT != nil {
		jlpt := *params.JLPT
		if jlpt >= 0 && jlpt <= 5 {
			query = query.Where("jlpt = ?", jlpt)
		}
	}

	if params.StrokesMin != nil {
		query = query.Where("stroke_count >= ?", *params.StrokesMin)
	}

	if params.StrokesMax != nil {
		query = query.Where("stroke_count <= ?", *params.StrokesMax)
	}

	if params.HasSVG != nil && *params.HasSVG {
		query = query.Where("strokes_svg IS NOT NULL AND strokes_svg != ''")
	}

	if params.FrequencyMin != nil {
		query = query.Where("frequency >= ?", *params.FrequencyMin)
	}

	if params.FrequencyMax != nil {
		query = query.Where("frequency <= ?", *params.FrequencyMax)
	}

	if params.Onyomi != nil && *params.Onyomi {
		query = query.Where("onyomi IS NOT NULL AND onyomi != ''")
	}

	if params.Kunyomi != nil && *params.Kunyomi {
		query = query.Where("kunyomi IS NOT NULL AND kunyomi != ''")
	}

	if params.Components != nil && *params.Components != "" {
		query = query.Where("components ILIKE ?", "%"+*params.Components+"%")
	}

	var kanjiModels []kanji.KanjiModel
	var total int64

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Limit(limit).Offset(offset).Order("id ASC").Find(&kanjiModels).Error; err != nil {
		return nil, 0, err
	}

	// Add fallback meanings from heisig_en or words table for kanji with empty meanings
	for i := range kanjiModels {
		if len(kanjiModels[i].Meanings) == 0 {
			// First try to use heisig_en if available
			if kanjiModels[i].HeisigEn != nil && *kanjiModels[i].HeisigEn != "" {
				kanjiModels[i].Meanings = kanji.StringSlice{*kanjiModels[i].HeisigEn}
			} else {
				// Fallback to words table if heisig_en is not available
				var word models.Word
				err := s.DB.Model(&models.Word{}).
					Where("kanji LIKE ?", "%"+kanjiModels[i].Character+"%").
					First(&word).Error
				
				if err == nil && word.English != "" {
					// Populate meanings with the word's English translation
					kanjiModels[i].Meanings = kanji.StringSlice{word.English}
				}
			}
		}
	}

	return kanjiModels, total, nil
}

