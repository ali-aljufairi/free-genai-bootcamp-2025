package words

import (
	"lang-portal/internal/repositories"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type WordsHandler struct {
	Store *repositories.WordsStore
}

func NewWordsHandler(store *repositories.WordsStore) *WordsHandler {
	return &WordsHandler{Store: store}
}

// GetWords returns paginated words
func (h *WordsHandler) GetWords(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "20"))

	if err := h.validateListParams(page, pageSize); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	words, total, err := h.getWordsFromStore(page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get words",
		})
	}

	totalPages := calculateTotalPages(total, pageSize)

	response := WordResponse{
		Items:      words,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	return c.JSON(response)
}

// SearchWords searches for words based on various criteria
func (h *WordsHandler) SearchWords(c *fiber.Ctx) error {
	var q *string
	if qStr := c.Query("q"); qStr != "" {
		q = &qStr
	}

	var jlpt *int
	if jlptStr := c.Query("jlpt"); jlptStr != "" {
		val, _ := strconv.Atoi(jlptStr)
		jlpt = &val
	}

	var pos *string
	if posStr := c.Query("part_of_speech"); posStr != "" {
		pos = &posStr
	}

	var level *int
	if levelStr := c.Query("level"); levelStr != "" {
		val, _ := strconv.Atoi(levelStr)
		level = &val
	}

	var hasKanji *bool
	if hasKanjiStr := c.Query("has_kanji"); hasKanjiStr != "" {
		val := hasKanjiStr == "true"
		hasKanji = &val
	}

	var groupIDs []int64
	if groupIDStr := c.Query("group_id"); groupIDStr != "" {
		// Support comma-separated group IDs
		ids := strings.Split(groupIDStr, ",")
		for _, idStr := range ids {
			val, _ := strconv.ParseInt(strings.TrimSpace(idStr), 10, 64)
			if val > 0 {
				groupIDs = append(groupIDs, val)
			}
		}
	}

	var limit *int
	if limitStr := c.Query("limit"); limitStr != "" {
		val, _ := strconv.Atoi(limitStr)
		limit = &val
	}

	var offset *int
	if offsetStr := c.Query("offset"); offsetStr != "" {
		val, _ := strconv.Atoi(offsetStr)
		offset = &val
	}

	queryStr := ""
	if q != nil {
		queryStr = *q
	}

	params := buildSearchParams(queryStr, jlpt, pos, level, hasKanji, groupIDs, limit, offset)

	if err := h.validateSearchParams(&params); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	items, total, err := h.searchWordsFromStore(params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search words",
		})
	}

	response := WordSearchResponse{
		Items: items,
		Total: total,
	}

	return c.JSON(response)
}

// GetRandomWord returns a single random word
func (h *WordsHandler) GetRandomWord(c *fiber.Ctx) error {
	word, err := h.Store.GetRandom()
	if err != nil {
		// Log the actual error for debugging
		c.App().Config().ErrorHandler(c, err)
		
		// Return more descriptive error
		errorMsg := "Failed to get random word"
		if err.Error() == "record not found" {
			errorMsg = "No words found in database"
		}
		
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": errorMsg,
			"detail": err.Error(),
		})
	}

	// Use Kanji if available, otherwise use Kana
	japanese := word.Kana
	if word.Kanji != nil && *word.Kanji != "" {
		japanese = *word.Kanji
	}
	
	// Validate that we have valid data
	if japanese == "" && word.Kana == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Word has no readable form",
			"detail": "Both Kanji and Kana are empty",
		})
	}

	// Convert to response format expected by Python service
	response := fiber.Map{
		"id":       word.ID,
		"japanese": japanese,
		"romaji":   word.Romaji,
		"english":  word.English,
		"parts": fiber.Map{
			"type": word.PartOfSpeech,
		},
	}

	return c.JSON(response)
}
