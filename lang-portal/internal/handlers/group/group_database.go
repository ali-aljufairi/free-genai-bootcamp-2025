package group

import (
	"lang-portal/internal/database/models"
)

// getGroupsFromStore retrieves groups from the store and converts them
func (h *GroupHandler) getGroupsFromStore(userID int64) ([]GroupResponse, error) {
	groups, err := h.Store.ListByUser(userID)
	if err != nil {
		return nil, err
	}

	converted := convertModelsToGroupResponses(groups, h.Store.DB)
	return converted, nil
}

// createGroupInStore creates a group in the store and converts it
func (h *GroupHandler) createGroupInStore(name string, description *string, userID int64) (*GroupResponse, error) {
	group, err := h.Service.CreateGroup(name, description, userID)
	if err != nil {
		return nil, err
	}

	converted := convertModelToGroupResponse(*group, h.Store.DB)
	return &converted, nil
}

// verifyGroupExistsAndOwnership verifies group exists and user has access
func (h *GroupHandler) verifyGroupExistsAndOwnership(groupID, userID int64) (*models.Group, error) {
	group, err := h.Store.GetByID(groupID)
	if err != nil {
		return nil, err
	}

	if err := h.validateGroupOwnership(group, userID); err != nil {
		return nil, err
	}

	return group, nil
}

