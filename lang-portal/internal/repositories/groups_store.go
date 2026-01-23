package repositories

import (
	"database/sql"
	"errors"
	"log"
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

// fixGroupsSequence fixes the groups_id_seq sequence using advisory locks to prevent concurrent fixes
// Returns error if sequence fix fails
func (s *GroupsStore) fixGroupsSequence() error {
	sqlDB, err := s.DB.DB()
	if err != nil {
		return err
	}

	// Use advisory lock to prevent concurrent sequence fixes
	// Lock key: hash of "groups_sequence_fix" (using a simple numeric key)
	// PostgreSQL advisory locks use bigint keys, we'll use a hash-like number
	const lockKey = 123456789012345 // Simple numeric key for groups sequence fix

	// Try to acquire advisory lock with timeout (5 seconds)
	var lockAcquired bool
	err = sqlDB.QueryRow("SELECT pg_try_advisory_lock($1)", lockKey).Scan(&lockAcquired)
	if err != nil {
		log.Printf("[GroupsStore] Failed to acquire advisory lock for sequence fix: %v", err)
		return err
	}

	if !lockAcquired {
		log.Printf("[GroupsStore] Advisory lock already held by another process, skipping sequence fix")
		return nil // Another process is fixing it, we can proceed
	}

	// Ensure lock is released when done
	defer func() {
		_, unlockErr := sqlDB.Exec("SELECT pg_advisory_unlock($1)", lockKey)
		if unlockErr != nil {
			log.Printf("[GroupsStore] Failed to release advisory lock: %v", unlockErr)
		}
	}()

	// Get current sequence value before fix
	var currentSeqValue int64
	err = sqlDB.QueryRow("SELECT last_value FROM groups_id_seq").Scan(&currentSeqValue)
	if err != nil {
		log.Printf("[GroupsStore] Failed to get current sequence value: %v", err)
		return err
	}

	// Get max ID from groups table
	var maxID sql.NullInt64
	err = sqlDB.QueryRow("SELECT MAX(id) FROM groups").Scan(&maxID)
	if err != nil {
		log.Printf("[GroupsStore] Failed to get max ID from groups table: %v", err)
		return err
	}

	maxIDValue := int64(0)
	if maxID.Valid {
		maxIDValue = maxID.Int64
	}

	// Try to call the PostgreSQL function to fix the sequence
	// If the function doesn't exist (migration not run), fall back to direct SQL
	var newSeqValue int64
	_, err = sqlDB.Exec("SELECT fix_groups_sequence()")
	if err != nil {
		// Function might not exist yet, fall back to direct SQL approach
		log.Printf("[GroupsStore] PostgreSQL function fix_groups_sequence() not available, using direct SQL: %v", err)

		// Use direct SQL to fix the sequence (same logic as the function)
		newSeqValue = maxIDValue + 1
		if currentSeqValue > newSeqValue {
			newSeqValue = currentSeqValue // Never decrease the sequence
		}

		_, err = sqlDB.Exec("SELECT setval('groups_id_seq', $1, true)", newSeqValue)
		if err != nil {
			log.Printf("[GroupsStore] Failed to fix groups sequence using direct SQL: %v", err)
			return err
		}
		log.Printf("[GroupsStore] Fixed groups sequence using direct SQL: max_id=%d, old_seq=%d, new_seq=%d", maxIDValue, currentSeqValue, newSeqValue)
		return nil
	}

	// Get new sequence value after fix (when using the function)
	err = sqlDB.QueryRow("SELECT last_value FROM groups_id_seq").Scan(&newSeqValue)
	if err != nil {
		log.Printf("[GroupsStore] Failed to get new sequence value after fix: %v", err)
		// Don't return error here, the fix might have succeeded
	} else {
		log.Printf("[GroupsStore] Fixed groups sequence using function: max_id=%d, old_seq=%d, new_seq=%d", maxIDValue, currentSeqValue, newSeqValue)
	}

	return nil
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

	// Check if this is a PRIMARY KEY violation (sequence issue)
	errStr := createErr.Error()
	isPrimaryKeyViolation := strings.Contains(errStr, "groups_pkey") && strings.Contains(errStr, "23505")
	isDuplicateKey := strings.Contains(errStr, "duplicate key") || strings.Contains(errStr, "unique constraint") || strings.Contains(errStr, "23505")

	if isPrimaryKeyViolation {
		// This is a PRIMARY KEY violation, likely a sequence issue
		log.Printf("[GroupsStore] PRIMARY KEY violation detected when creating group '%s' for user %d: %v", name, userID, createErr)

		// Attempt to fix the sequence
		if fixErr := s.fixGroupsSequence(); fixErr != nil {
			log.Printf("[GroupsStore] Failed to fix sequence after PRIMARY KEY violation: %v", fixErr)
			// Continue to retry logic anyway
		}

		// Retry the INSERT once after fixing the sequence
		log.Printf("[GroupsStore] Retrying group creation after sequence fix")
		retryErr := s.DB.Transaction(func(tx *gorm.DB) error {
			// Double-check it doesn't exist (another transaction might have created it)
			var existingGroup models.Group
			if tx.Where("user_id = ? AND name = ?", userID, name).First(&existingGroup).Error == nil {
				group = existingGroup
				return nil
			}

			// Retry creating the group
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

		if retryErr == nil {
			log.Printf("[GroupsStore] Successfully created group '%s' for user %d after sequence fix", name, userID)
			return &group, nil
		}

		// If retry also failed, check if another transaction created it
		log.Printf("[GroupsStore] Retry failed, checking if group was created by another transaction: %v", retryErr)
		if fetchErr := s.DB.Where("user_id = ? AND name = ?", userID, name).First(&group).Error; fetchErr == nil {
			log.Printf("[GroupsStore] Found group created by another transaction")
			return &group, nil
		}

		// Still failed, return the original error
		log.Printf("[GroupsStore] Failed to create group after sequence fix and retry: %v", retryErr)
		return nil, createErr
	}

	if isDuplicateKey {
		// This might be a unique constraint violation on (user_id, name) - another transaction created it
		log.Printf("[GroupsStore] Duplicate key error detected, checking if group exists: %v", createErr)
		if fetchErr := s.DB.Where("user_id = ? AND name = ?", userID, name).First(&group).Error; fetchErr == nil {
			log.Printf("[GroupsStore] Found group created by another transaction")
			return &group, nil
		}
	}

	// For any other error or if we couldn't recover, return the error
	log.Printf("[GroupsStore] Failed to create group '%s' for user %d: %v", name, userID, createErr)
	return nil, createErr
}

// GetByID returns a group by ID
func (s *GroupsStore) GetByID(id int64) (*models.Group, error) {
	var group models.Group
	err := s.DB.First(&group, id).Error
	return &group, err
}

// Update updates a group's name and description
// Validates name uniqueness per user (if user_id is set)
func (s *GroupsStore) Update(id int64, name string, description *string) (*models.Group, error) {
	var group models.Group
	if err := s.DB.First(&group, id).Error; err != nil {
		return nil, err
	}

	// Check for name conflicts with other groups from the same user
	// If user_id is nil (system group), check against other system groups
	// If user_id is set, check against other groups from the same user
	var existingGroup models.Group
	query := s.DB.Where("id != ? AND name = ?", id, name)
	
	if group.UserID == nil {
		// System group - check against other system groups
		query = query.Where("user_id IS NULL")
	} else {
		// User group - check against other groups from the same user
		query = query.Where("user_id = ?", *group.UserID)
	}
	
	if err := query.First(&existingGroup).Error; err == nil {
		// Another group with the same name exists
		return nil, errors.New("a group with this name already exists")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Unexpected error
		return nil, err
	}

	// Update the group
	group.Name = name
	group.Description = description
	if err := s.DB.Save(&group).Error; err != nil {
		return nil, err
	}

	return &group, nil
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
