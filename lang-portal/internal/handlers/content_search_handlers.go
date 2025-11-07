package handlers

import (
	"lang-portal/internal/database/models"
	"lang-portal/internal/handlers/kanji"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ContentSearchHandler struct {
	DB *gorm.DB
}

// ContentSearchRequest represents unified content search parameters
type ContentSearchRequest struct {
	Query       string `json:"query" query:"q"`
	ContentType string `json:"content_type" query:"type"` // kanji, word, grammar, all
	JLPTLevel   *int   `json:"jlpt_level" query:"jlpt"`
	Limit       *int   `json:"limit" query:"limit"`
	Offset      *int   `json:"offset" query:"offset"`
}

// ContentSearchResult represents a unified search result
type ContentSearchResult struct {
	Type         string      `json:"type"` // kanji, word, grammar
	ID           int         `json:"id"`
	Content      interface{} `json:"content"`
	Relevance    float64     `json:"relevance"`
	MatchedField string      `json:"matched_field"`
}

// UnifiedSearchResponse represents the response for unified content search
type UnifiedSearchResponse struct {
	Results     []ContentSearchResult `json:"results"`
	Total       int64                 `json:"total"`
	Limit       int                   `json:"limit"`
	Offset      int                   `json:"offset"`
	HasMore     bool                  `json:"has_more"`
	Query       string                `json:"query"`
	ContentType string                `json:"content_type"`
}

func NewContentSearchHandler(db *gorm.DB) *ContentSearchHandler {
	return &ContentSearchHandler{DB: db}
}

// SearchContent performs unified search across all content types
func (h *ContentSearchHandler) SearchContent(c *fiber.Ctx) error {
	var req ContentSearchRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	if req.Query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Search query is required"})
	}

	// Set defaults
	if req.ContentType == "" {
		req.ContentType = "all"
	}

	limit := 50
	if req.Limit != nil && *req.Limit > 0 && *req.Limit <= 100 {
		limit = *req.Limit
	}

	offset := 0
	if req.Offset != nil && *req.Offset >= 0 {
		offset = *req.Offset
	}

	var results []ContentSearchResult
	var total int64

	switch req.ContentType {
	case "kanji":
		results, total = h.searchKanji(req.Query, req.JLPTLevel, limit, offset)
	case "word":
		results, total = h.searchWords(req.Query, req.JLPTLevel, limit, offset)
	case "grammar":
		results, total = h.searchGrammar(req.Query, limit, offset)
	case "all":
		results, total = h.searchAll(req.Query, req.JLPTLevel, limit, offset)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid content type"})
	}

	response := UnifiedSearchResponse{
		Results:     results,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
		HasMore:     offset+limit < int(total),
		Query:       req.Query,
		ContentType: req.ContentType,
	}

	return c.JSON(response)
}

// searchKanji searches for kanji content
func (h *ContentSearchHandler) searchKanji(query string, jlptLevel *int, limit, offset int) ([]ContentSearchResult, int64) {
	var results []ContentSearchResult
	dbQuery := h.DB.Model(&kanji.KanjiModel{})

	// Apply search filters
	dbQuery = dbQuery.Where("character = ? OR ? = ANY(meanings) OR heisig_en ILIKE ?",
		query, query, "%"+query+"%")

	if jlptLevel != nil {
		dbQuery = dbQuery.Where("jlpt = ?", *jlptLevel)
	}

	var kanjiModels []kanji.KanjiModel
	var total int64
	dbQuery.Count(&total)
	dbQuery.Limit(limit).Offset(offset).Order("frequency ASC NULLS LAST").Find(&kanjiModels)

	for _, k := range kanjiModels {
		relevance := 1.0
		matchedField := "character"

		if k.Character == query {
			relevance = 1.0
			matchedField = "character"
		} else if containsString([]string(k.Meanings), query) {
			relevance = 0.8
			matchedField = "meaning"
		} else if k.HeisigEn != nil && containsString([]string{*k.HeisigEn}, query) {
			relevance = 0.6
			matchedField = "heisig"
		}

		results = append(results, ContentSearchResult{
			Type:         "kanji",
			ID:           k.ID,
			Content:      k,
			Relevance:    relevance,
			MatchedField: matchedField,
		})
	}

	return results, total
}

// searchWords searches for word content
func (h *ContentSearchHandler) searchWords(query string, jlptLevel *int, limit, offset int) ([]ContentSearchResult, int64) {
	var results []ContentSearchResult
	dbQuery := h.DB.Model(&models.Word{})

	// Apply search filters
	dbQuery = dbQuery.Where("kana ILIKE ? OR romaji ILIKE ? OR english ILIKE ?",
		"%"+query+"%", "%"+query+"%", "%"+query+"%")

	if jlptLevel != nil {
		dbQuery = dbQuery.Where("level = ?", *jlptLevel)
	}

	var words []models.Word
	var total int64
	dbQuery.Count(&total)
	dbQuery.Limit(limit).Offset(offset).Order("level ASC, kana ASC").Find(&words)

	for _, w := range words {
		relevance := 0.5
		matchedField := "english"

		if w.Kana == query || (w.Kanji != nil && *w.Kanji == query) {
			relevance = 1.0
			matchedField = "japanese"
		} else if w.Romaji == query {
			relevance = 0.9
			matchedField = "romaji"
		} else if w.English == query {
			relevance = 0.8
			matchedField = "english"
		}

		results = append(results, ContentSearchResult{
			Type:         "word",
			ID:           int(w.ID),
			Content:      w,
			Relevance:    relevance,
			MatchedField: matchedField,
		})
	}

	return results, total
}

// searchGrammar searches for grammar content (placeholder - grammar model may not exist)
func (h *ContentSearchHandler) searchGrammar(query string, limit, offset int) ([]ContentSearchResult, int64) {
	// Placeholder implementation - grammar model may need to be created
	return []ContentSearchResult{}, 0
}

// searchAll searches across all content types
func (h *ContentSearchHandler) searchAll(query string, jlptLevel *int, limit, offset int) ([]ContentSearchResult, int64) {
	var allResults []ContentSearchResult

	// Search each content type
	kanjiResults, kanjiTotal := h.searchKanji(query, jlptLevel, limit/3, 0)
	wordResults, wordTotal := h.searchWords(query, jlptLevel, limit/3, 0)
	grammarResults, grammarTotal := h.searchGrammar(query, limit/3, 0)

	// Combine results
	allResults = append(allResults, kanjiResults...)
	allResults = append(allResults, wordResults...)
	allResults = append(allResults, grammarResults...)

	total := kanjiTotal + wordTotal + grammarTotal

	// Apply pagination to combined results
	start := offset
	end := offset + limit
	if start >= len(allResults) {
		start = len(allResults)
	}
	if end > len(allResults) {
		end = len(allResults)
	}

	if start < len(allResults) {
		allResults = allResults[start:end]
	} else {
		allResults = []ContentSearchResult{}
	}

	return allResults, total
}

// GetContentRecommendations returns content recommendations based on user level
func (h *ContentSearchHandler) GetContentRecommendations(c *fiber.Ctx) error {
	userID := c.Params("user_id")
	if userID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "User ID is required"})
	}

	userIDInt, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	// Get user's JLPT level
	var userLevel int
	if err := h.DB.Raw("SELECT current_jlpt_level FROM user_settings WHERE user_id = ?", userIDInt).Scan(&userLevel).Error; err != nil {
		userLevel = 5 // Default to N5 if not found
	}

	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if limitInt, err := strconv.Atoi(limitStr); err == nil && limitInt > 0 && limitInt <= 50 {
			limit = limitInt
		}
	}

	var recommendations struct {
		Kanji []kanji.KanjiModel `json:"kanji"`
		Words []models.Word      `json:"words"`
	}

	// Get recommended kanji for user's level
	h.DB.Where("jlpt = ?", userLevel).Order("RANDOM()").Limit(limit / 2).Find(&recommendations.Kanji)

	// Get recommended words for user's level
	h.DB.Where("level = ?", userLevel).Order("RANDOM()").Limit(limit / 2).Find(&recommendations.Words)

	return c.JSON(recommendations)
}

// GetContentStats returns statistics about all content
func (h *ContentSearchHandler) GetContentStats(c *fiber.Ctx) error {
	var stats struct {
		Kanji map[string]int64 `json:"kanji"`
		Words map[string]int64 `json:"words"`
	}

	// Kanji stats
	stats.Kanji = make(map[string]int64)
	var totalKanji int64
	h.DB.Model(&kanji.KanjiModel{}).Count(&totalKanji)
	stats.Kanji["total"] = totalKanji

	var kanjiWithSVG int64
	h.DB.Model(&kanji.KanjiModel{}).Where("strokes_svg IS NOT NULL AND strokes_svg != ''").Count(&kanjiWithSVG)
	stats.Kanji["with_svg"] = kanjiWithSVG

	// Words stats
	stats.Words = make(map[string]int64)
	var totalWords int64
	h.DB.Model(&models.Word{}).Count(&totalWords)
	stats.Words["total"] = totalWords

	return c.JSON(stats)
}

// Helper function to check if a slice contains a string
func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
