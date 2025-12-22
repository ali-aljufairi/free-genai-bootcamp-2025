package repositories

import (
	"errors"

	"lang-portal/internal/database/models"

	"gorm.io/gorm"
)

type GroupsStore struct {
	DB *gorm.DB
}

func NewGroupsStore(db *gorm.DB) *GroupsStore {
	return &GroupsStore{DB: db}
}

// ListByUser returns groups owned by a user
func (s *GroupsStore) ListByUser(userID int64) ([]models.Group, error) {
	var groups []models.Group
	err := s.DB.Where("user_id = ?", userID).Find(&groups).Error
	return groups, err
}

// Create creates a new group
func (s *GroupsStore) Create(name string, description *string, userID int64) (*models.Group, error) {
	group := &models.Group{
		Name:        name,
		Description: description,
		UserID:      &userID,
	}
	err := s.DB.Create(group).Error
	return group, err
}

// GetOrCreate returns an existing group or creates a new one if it doesn't exist
// Checks for existing group by user_id AND name (each user has their own groups)
// Uses raw SQL with ON CONFLICT to handle the partial unique index properly
func (s *GroupsStore) GetOrCreate(name string, description *string, userID int64) (*models.Group, error) {
	var group models.Group

	// Use a transaction to ensure atomicity
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// First, try to find existing group
		err := tx.Where("user_id = ? AND name = ?", userID, name).First(&group).Error
		if err == nil {
			// Group exists, update description if provided
			if description != nil && (group.Description == nil || *group.Description != *description) {
				group.Description = description
				if updateErr := tx.Save(&group).Error; updateErr != nil {
					return updateErr
				}
			}
			return nil
		}

		if !errors.Is(err, gorm.ErrRecordNotFound) {
			// Unexpected error
			return err
		}

		// Group doesn't exist, create it using raw SQL with ON CONFLICT
		// The partial index idx_groups_user_name applies when user_id IS NOT NULL
		// PostgreSQL allows ON CONFLICT to reference the columns even for partial indexes
		result := tx.Exec(`
			INSERT INTO groups (name, description, user_id, created_at)
			VALUES (?, ?, ?, NOW())
			ON CONFLICT (user_id, name) 
			WHERE user_id IS NOT NULL
			DO UPDATE SET 
				description = EXCLUDED.description
		`, name, description, userID)

		if result.Error != nil {
			return result.Error
		}

		// Fetch the created/updated group
		return tx.Where("user_id = ? AND name = ?", userID, name).First(&group).Error
	})

	if err != nil {
		return nil, err
	}

	return &group, nil
}

// GetByID returns a group by ID
func (s *GroupsStore) GetByID(id int64) (*models.Group, error) {
	var group models.Group
	err := s.DB.First(&group, id).Error
	return &group, err
}

// AddWord adds a word to a group
func (s *GroupsStore) AddWord(groupID, wordID int64) error {
	// Check if word_groups table exists, if not create entry
	wordGroup := map[string]interface{}{
		"group_id": groupID,
		"word_id":  wordID,
	}
	return s.DB.Table("word_groups").Create(wordGroup).Error
}

// RemoveWord removes a word from a group
func (s *GroupsStore) RemoveWord(groupID, wordID int64) error {
	return s.DB.Table("word_groups").
		Where("group_id = ? AND word_id = ?", groupID, wordID).
		Delete(nil).Error
}

// AddKanji adds a kanji to a group
func (s *GroupsStore) AddKanji(groupID, kanjiID int64) error {
	kanjiGroup := map[string]interface{}{
		"group_id": groupID,
		"kanji_id": kanjiID,
	}
	return s.DB.Table("kanji_groups").Create(kanjiGroup).Error
}

// RemoveKanji removes a kanji from a group
func (s *GroupsStore) RemoveKanji(groupID, kanjiID int64) error {
	return s.DB.Table("kanji_groups").
		Where("group_id = ? AND kanji_id = ?", groupID, kanjiID).
		Delete(nil).Error
}
