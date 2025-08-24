package handlers

import (
	"lang-portal/internal/database"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type GrammarHandler struct {
	DB *database.DB
}

// Grammar models
type GrammarPoint struct {
	ID        int     `json:"id" gorm:"primaryKey"`
	Key       string  `json:"key" gorm:"uniqueIndex;not null"`
	BaseForm  string  `json:"base_form" gorm:"not null"`
	Level     string  `json:"level" gorm:"not null"`
	Structure *string `json:"structure"`
}

type GrammarReading struct {
	ID        int    `json:"id" gorm:"primaryKey"`
	GrammarID int    `json:"grammar_id" gorm:"not null"`
	Kanji     string `json:"kanji"`
	Reading   string `json:"reading"`
}

type GrammarExample struct {
	ID        int    `json:"id" gorm:"primaryKey"`
	GrammarID int    `json:"grammar_id" gorm:"not null"`
	Japanese  string `json:"japanese"`
	English   string `json:"english"`
}

type GrammarDetail struct {
	ID          int    `json:"id" gorm:"primaryKey"`
	GrammarID   int    `json:"grammar_id" gorm:"not null"`
	Explanation string `json:"explanation"`
	Usage       string `json:"usage"`
	Notes       string `json:"notes"`
}

type GrammarRelation struct {
	ID               int    `json:"id" gorm:"primaryKey"`
	GrammarID        int    `json:"grammar_id" gorm:"not null"`
	RelatedGrammarID int    `json:"related_grammar_id" gorm:"not null"`
	RelationType     string `json:"relation_type"`
	RelationStrength int    `json:"relation_strength"`
}

type GrammarPointWithDetails struct {
	GrammarPoint
	Readings  []GrammarReading  `json:"readings"`
	Examples  []GrammarExample  `json:"examples"`
	Details   []GrammarDetail   `json:"details"`
	Relations []GrammarRelation `json:"relations"`
}

// GrammarSearchRequest represents grammar search parameters
type GrammarSearchRequest struct {
	Level     *string `json:"level" query:"level"`
	Structure *string `json:"structure" query:"structure"`
	Key       *string `json:"key" query:"key"`
	BaseForm  *string `json:"base_form" query:"base_form"`
	Limit     *int    `json:"limit" query:"limit"`
	Offset    *int    `json:"offset" query:"offset"`
}

func NewGrammarHandler(db *database.DB) *GrammarHandler {
	return &GrammarHandler{DB: db}
}

// GetGrammarPoint returns a specific grammar point by ID
func (h *GrammarHandler) GetGrammarPoint(c *fiber.Ctx) error {
	grammarID := c.Params("id")
	if grammarID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Grammar ID is required"})
	}

	grammarIDInt, err := strconv.Atoi(grammarID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid grammar ID"})
	}

	var grammar GrammarPointWithDetails
	if err := h.DB.GetDB().First(&grammar.GrammarPoint, grammarIDInt).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Grammar point not found"})
	}

	// Get readings
	if err := h.DB.GetDB().Where("grammar_id = ?", grammarIDInt).Find(&grammar.Readings).Error; err != nil {
		grammar.Readings = []GrammarReading{}
	}

	// Get examples
	if err := h.DB.GetDB().Where("grammar_id = ?", grammarIDInt).Find(&grammar.Examples).Error; err != nil {
		grammar.Examples = []GrammarExample{}
	}

	// Get details
	if err := h.DB.GetDB().Where("grammar_id = ?", grammarIDInt).Find(&grammar.Details).Error; err != nil {
		grammar.Details = []GrammarDetail{}
	}

	// Get relations
	if err := h.DB.GetDB().Where("grammar_id = ?", grammarIDInt).Find(&grammar.Relations).Error; err != nil {
		grammar.Relations = []GrammarRelation{}
	}

	return c.JSON(grammar)
}

// GetGrammarPointByKey returns a grammar point by its key
func (h *GrammarHandler) GetGrammarPointByKey(c *fiber.Ctx) error {
	key := c.Params("key")
	if key == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Grammar key is required"})
	}

	var grammar GrammarPointWithDetails
	if err := h.DB.GetDB().Where("key = ?", key).First(&grammar.GrammarPoint).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Grammar point not found"})
	}

	// Get readings
	if err := h.DB.GetDB().Where("grammar_id = ?", grammar.ID).Find(&grammar.Readings).Error; err != nil {
		grammar.Readings = []GrammarReading{}
	}

	// Get examples
	if err := h.DB.GetDB().Where("grammar_id = ?", grammar.ID).Find(&grammar.Examples).Error; err != nil {
		grammar.Examples = []GrammarExample{}
	}

	// Get details
	if err := h.DB.GetDB().Where("grammar_id = ?", grammar.ID).Find(&grammar.Details).Error; err != nil {
		grammar.Details = []GrammarDetail{}
	}

	// Get relations
	if err := h.DB.GetDB().Where("grammar_id = ?", grammar.ID).Find(&grammar.Relations).Error; err != nil {
		grammar.Relations = []GrammarRelation{}
	}

	return c.JSON(grammar)
}

// SearchGrammarPoints searches for grammar points based on various criteria
func (h *GrammarHandler) SearchGrammarPoints(c *fiber.Ctx) error {
	var req GrammarSearchRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	query := h.DB.GetDB().Model(&GrammarPoint{})

	// Apply filters
	if req.Level != nil {
		query = query.Where("level = ?", *req.Level)
	}

	if req.Structure != nil {
		query = query.Where("structure ILIKE ?", "%"+*req.Structure+"%")
	}

	if req.Key != nil {
		query = query.Where("key ILIKE ?", "%"+*req.Key+"%")
	}

	if req.BaseForm != nil {
		query = query.Where("base_form ILIKE ?", "%"+*req.BaseForm+"%")
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

	var grammarPoints []GrammarPoint
	if err := query.Limit(limit).Offset(offset).Order("level ASC, key ASC").Find(&grammarPoints).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to search grammar points"})
	}

	return c.JSON(grammarPoints)
}

// GetGrammarPointsByLevel returns grammar points for a specific level
func (h *GrammarHandler) GetGrammarPointsByLevel(c *fiber.Ctx) error {
	level := c.Params("level")
	if level == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Grammar level is required"})
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

	var grammarPoints []GrammarPoint
	var total int64

	// Get total count
	h.DB.GetDB().Model(&GrammarPoint{}).Where("level = ?", level).Count(&total)

	// Get paginated results
	if err := h.DB.GetDB().Where("level = ?", level).Limit(limitInt).Offset(offsetInt).Order("key ASC").Find(&grammarPoints).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get grammar points"})
	}

	return c.JSON(fiber.Map{
		"items":   grammarPoints,
		"total":   total,
		"level":   level,
		"limit":   limitInt,
		"offset":  offsetInt,
		"hasMore": offsetInt+limitInt < int(total),
	})
}

// GetGrammarExamples returns examples for a grammar point
func (h *GrammarHandler) GetGrammarExamples(c *fiber.Ctx) error {
	grammarID := c.Params("id")
	if grammarID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Grammar ID is required"})
	}

	grammarIDInt, err := strconv.Atoi(grammarID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid grammar ID"})
	}

	var examples []GrammarExample
	if err := h.DB.GetDB().Where("grammar_id = ?", grammarIDInt).Find(&examples).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get grammar examples"})
	}

	return c.JSON(examples)
}

// GetGrammarReadings returns readings for a grammar point
func (h *GrammarHandler) GetGrammarReadings(c *fiber.Ctx) error {
	grammarID := c.Params("id")
	if grammarID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Grammar ID is required"})
	}

	grammarIDInt, err := strconv.Atoi(grammarID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid grammar ID"})
	}

	var readings []GrammarReading
	if err := h.DB.GetDB().Where("grammar_id = ?", grammarIDInt).Find(&readings).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get grammar readings"})
	}

	return c.JSON(readings)
}

// GetRelatedGrammarPoints returns related grammar points
func (h *GrammarHandler) GetRelatedGrammarPoints(c *fiber.Ctx) error {
	grammarID := c.Params("id")
	if grammarID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Grammar ID is required"})
	}

	grammarIDInt, err := strconv.Atoi(grammarID)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid grammar ID"})
	}

	var relatedGrammar []GrammarPoint
	if err := h.DB.GetDB().Raw(`
		SELECT gp.* 
		FROM grammar_points gp
		JOIN grammar_relations gr ON gp.id = gr.related_grammar_id
		WHERE gr.grammar_id = ?
		ORDER BY gr.relation_strength DESC
	`, grammarIDInt).Scan(&relatedGrammar).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get related grammar points"})
	}

	return c.JSON(relatedGrammar)
}

// GetRandomGrammarPoint returns a random grammar point
func (h *GrammarHandler) GetRandomGrammarPoint(c *fiber.Ctx) error {
	level := c.Query("level")

	query := h.DB.GetDB().Model(&GrammarPoint{})
	if level != "" {
		query = query.Where("level = ?", level)
	}

	var grammar GrammarPoint
	if err := query.Order("RANDOM()").Limit(1).First(&grammar).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "No grammar point found"})
	}

	return c.JSON(grammar)
}

// GetGrammarStats returns statistics about grammar points
func (h *GrammarHandler) GetGrammarStats(c *fiber.Ctx) error {
	var stats struct {
		TotalGrammarPoints int64            `json:"total_grammar_points"`
		ByLevel            map[string]int64 `json:"by_level"`
		WithExamples       int64            `json:"with_examples"`
		WithReadings       int64            `json:"with_readings"`
	}

	// Total grammar points count
	h.DB.GetDB().Model(&GrammarPoint{}).Count(&stats.TotalGrammarPoints)

	// By level
	stats.ByLevel = make(map[string]int64)
	var levelStats []struct {
		Level string `json:"level"`
		Count int64  `json:"count"`
	}
	h.DB.GetDB().Model(&GrammarPoint{}).Select("level, COUNT(*) as count").Group("level").Scan(&levelStats)
	for _, stat := range levelStats {
		stats.ByLevel[stat.Level] = stat.Count
	}

	// With examples
	h.DB.GetDB().Raw("SELECT COUNT(DISTINCT grammar_id) FROM grammar_examples").Scan(&stats.WithExamples)

	// With readings
	h.DB.GetDB().Raw("SELECT COUNT(DISTINCT grammar_id) FROM grammar_readings").Scan(&stats.WithReadings)

	return c.JSON(stats)
}
