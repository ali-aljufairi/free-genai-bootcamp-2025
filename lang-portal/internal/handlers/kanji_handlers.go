package handlers

import (
	"database/sql/driver"
	"encoding/json"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// JSONBStringArray is a custom type to handle JSONB array of strings
type JSONBStringArray []string

// Value implements the driver.Valuer interface
func (a JSONBStringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return json.Marshal(a)
}

// Scan implements the sql.Scanner interface
func (a *JSONBStringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, a)
	case string:
		return json.Unmarshal([]byte(v), a)
	default:
		return nil
	}
}

type KanjiHandler struct {
	DB *gorm.DB
}

// Kanji models
type Kanji struct {
	ID          int              `json:"id" gorm:"primaryKey"`
	Character   string           `json:"character" gorm:"column:character;uniqueIndex;not null"`
	HeisigEn    *string          `json:"heisig_en" gorm:"column:heisig_en"`
	Meanings    JSONBStringArray `json:"meanings" gorm:"type:jsonb"`
	Detail      *string          `json:"detail"`
	Unicode     string           `json:"unicode" gorm:"uniqueIndex;not null"`
	Onyomi      *string          `json:"onyomi"`
	Kunyomi     *string          `json:"kunyomi"`
	JLPT        *int             `json:"jlpt"`
	Frequency   *int             `json:"frequency"`
	Components  *string          `json:"components"`
	StrokeCount *int             `json:"stroke_count" gorm:"column:stroke_count"`
	StrokesSVG  *string          `json:"strokes_svg" gorm:"column:strokes_svg"`
}

// TableName specifies the table name for Kanji
func (Kanji) TableName() string {
	return "kanji"
}

// KanjiSearchRequest represents kanji search parameters
type KanjiSearchRequest struct {
	JLPT              *int    `json:"jlpt" query:"jlpt"`
	StrokeCount       *int    `json:"stroke_count" query:"stroke_count"`
	Meaning           *string `json:"meaning" query:"meaning"`
	Character         *string `json:"character" query:"character"`
	HasSVG            *bool   `json:"has_svg" query:"has_svg"`
	IncludeSVG        *bool   `json:"include_svg" query:"include_svg"`
	IncludeReadings   *bool   `json:"include_readings" query:"include_readings"`
	IncludeMeanings   *bool   `json:"include_meanings" query:"include_meanings"`
	IncludeComponents *bool   `json:"include_components" query:"include_components"`
	Limit             *int    `json:"limit" query:"limit"`
	Offset            *int    `json:"offset" query:"offset"`
}

// KanjiStrokeData represents kanji stroke order data
type KanjiStrokeData struct {
	Character   string `json:"character"`
	StrokeCount int    `json:"stroke_count"`
	StrokesSVG  string `json:"strokes_svg"`
}

func NewKanjiHandler(db *gorm.DB) *KanjiHandler {
	return &KanjiHandler{DB: db}
}

// GetKanji returns a specific kanji by ID
func (h *KanjiHandler) GetKanji(c *fiber.Ctx) error {
	kanjiID := c.Params("id")
	if kanjiID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Kanji ID is required"})
	}

	kanjiIDInt, err := strconv.Atoi(kanjiID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid kanji ID"})
	}

	var kanji Kanji
	if err := h.DB.First(&kanji, kanjiIDInt).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Kanji not found"})
	}

	return c.JSON(kanji)
}

// GetKanjiByCharacter returns a kanji by its character
func (h *KanjiHandler) GetKanjiByCharacter(c *fiber.Ctx) error {
	character := c.Params("character")
	if character == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Kanji character is required"})
	}

	var kanji Kanji
	if err := h.DB.Where("character = ?", character).First(&kanji).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Kanji not found"})
	}

	return c.JSON(kanji)
}

// SearchKanji searches for kanji based on various criteria
func (h *KanjiHandler) SearchKanji(c *fiber.Ctx) error {
	var req KanjiSearchRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// Build select fields based on include flags
	selectFields := "id, character, unicode"

	if req.IncludeSVG == nil || *req.IncludeSVG {
		selectFields += ", strokes_svg, stroke_count"
	}

	if req.IncludeReadings == nil || *req.IncludeReadings {
		selectFields += ", onyomi, kunyomi"
	}

	if req.IncludeMeanings == nil || *req.IncludeMeanings {
		selectFields += ", meanings, heisig_en, detail"
	}

	if req.IncludeComponents == nil || *req.IncludeComponents {
		selectFields += ", components"
	}

	// Always include JLPT and frequency for sorting
	selectFields += ", jlpt, frequency"

	query := h.DB.Select(selectFields).Model(&Kanji{})

	// Apply filters
	if req.JLPT != nil {
		query = query.Where("jlpt = ?", *req.JLPT)
	}

	if req.StrokeCount != nil {
		query = query.Where("stroke_count = ?", *req.StrokeCount)
	}

	if req.Meaning != nil {
		query = query.Where("meanings::text ILIKE ?", "%"+*req.Meaning+"%")
	}

	if req.Character != nil {
		query = query.Where("character = ?", *req.Character)
	}

	if req.HasSVG != nil && *req.HasSVG {
		query = query.Where("strokes_svg IS NOT NULL AND strokes_svg != ''")
	}

	// Apply pagination
	limit := 50
	if req.Limit != nil && *req.Limit > 0 && *req.Limit <= 100 {
		limit = *req.Limit
	}

	offset := 0
	if req.Offset != nil && *req.Offset >= 0 {
		offset = *req.Offset
	}

	var kanji []Kanji
	if err := query.Limit(limit).Offset(offset).Order("frequency ASC NULLS LAST").Find(&kanji).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to search kanji"})
	}

	return c.JSON(kanji)
}

// GetKanjiByJLPTLevel returns kanji for a specific JLPT level
func (h *KanjiHandler) GetKanjiByJLPTLevel(c *fiber.Ctx) error {
	level := c.Params("level")
	if level == "" {
		return c.Status(400).JSON(fiber.Map{"error": "JLPT level is required"})
	}

	levelInt, err := strconv.Atoi(level)
	if err != nil || levelInt < 1 || levelInt > 5 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JLPT level (1-5)"})
	}

	var kanji []Kanji
	if err := h.DB.Select("id, character, unicode, meanings, heisig_en, detail, onyomi, kunyomi, jlpt, frequency, components, stroke_count, strokes_svg").Where("jlpt = ?", levelInt).Order("frequency ASC NULLS LAST").Find(&kanji).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get kanji"})
	}

	return c.JSON(kanji)
}

// GetKanjiByStrokeCount returns kanji within a stroke count range
func (h *KanjiHandler) GetKanjiByStrokeCount(c *fiber.Ctx) error {
	minStr := c.Params("min")
	maxStr := c.Params("max")

	min, err := strconv.Atoi(minStr)
	if err != nil || min < 1 {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid minimum stroke count"})
	}

	max, err := strconv.Atoi(maxStr)
	if err != nil || max < min {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid maximum stroke count"})
	}

	var kanji []Kanji
	if err := h.DB.Where("stroke_count BETWEEN ? AND ?", min, max).Order("stroke_count ASC").Find(&kanji).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get kanji"})
	}

	return c.JSON(kanji)
}

// GetKanjiWithSVG returns kanji that have SVG stroke data
func (h *KanjiHandler) GetKanjiWithSVG(c *fiber.Ctx) error {
	var kanji []Kanji
	if err := h.DB.Where("strokes_svg IS NOT NULL AND strokes_svg != ''").Order("frequency ASC NULLS LAST").Find(&kanji).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get kanji with SVG"})
	}

	return c.JSON(kanji)
}

// GetKanjiStrokeData returns stroke order data for a kanji
func (h *KanjiHandler) GetKanjiStrokeData(c *fiber.Ctx) error {
	character := c.Params("character")
	if character == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Kanji character is required"})
	}

	var kanji Kanji
	if err := h.DB.Select("character, stroke_count, strokes_svg").Where("character = ?", character).First(&kanji).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Kanji not found"})
	}

	if kanji.StrokesSVG == nil || *kanji.StrokesSVG == "" {
		return c.Status(404).JSON(fiber.Map{"error": "Stroke data not available for this kanji"})
	}

	strokeData := KanjiStrokeData{
		Character:   kanji.Character,
		StrokeCount: *kanji.StrokeCount,
		StrokesSVG:  *kanji.StrokesSVG,
	}

	return c.JSON(strokeData)
}

// GetRandomKanji returns a random kanji
func (h *KanjiHandler) GetRandomKanji(c *fiber.Ctx) error {
	var req KanjiSearchRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	query := h.DB.Model(&Kanji{})

	// Apply filters
	if req.JLPT != nil {
		query = query.Where("jlpt = ?", *req.JLPT)
	}

	if req.StrokeCount != nil {
		query = query.Where("stroke_count = ?", *req.StrokeCount)
	}

	if req.HasSVG != nil && *req.HasSVG {
		query = query.Where("strokes_svg IS NOT NULL AND strokes_svg != ''")
	}

	var kanji Kanji
	if err := query.Order("RANDOM()").Limit(1).First(&kanji).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "No kanji found matching criteria"})
	}

	return c.JSON(kanji)
}

// GetKanjiStats returns statistics about kanji
func (h *KanjiHandler) GetKanjiStats(c *fiber.Ctx) error {
	var stats struct {
		TotalKanji    int64         `json:"total_kanji"`
		WithSVG       int64         `json:"with_svg"`
		ByJLPTLevel   map[int]int64 `json:"by_jlpt_level"`
		ByStrokeCount map[int]int64 `json:"by_stroke_count"`
	}

	// Total kanji count
	h.DB.Model(&Kanji{}).Count(&stats.TotalKanji)

	// Kanji with SVG
	h.DB.Model(&Kanji{}).Where("strokes_svg IS NOT NULL AND strokes_svg != ''").Count(&stats.WithSVG)

	// By JLPT level
	stats.ByJLPTLevel = make(map[int]int64)
	var jlptStats []struct {
		JLPT  int   `json:"jlpt"`
		Count int64 `json:"count"`
	}
	h.DB.Model(&Kanji{}).Select("jlpt, COUNT(*) as count").Where("jlpt IS NOT NULL").Group("jlpt").Scan(&jlptStats)
	for _, stat := range jlptStats {
		stats.ByJLPTLevel[stat.JLPT] = stat.Count
	}

	// By stroke count
	stats.ByStrokeCount = make(map[int]int64)
	var strokeStats []struct {
		StrokeCount int   `json:"stroke_count"`
		Count       int64 `json:"count"`
	}
	h.DB.Model(&Kanji{}).Select("stroke_count, COUNT(*) as count").Where("stroke_count IS NOT NULL").Group("stroke_count").Scan(&strokeStats)
	for _, stat := range strokeStats {
		stats.ByStrokeCount[stat.StrokeCount] = stat.Count
	}

	return c.JSON(stats)
}
