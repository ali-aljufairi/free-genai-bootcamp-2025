package grammar

import (
	"fmt"
	"lang-portal/internal/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// GrammarBrowseHandler handles grammar browsing operations
type GrammarBrowseHandler struct {
	store *repositories.GrammarStore
}

func NewGrammarBrowseHandler(store *repositories.GrammarStore) *GrammarBrowseHandler {
	return &GrammarBrowseHandler{store: store}
}

// getUserID gets user ID from context - requires authentication
func (h *GrammarBrowseHandler) getUserID(c *fiber.Ctx) (int64, error) {
	// Get user ID from context (set by auth middleware)
	userIDInterface := c.Locals("user_id")
	if userIDInterface == nil {
		return 0, fmt.Errorf("user not authenticated")
	}

	userID, ok := userIDInterface.(int64)
	if !ok || userID == 0 {
		return 0, fmt.Errorf("invalid user ID in context")
	}

	return userID, nil
}

// ListGrammarPoints lists all grammar points for user's JLPT level (and below)
func (h *GrammarBrowseHandler) ListGrammarPoints(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	grammarPoints, err := h.store.ListGrammarPoints(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get grammar points",
		})
	}

	return c.JSON(grammarPoints)
}

// GetGrammarPointDetail gets a full grammar point with all details
func (h *GrammarBrowseHandler) GetGrammarPointDetail(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	grammarIDStr := c.Params("id")
	if grammarIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Grammar point ID is required",
		})
	}

	grammarID, err := strconv.ParseInt(grammarIDStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid grammar point ID",
		})
	}

	detail, err := h.store.GetGrammarPointDetail(grammarID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Grammar point not found",
		})
	}

	// Check if user has already learned this grammar point
	isLearned, err := h.store.CheckGrammarLearnedStatus(userID, grammarID)
	if err == nil {
		// Add learned status to response (we'll extend the type on frontend)
		response := map[string]interface{}{
			"id":         detail.ID,
			"key":        detail.Key,
			"base_form":  detail.BaseForm,
			"level":      detail.Level,
			"structure":  detail.Structure,
			"examples":   detail.Examples,
			"details":    detail.Details,
			"readings":   detail.Readings,
			"is_learned": isLearned,
		}
		return c.JSON(response)
	}

	return c.JSON(detail)
}

// GetRecentGrammarProgress gets user's recently studied grammar points for chat context
func (h *GrammarBrowseHandler) GetRecentGrammarProgress(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Get limit from query param, default to 10
	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 50 {
		limit = 10
	}

	recentGrammar, err := h.store.GetRecentGrammarProgress(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get recent grammar progress",
		})
	}

	return c.JSON(recentGrammar)
}

// MarkGrammarAsLearned marks a grammar point as learned and adds it to SRS
func (h *GrammarBrowseHandler) MarkGrammarAsLearned(c *fiber.Ctx) error {
	userID, err := h.getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	grammarIDStr := c.Params("id")
	if grammarIDStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Grammar point ID is required",
		})
	}

	grammarID, err := strconv.ParseInt(grammarIDStr, 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid grammar point ID",
		})
	}

	// Verify grammar point exists
	_, err = h.store.GetGrammarPointDetail(grammarID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Grammar point not found",
		})
	}

	// Mark as learned using SRS function (correct = true means learned)
	err = h.store.MarkGrammarAsLearned(userID, grammarID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to mark grammar as learned",
		})
	}

	return c.JSON(fiber.Map{
		"message":    "Grammar point marked as learned",
		"grammar_id": grammarID,
	})
}
