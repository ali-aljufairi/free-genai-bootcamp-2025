package group

import (
	"lang-portal/internal/database/models"
	"gorm.io/gorm"
)

// convertModelToGroupResponse converts database model to response type
func convertModelToGroupResponse(g models.Group, db *gorm.DB) GroupResponse {
	// Count words in group
	var wordCount int64
	db.Table("word_groups").Where("group_id = ?", g.ID).Count(&wordCount)
	
	// Count kanji in group
	var kanjiCount int64
	db.Table("kanji_groups").Where("group_id = ?", g.ID).Count(&kanjiCount)
	
	return GroupResponse{
		ID:          g.ID,
		Name:        g.Name,
		Description: g.Description,
		UserID:      g.UserID,
		WordCount:   wordCount,
		KanjiCount:  kanjiCount,
		CreatedAt:   g.CreatedAt,
	}
}

// convertModelsToGroupResponses converts slice of database models to response types
func convertModelsToGroupResponses(groups []models.Group, db *gorm.DB) []GroupResponse {
	result := make([]GroupResponse, len(groups))
	for i, g := range groups {
		result[i] = convertModelToGroupResponse(g, db)
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

