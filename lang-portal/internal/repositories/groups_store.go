package repositories

import (
	"errors"

	"lang-portal/internal/database/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
func (s *GroupsStore) GetOrCreate(name string, description *string, userID int64) (*models.Group, error) {
	var group models.Group

	// Prepare desired values
	newGroup := models.Group{
		Name:        name,
		Description: description,
		UserID:      &userID,
	}

	// Use an atomic upsert based on (user_id, name).
	// This leverages the partial unique index idx_groups_user_name on (user_id, name) where user_id IS NOT NULL.
	err := s.DB.
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "name"}},
			DoUpdates: clause.AssignmentColumns([]string{"description"}),
		}).
		Create(&newGroup).Error

	if err == nil {
		// Either inserted or updated the existing row; newGroup now has the correct ID.
		return &newGroup, nil
	}

	// In rare cases (e.g., unexpected constraint issues), fall back to a direct lookup
	// so that callers can still obtain the existing group if it was created concurrently.
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		if lookupErr := s.DB.Where("user_id = ? AND name = ?", userID, name).First(&group).Error; lookupErr == nil {
			return &group, nil
		}
	}

	return nil, err
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
