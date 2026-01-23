package group

import (
	"errors"
	"lang-portal/internal/database/models"
)

// validateGroupCreateRequest validates group creation request
func (h *GroupHandler) validateGroupCreateRequest(req *GroupCreateRequest) error {
	if req.Name == "" {
		return errors.New("name is required")
	}

	if len(req.Name) > 100 {
		return errors.New("name cannot exceed 100 characters")
	}

	if req.Description != nil && len(*req.Description) > 500 {
		return errors.New("description cannot exceed 500 characters")
	}

	return nil
}

// validateGroupUpdateRequest validates group update request
func (h *GroupHandler) validateGroupUpdateRequest(req *GroupUpdateRequest) error {
	if req.Name == "" {
		return errors.New("name is required")
	}

	if len(req.Name) > 100 {
		return errors.New("name cannot exceed 100 characters")
	}

	if req.Description != nil && len(*req.Description) > 500 {
		return errors.New("description cannot exceed 500 characters")
	}

	return nil
}

// validateGroupOwnership validates that user owns the group
func (h *GroupHandler) validateGroupOwnership(group *models.Group, userID int64) error {
	if group.UserID == nil {
		// System group - anyone can access
		return nil
	}

	if *group.UserID != userID {
		return errors.New("not authorized to modify this group")
	}

	return nil
}

// validateAddWordRequest validates add word request
func (h *GroupHandler) validateAddWordRequest(req *AddWordRequest) error {
	if req.WordID <= 0 {
		return errors.New("word_id must be positive")
	}
	return nil
}

// validateAddKanjiRequest validates add kanji request
func (h *GroupHandler) validateAddKanjiRequest(req *AddKanjiRequest) error {
	if req.KanjiID <= 0 {
		return errors.New("kanji_id must be positive")
	}
	return nil
}

