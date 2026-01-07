package kanji

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// KanjiStoreInterface defines the interface for kanji store operations
type KanjiStoreInterface interface {
	Search(params KanjiSearchParams) ([]KanjiModel, int64, error)
	GetRandom(jlpt *int, hasSVG bool) (*KanjiModel, error)
}

type KanjiHandler struct {
	Store KanjiStoreInterface
}

func NewKanjiHandler(store KanjiStoreInterface) *KanjiHandler {
	return &KanjiHandler{Store: store}
}

// SearchKanji searches for kanji with filters
func (h *KanjiHandler) SearchKanji(c *fiber.Ctx) error {
	var q *string
	if qStr := c.Query("q"); qStr != "" {
		q = &qStr
	}

	var jlpt *int
	if jlptStr := c.Query("jlpt"); jlptStr != "" {
		val, _ := strconv.Atoi(jlptStr)
		jlpt = &val
	}

	var strokesMin *int
	if strokesMinStr := c.Query("strokes_min"); strokesMinStr != "" {
		val, _ := strconv.Atoi(strokesMinStr)
		strokesMin = &val
	}

	var strokesMax *int
	if strokesMaxStr := c.Query("strokes_max"); strokesMaxStr != "" {
		val, _ := strconv.Atoi(strokesMaxStr)
		strokesMax = &val
	}

	var hasSVG *bool
	if hasSVGStr := c.Query("has_svg"); hasSVGStr != "" {
		val := hasSVGStr == "true"
		hasSVG = &val
	}

	var freqMin *int
	if freqMinStr := c.Query("frequency_min"); freqMinStr != "" {
		val, _ := strconv.Atoi(freqMinStr)
		freqMin = &val
	}

	var freqMax *int
	if freqMaxStr := c.Query("frequency_max"); freqMaxStr != "" {
		val, _ := strconv.Atoi(freqMaxStr)
		freqMax = &val
	}

	var onyomi *bool
	if onyomiStr := c.Query("onyomi"); onyomiStr != "" {
		val := onyomiStr == "true"
		onyomi = &val
	}

	var kunyomi *bool
	if kunyomiStr := c.Query("kunyomi"); kunyomiStr != "" {
		val := kunyomiStr == "true"
		kunyomi = &val
	}

	var components *string
	if componentsStr := c.Query("components"); componentsStr != "" {
		components = &componentsStr
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
	} else if pageSizeStr := c.Query("pageSize"); pageSizeStr != "" {
		val, _ := strconv.Atoi(pageSizeStr)
		limit = &val
	}

	var offset *int
	if offsetStr := c.Query("offset"); offsetStr != "" {
		val, _ := strconv.Atoi(offsetStr)
		offset = &val
	} else if pageStr := c.Query("page"); pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		if limit != nil {
			val := (page - 1) * *limit
			offset = &val
		}
	}

	queryStr := ""
	if q != nil {
		queryStr = *q
	}

	params := buildSearchParams(queryStr, jlpt, strokesMin, strokesMax, hasSVG,
		freqMin, freqMax, onyomi, kunyomi, components, groupIDs, limit, offset)

	if err := h.validateSearchParams(&params); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	items, total, err := h.searchKanjiFromStore(params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search kanji",
		})
	}

	page := 1
	if params.Offset != nil && params.Limit != nil && *params.Limit > 0 {
		page = (*params.Offset / *params.Limit) + 1
	}
	pageSize := 20
	if params.Limit != nil {
		pageSize = *params.Limit
	}
	totalPages := calculateTotalPages(total, pageSize)

	response := KanjiResponse{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}

	return c.JSON(response)
}

// GetRandomKanji returns a single random kanji
func (h *KanjiHandler) GetRandomKanji(c *fiber.Ctx) error {
	var jlpt *int
	if jlptStr := c.Query("jlpt"); jlptStr != "" {
		val, _ := strconv.Atoi(jlptStr)
		if val >= 0 && val <= 5 {
			jlpt = &val
		}
	}

	hasSVG := c.Query("has_svg", "true") == "true"

	kanjiModel, err := h.Store.GetRandom(jlpt, hasSVG)
	if err != nil {
		// Log the actual error for debugging
		c.App().Config().ErrorHandler(c, err)
		
		errorMsg := "Failed to get random kanji"
		if err.Error() == "record not found" {
			errorMsg = "No kanji found in database"
		}
		
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":  errorMsg,
			"detail": err.Error(),
		})
	}

	// Convert to response format
	response := Kanji{
		ID:          kanjiModel.ID,
		Character:   kanjiModel.Character,
		HeisigEn:    kanjiModel.HeisigEn,
		Meanings:    []string(kanjiModel.Meanings),
		Detail:      kanjiModel.Detail,
		Unicode:     kanjiModel.Unicode,
		Onyomi:      kanjiModel.Onyomi,
		Kunyomi:     kanjiModel.Kunyomi,
		JLPT:        kanjiModel.JLPT,
		Frequency:   kanjiModel.Frequency,
		Components:  kanjiModel.Components,
		StrokeCount: kanjiModel.StrokeCount,
		StrokesSVG:  kanjiModel.StrokesSVG,
		AudioPath:   kanjiModel.AudioPath,
	}

	return c.JSON(response)
}
