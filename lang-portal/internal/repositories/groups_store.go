package repositories

import (
	"errors"
	"strings"

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
// Handles race conditions and sequence issues gracefully
func (s *GroupsStore) GetOrCreate(name string, description *string, userID int64) (*models.Group, error) {
	var group models.Group

	// First, try to find existing group (outside transaction for better concurrency)
	err := s.DB.Where("user_id = ? AND name = ?", userID, name).First(&group).Error
	if err == nil {
		// Group exists, update description if provided
		if description != nil && (group.Description == nil || *group.Description != *description) {
			group.Description = description
			if updateErr := s.DB.Save(&group).Error; updateErr != nil {
				return nil, updateErr
			}
		}
		return &group, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Unexpected error
		return nil, err
	}

	// Group doesn't exist, try to create it
	// Use a transaction to ensure atomicity
	var newGroup *models.Group
	createErr := s.DB.Transaction(func(tx *gorm.DB) error {
		// Double-check it doesn't exist (race condition check)
		var existingGroup models.Group
		if tx.Where("user_id = ? AND name = ?", userID, name).First(&existingGroup).Error == nil {
			group = existingGroup
			return nil
		}

		// Create new group - let GORM handle the sequence
		newGroup = &models.Group{
			Name:        name,
			Description: description,
			UserID:      &userID,
		}

		if err := tx.Create(newGroup).Error; err != nil {
			return err
		}

		group = *newGroup
		return nil
	})

	// If transaction succeeded, return the group
	if createErr == nil {
		return &group, nil
	}

	// If creation failed due to duplicate key (race condition or sequence issue),
	// try to fetch the group that was created by another transaction
	errStr := createErr.Error()
	if strings.Contains(errStr, "duplicate key") ||
		strings.Contains(errStr, "unique constraint") ||
		strings.Contains(errStr, "groups_pkey") ||
		strings.Contains(errStr, "23505") { // PostgreSQL unique violation error code
		// Another transaction created it, fetch it (outside the failed transaction)
		if fetchErr := s.DB.Where("user_id = ? AND name = ?", userID, name).First(&group).Error; fetchErr == nil {
			return &group, nil
		}
		// If we still can't find it, there might be a sequence issue - try to fix it
		// But first, let's just return the error so we can see what's happening
	}

	// For any other error or if we couldn't recover, return the error
	return nil, createErr
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
