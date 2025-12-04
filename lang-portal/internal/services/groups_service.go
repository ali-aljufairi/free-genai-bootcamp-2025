package services

import (
	"errors"
	"lang-portal/internal/database/models"
	"lang-portal/internal/repositories"

	"gorm.io/gorm"
)

type GroupsService struct {
	Store *repositories.GroupsStore
	DB    *gorm.DB
}

func NewGroupsService(store *repositories.GroupsStore, db *gorm.DB) *GroupsService {
	return &GroupsService{
		Store: store,
		DB:    db,
	}
}

// CreateGroup creates a group with ownership check (idempotent - uses GetOrCreate)
func (s *GroupsService) CreateGroup(name string, description *string, userID int64) (*models.Group, error) {
	return s.Store.GetOrCreate(name, description, userID)
}

// AddWord adds a word to a group with ownership check
func (s *GroupsService) AddWord(groupID, wordID, userID int64) error {
	group, err := s.Store.GetByID(groupID)
	if err != nil {
		return errors.New("group not found")
	}

	if group.UserID == nil || *group.UserID != userID {
		return errors.New("not authorized to modify this group")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		// Verify word exists
		var word models.Word
		if err := tx.First(&word, wordID).Error; err != nil {
			return errors.New("word not found")
		}

		// Check if word is already in group
		var existingCount int64
		tx.Table("word_groups").
			Where("group_id = ? AND word_id = ?", groupID, wordID).
			Count(&existingCount)

		if existingCount > 0 {
			// Word already in group, return success (idempotent)
			return nil
		}

		// Add to group
		return tx.Table("word_groups").Create(map[string]interface{}{
			"group_id": groupID,
			"word_id":  wordID,
		}).Error
	})
}

// RemoveWord removes a word from a group with ownership check
func (s *GroupsService) RemoveWord(groupID, wordID, userID int64) error {
	group, err := s.Store.GetByID(groupID)
	if err != nil {
		return errors.New("group not found")
	}

	if group.UserID == nil || *group.UserID != userID {
		return errors.New("not authorized to modify this group")
	}

	return s.Store.RemoveWord(groupID, wordID)
}

// AddKanji adds a kanji to a group with ownership check
func (s *GroupsService) AddKanji(groupID, kanjiID, userID int64) error {
	group, err := s.Store.GetByID(groupID)
	if err != nil {
		return errors.New("group not found")
	}

	if group.UserID == nil || *group.UserID != userID {
		return errors.New("not authorized to modify this group")
	}

	return s.DB.Transaction(func(tx *gorm.DB) error {
		// Verify kanji exists
		var kanji struct {
			ID int `gorm:"primaryKey"`
		}
		if err := tx.Table("kanji").Where("id = ?", kanjiID).First(&kanji).Error; err != nil {
			return errors.New("kanji not found")
		}

		// Check if kanji is already in group
		var existingCount int64
		tx.Table("kanji_groups").
			Where("group_id = ? AND kanji_id = ?", groupID, kanjiID).
			Count(&existingCount)

		if existingCount > 0 {
			// Kanji already in group, return success (idempotent)
			return nil
		}

		// Add to group
		return tx.Table("kanji_groups").Create(map[string]interface{}{
			"group_id": groupID,
			"kanji_id": kanjiID,
		}).Error
	})
}

// RemoveKanji removes a kanji from a group with ownership check
func (s *GroupsService) RemoveKanji(groupID, kanjiID, userID int64) error {
	group, err := s.Store.GetByID(groupID)
	if err != nil {
		return errors.New("group not found")
	}

	if group.UserID == nil || *group.UserID != userID {
		return errors.New("not authorized to modify this group")
	}

	return s.Store.RemoveKanji(groupID, kanjiID)
}
