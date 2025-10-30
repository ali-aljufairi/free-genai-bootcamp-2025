package services

import (
	"errors"
	"lang-portal/internal/repositories"
	"gorm.io/gorm"
)

type FavoriteService struct {
	UsersStore *repositories.UsersStore
	GroupsStore *repositories.GroupsStore
	DB         *gorm.DB
}

func NewFavoriteService(usersStore *repositories.UsersStore, groupsStore *repositories.GroupsStore, db *gorm.DB) *FavoriteService {
	return &FavoriteService{
		UsersStore: usersStore,
		GroupsStore: groupsStore,
		DB:         db,
	}
}

// SetFavoriteGroup sets a user's favorite group with validation
func (s *FavoriteService) SetFavoriteGroup(userID int64, groupID *int64) error {
	if groupID != nil {
		// Verify group exists and user has access
		group, err := s.GroupsStore.GetByID(*groupID)
		if err != nil {
			return errors.New("group not found")
		}

		// Check if user owns the group or if it's a system group (user_id is nil)
		if group.UserID != nil && *group.UserID != userID {
			return errors.New("not authorized to set this group as favorite")
		}
	}

	return s.UsersStore.SetFavoriteGroup(userID, groupID)
}

