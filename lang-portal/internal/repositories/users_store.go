package repositories

import (
	"lang-portal/internal/database/models"
	"gorm.io/gorm"
)

type UsersStore struct {
	DB *gorm.DB
}

func NewUsersStore(db *gorm.DB) *UsersStore {
	return &UsersStore{DB: db}
}

// SetFavoriteGroup sets a user's favorite group
func (s *UsersStore) SetFavoriteGroup(userID int64, groupID *int64) error {
	return s.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("favorite_group_id", groupID).Error
}

// GetByID returns a user by ID
func (s *UsersStore) GetByID(id int64) (*models.User, error) {
	var user models.User
	err := s.DB.First(&user, id).Error
	return &user, err
}

