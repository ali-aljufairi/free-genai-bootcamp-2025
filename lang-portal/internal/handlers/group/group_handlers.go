package group

import (
	"lang-portal/internal/repositories"
	"lang-portal/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type GroupHandler struct {
	Store   *repositories.GroupsStore
	Service *services.GroupsService
}

func NewGroupHandler(store *repositories.GroupsStore, service *services.GroupsService) *GroupHandler {
	return &GroupHandler{
		Store:   store,
		Service: service,
	}
}

// GetGroups returns groups for the current user
func (h *GroupHandler) GetGroups(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	groups, err := h.getGroupsFromStore(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get groups"})
	}

	return c.JSON(groups)
}

// CreateGroup creates a new group
func (h *GroupHandler) CreateGroup(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	var req GroupCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.validateGroupCreateRequest(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	group, err := h.createGroupInStore(req.Name, req.Description, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(group)
}

// AddWord adds a word to a group
func (h *GroupHandler) AddWord(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	groupID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	if _, err := h.verifyGroupExistsAndOwnership(groupID, userID); err != nil {
		return c.Status(403).JSON(fiber.Map{"error": err.Error()})
	}

	var req AddWordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.validateAddWordRequest(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.Service.AddWord(groupID, req.WordID, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

// RemoveWord removes a word from a group
func (h *GroupHandler) RemoveWord(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	groupID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	wordID, err := strconv.ParseInt(c.Params("wordId"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid word ID"})
	}

	if _, err := h.verifyGroupExistsAndOwnership(groupID, userID); err != nil {
		return c.Status(403).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.Service.RemoveWord(groupID, wordID, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

// AddKanji adds a kanji to a group
func (h *GroupHandler) AddKanji(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	groupID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	if _, err := h.verifyGroupExistsAndOwnership(groupID, userID); err != nil {
		return c.Status(403).JSON(fiber.Map{"error": err.Error()})
	}

	var req AddKanjiRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.validateAddKanjiRequest(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.Service.AddKanji(groupID, req.KanjiID, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

// RemoveKanji removes a kanji from a group
func (h *GroupHandler) RemoveKanji(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return c.Status(401).JSON(fiber.Map{"error": "User not authenticated"})
	}

	groupID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid group ID"})
	}

	kanjiID, err := strconv.ParseInt(c.Params("kanjiId"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid kanji ID"})
	}

	if _, err := h.verifyGroupExistsAndOwnership(groupID, userID); err != nil {
		return c.Status(403).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.Service.RemoveKanji(groupID, kanjiID, userID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

