package handlers

import (
	"lang-portal/internal/database"
	"lang-portal/internal/database/models"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// WordWithGroups represents a request to create a word with associated groups
type WordWithGroups struct {
	Word     models.Word `json:"word"`
	GroupIDs []int64     `json:"group_ids,omitempty"`
}

// WordsWithGroupsBatch represents a request to create multiple words with groups
type WordsWithGroupsBatch struct {
	Words []WordWithGroups `json:"words"`
}

// WordSearchRequest represents word search parameters
type WordSearchRequest struct {
	Query        *string `json:"query" query:"q"`
	JLPT         *int    `json:"jlpt" query:"jlpt"`
	PartOfSpeech *string `json:"part_of_speech" query:"part_of_speech"`
	Level        *int    `json:"level" query:"level"`
	HasKanji     *bool   `json:"has_kanji" query:"has_kanji"`
	Limit        *int    `json:"limit" query:"limit"`
	Offset       *int    `json:"offset" query:"offset"`
}

type WordHandler struct {
	db *database.DB
}

func NewWordHandler(db *database.DB) *WordHandler {
	return &WordHandler{db: db}
}

// GetWords returns paginated words
func (h *WordHandler) GetWords(c *fiber.Ctx) error {
	// Get page and pageSize from query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "10"))

	// Ensure valid pagination parameters
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	words, total, err := h.db.GetWords(page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get words",
		})
	}

	return c.JSON(fiber.Map{
		"items":      words,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": (total + int64(pageSize) - 1) / int64(pageSize),
	})
}

// GetWord returns a specific word by ID
func (h *WordHandler) GetWord(c *fiber.Ctx) error {
	wordID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid word ID",
		})
	}

	var word models.Word
	result := h.db.GetDB().First(&word, wordID)
	if result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Word not found",
		})
	}

	return c.JSON(word)
}

// SearchWords searches for words based on various criteria
func (h *WordHandler) SearchWords(c *fiber.Ctx) error {
	var req WordSearchRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid query parameters",
		})
	}

	// Set defaults
	limit := 50
	offset := 0
	if req.Limit != nil {
		limit = *req.Limit
		if limit <= 0 || limit > 100 {
			limit = 50
		}
	}
	if req.Offset != nil {
		offset = *req.Offset
		if offset < 0 {
			offset = 0
		}
	}

	dbQuery := h.db.GetDB().Model(&models.Word{})

	// Apply search filters
	if req.Query != nil && *req.Query != "" {
		query := *req.Query
		dbQuery = dbQuery.Where(
			"kana ILIKE ? OR kanji ILIKE ? OR romaji ILIKE ? OR english ILIKE ?",
			"%"+query+"%", "%"+query+"%", "%"+query+"%", "%"+query+"%",
		)
	}

	if req.JLPT != nil {
		jlpt := *req.JLPT
		if jlpt >= 1 && jlpt <= 5 {
			dbQuery = dbQuery.Where("jlpt = ?", jlpt)
		}
	}

	if req.PartOfSpeech != nil && *req.PartOfSpeech != "" {
		dbQuery = dbQuery.Where("part_of_speech = ?", *req.PartOfSpeech)
	}

	if req.Level != nil {
		level := *req.Level
		if level >= 1 && level <= 10 {
			dbQuery = dbQuery.Where("level = ?", level)
		}
	}

	if req.HasKanji != nil {
		if *req.HasKanji {
			dbQuery = dbQuery.Where("kanji IS NOT NULL AND kanji != ''")
		} else {
			dbQuery = dbQuery.Where("kanji IS NULL OR kanji = ''")
		}
	}

	var words []models.Word
	var total int64

	// Get total count
	dbQuery.Count(&total)

	// Get paginated results
	if err := dbQuery.Limit(limit).Offset(offset).Order("jlpt ASC, level ASC, kana ASC").Find(&words).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search words",
		})
	}

	return c.JSON(fiber.Map{
		"items":   words,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
		"hasMore": offset+limit < int(total),
	})
}

// GetWordsByJLPTLevel returns words for a specific JLPT level
func (h *WordHandler) GetWordsByJLPTLevel(c *fiber.Ctx) error {
	level := c.Params("level")
	if level == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "JLPT level is required",
		})
	}

	levelInt, err := strconv.Atoi(level)
	if err != nil || levelInt < 1 || levelInt > 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid JLPT level (1-5)",
		})
	}

	limit := c.Query("limit", "50")
	offset := c.Query("offset", "0")

	limitInt, _ := strconv.Atoi(limit)
	if limitInt <= 0 || limitInt > 100 {
		limitInt = 50
	}

	offsetInt, _ := strconv.Atoi(offset)
	if offsetInt < 0 {
		offsetInt = 0
	}

	var words []models.Word
	var total int64

	// Get total count
	h.db.GetDB().Model(&models.Word{}).Where("jlpt = ?", levelInt).Count(&total)

	// Get paginated results
	if err := h.db.GetDB().Where("jlpt = ?", levelInt).Limit(limitInt).Offset(offsetInt).Order("kana ASC").Find(&words).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get words",
		})
	}

	return c.JSON(fiber.Map{
		"items":   words,
		"total":   total,
		"level":   levelInt,
		"limit":   limitInt,
		"offset":  offsetInt,
		"hasMore": offsetInt+limitInt < int(total),
	})
}

// GetWordsByPartOfSpeech returns words by part of speech
func (h *WordHandler) GetWordsByPartOfSpeech(c *fiber.Ctx) error {
	pos := c.Params("pos")
	if pos == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Part of speech is required",
		})
	}

	limit := c.Query("limit", "50")
	offset := c.Query("offset", "0")

	limitInt, _ := strconv.Atoi(limit)
	if limitInt <= 0 || limitInt > 100 {
		limitInt = 50
	}

	offsetInt, _ := strconv.Atoi(offset)
	if offsetInt < 0 {
		offsetInt = 0
	}

	var words []models.Word
	var total int64

	// Get total count
	h.db.GetDB().Model(&models.Word{}).Where("part_of_speech = ?", pos).Count(&total)

	// Get paginated results
	if err := h.db.GetDB().Where("part_of_speech = ?", pos).Limit(limitInt).Offset(offsetInt).Order("kana ASC").Find(&words).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get words",
		})
	}

	return c.JSON(fiber.Map{
		"items":          words,
		"total":          total,
		"part_of_speech": pos,
		"limit":          limitInt,
		"offset":         offsetInt,
		"hasMore":        offsetInt+limitInt < int(total),
	})
}

// GetWordsByKanji returns words that contain a specific kanji
func (h *WordHandler) GetWordsByKanji(c *fiber.Ctx) error {
	kanji := c.Params("kanji")
	if kanji == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kanji character is required",
		})
	}

	limit := c.Query("limit", "50")
	offset := c.Query("offset", "0")

	limitInt, _ := strconv.Atoi(limit)
	if limitInt <= 0 || limitInt > 100 {
		limitInt = 50
	}

	offsetInt, _ := strconv.Atoi(offset)
	if offsetInt < 0 {
		offsetInt = 0
	}

	var words []models.Word
	var total int64

	// Get total count
	h.db.GetDB().Model(&models.Word{}).Where("kanji LIKE ?", "%"+kanji+"%").Count(&total)

	// Get paginated results
	if err := h.db.GetDB().Where("kanji LIKE ?", "%"+kanji+"%").Limit(limitInt).Offset(offsetInt).Order("kana ASC").Find(&words).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get words",
		})
	}

	return c.JSON(fiber.Map{
		"items":   words,
		"total":   total,
		"kanji":   kanji,
		"limit":   limitInt,
		"offset":  offsetInt,
		"hasMore": offsetInt+limitInt < int(total),
	})
}

// GetWordStats returns statistics about words
func (h *WordHandler) GetWordStats(c *fiber.Ctx) error {
	var stats struct {
		TotalWords     int64            `json:"total_words"`
		ByJLPTLevel    map[int]int64    `json:"by_jlpt_level"`
		ByPartOfSpeech map[string]int64 `json:"by_part_of_speech"`
		ByLevel        map[int]int64    `json:"by_level"`
		WithKanji      int64            `json:"with_kanji"`
		WithoutKanji   int64            `json:"without_kanji"`
	}

	// Total words count
	h.db.GetDB().Model(&models.Word{}).Count(&stats.TotalWords)

	// By JLPT level
	stats.ByJLPTLevel = make(map[int]int64)
	var jlptStats []struct {
		JLPT  int   `json:"jlpt"`
		Count int64 `json:"count"`
	}
	h.db.GetDB().Model(&models.Word{}).Select("jlpt, COUNT(*) as count").Where("jlpt IS NOT NULL").Group("jlpt").Scan(&jlptStats)
	for _, stat := range jlptStats {
		stats.ByJLPTLevel[stat.JLPT] = stat.Count
	}

	// By part of speech
	stats.ByPartOfSpeech = make(map[string]int64)
	var posStats []struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	h.db.GetDB().Model(&models.Word{}).Select("part_of_speech as type, COUNT(*) as count").Group("part_of_speech").Scan(&posStats)
	for _, stat := range posStats {
		stats.ByPartOfSpeech[stat.Type] = stat.Count
	}

	// By level
	stats.ByLevel = make(map[int]int64)
	var levelStats []struct {
		Level int   `json:"level"`
		Count int64 `json:"count"`
	}
	h.db.GetDB().Model(&models.Word{}).Select("level, COUNT(*) as count").Group("level").Scan(&levelStats)
	for _, stat := range levelStats {
		stats.ByLevel[stat.Level] = stat.Count
	}

	// Words with/without kanji
	h.db.GetDB().Model(&models.Word{}).Where("kanji IS NOT NULL AND kanji != ''").Count(&stats.WithKanji)
	h.db.GetDB().Model(&models.Word{}).Where("kanji IS NULL OR kanji = ''").Count(&stats.WithoutKanji)

	return c.JSON(stats)
}

// CreateWord adds a new word to the database
func (h *WordHandler) CreateWord(c *fiber.Ctx) error {
	var word models.Word
	if err := c.BodyParser(&word); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	// Validate required fields
	if word.Kana == "" || word.Romaji == "" || word.English == "" || word.PartOfSpeech == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Kana, romaji, english, and part_of_speech fields are required",
		})
	}

	// Set defaults
	if word.Level == 0 {
		word.Level = 5
	}
	if word.CorrectCount == 0 {
		word.CorrectCount = 0
	}

	// Create the word in the database
	result := h.db.GetDB().Create(&word)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to create word",
			"details": result.Error.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(word)
}

// UpdateWord updates an existing word
func (h *WordHandler) UpdateWord(c *fiber.Ctx) error {
	wordID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid word ID",
		})
	}

	var word models.Word
	if err := c.BodyParser(&word); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	// Check if word exists
	var existingWord models.Word
	if err := h.db.GetDB().First(&existingWord, wordID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Word not found",
		})
	}

	// Update the word
	word.ID = wordID
	result := h.db.GetDB().Save(&word)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to update word",
			"details": result.Error.Error(),
		})
	}

	return c.JSON(word)
}

// DeleteWord deletes a word from the database
func (h *WordHandler) DeleteWord(c *fiber.Ctx) error {
	wordID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid word ID",
		})
	}

	// Check if word exists
	var word models.Word
	if err := h.db.GetDB().First(&word, wordID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Word not found",
		})
	}

	// Delete the word
	if err := h.db.GetDB().Delete(&word).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to delete word",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Word deleted successfully",
		"id":      wordID,
	})
}

// GetRandomWord returns a random word from the database
func (h *WordHandler) GetRandomWord(c *fiber.Ctx) error {
	var word models.Word
	result := h.db.GetDB().Order("RANDOM()").First(&word)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get random word",
		})
	}
	return c.JSON(word)
}

// GetRandomWords returns multiple random words
func (h *WordHandler) GetRandomWords(c *fiber.Ctx) error {
	count := c.Query("count", "10")
	countInt, _ := strconv.Atoi(count)
	if countInt <= 0 || countInt > 50 {
		countInt = 10
	}

	var words []models.Word
	result := h.db.GetDB().Order("RANDOM()").Limit(countInt).Find(&words)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get random words",
		})
	}

	return c.JSON(fiber.Map{
		"words": words,
		"count": len(words),
	})
}

// BulkCreateWords creates multiple words at once
func (h *WordHandler) BulkCreateWords(c *fiber.Ctx) error {
	var words []models.Word
	if err := c.BodyParser(&words); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
	}

	// Validate all words
	invalidWords := []int{}
	for i, word := range words {
		if word.Kana == "" || word.Romaji == "" || word.English == "" || word.PartOfSpeech == "" {
			invalidWords = append(invalidWords, i)
		}
	}

	if len(invalidWords) > 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":          "Some words are missing required fields",
			"invalidIndices": invalidWords,
		})
	}

	// Set defaults for all words
	for i := range words {
		if words[i].Level == 0 {
			words[i].Level = 5
		}
		if words[i].CorrectCount == 0 {
			words[i].CorrectCount = 0
		}
	}

	// Create all words in a transaction
	tx := h.db.GetDB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, word := range words {
		if result := tx.Create(&word); result.Error != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Failed to create words",
				"details": result.Error.Error(),
			})
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to commit transaction",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Words created successfully",
		"count":   len(words),
	})
}
