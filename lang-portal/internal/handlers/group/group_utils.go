package group

import (
	"lang-portal/internal/database/models"
)

// convertModelToGroupResponse converts database model to response type
func convertModelToGroupResponse(g models.Group) GroupResponse {
	return GroupResponse{
		ID:          g.ID,
		Name:        g.Name,
		Description: g.Description,
		UserID:      g.UserID,
		CreatedAt:   g.CreatedAt,
	}
}

// convertModelsToGroupResponses converts slice of database models to response types
func convertModelsToGroupResponses(groups []models.Group) []GroupResponse {
	result := make([]GroupResponse, len(groups))
	for i, g := range groups {
		result[i] = convertModelToGroupResponse(g)
	}
	return result
}

// buildGroupCreateRequest builds a create request from HTTP body
func buildGroupCreateRequest(name string, description *string) GroupCreateRequest {
	return GroupCreateRequest{
		Name:        name,
		Description: description,
	}
}

