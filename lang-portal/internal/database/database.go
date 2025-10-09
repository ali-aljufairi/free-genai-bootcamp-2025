package database

import (
	"fmt"
	"lang-portal/internal/database/models"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// DB represents our database connection
type DB struct {
	db         *gorm.DB // Primary database (SQLite for words, etc.)
	PostgresDB *gorm.DB // PostgreSQL for users and other features
}

// New creates a new database connection (SQLite)
func New(dbPath string) (*DB, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("error opening database: %v", err)
	}

	// Note: AutoMigrate removed - database schema is managed separately

	return &DB{db: db}, nil
}

// NewWithPostgres creates a new database connection with PostgreSQL support
func NewWithPostgres(sqliteDB, postgresDB *gorm.DB) *DB {
	return &DB{
		db:         sqliteDB,
		PostgresDB: postgresDB,
	}
}

// GetDB returns the underlying GORM database instance (SQLite for words)
func (db *DB) GetDB() *gorm.DB {
	return db.db
}

// GetPostgresDB returns the PostgreSQL database instance for users
func (db *DB) GetPostgresDB() *gorm.DB {
	if db.PostgresDB != nil {
		return db.PostgresDB
	}
	// Fallback to SQLite if PostgreSQL not available
	return db.db
}

// Close closes the database connection
func (db *DB) Close() error {
	sqlDB, err := db.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// GetStudySessionWords retrieves words for a specific study session
func (db *DB) GetStudySessionWords(sessionID int64) ([]models.Word, error) {
	var words []models.Word
	err := db.db.Joins("JOIN word_review_items ON words.id = word_review_items.word_id").Where("word_review_items.study_session_id = ?", sessionID).Find(&words).Error
	return words, err
}

// GetStudySessions retrieves all study sessions
func (db *DB) GetStudySessions() ([]models.StudySession, error) {
	var sessions []models.StudySession
	err := db.db.Find(&sessions).Error
	return sessions, err
}

// GetStudySession retrieves a specific study session
func (db *DB) GetStudySession(sessionID int64) (*models.StudySession, error) {
	var session models.StudySession
	err := db.db.First(&session, sessionID).Error
	return &session, err
}

// CreateWordReview creates a new word review entry
func (db *DB) CreateWordReview(sessionID, wordID int64, correct bool) error {
	// First verify the session exists
	var session models.StudySession
	if err := db.db.First(&session, sessionID).Error; err != nil {
		return fmt.Errorf("study session not found: %v", err)
	}

	// Then verify the word exists and is in the same group as the session
	var count int64
	err := db.db.Raw(`
		SELECT COUNT(*) 
		FROM words w 
		JOIN words_groups wg ON w.id = wg.word_id 
		JOIN study_sessions s ON wg.group_id = s.group_id 
		WHERE w.id = ? AND s.id = ?`, wordID, sessionID).Count(&count).Error

	if err != nil {
		return fmt.Errorf("error checking word and session relationship: %v", err)
	}

	if count == 0 {
		return fmt.Errorf("word %d is not part of study session %d's group", wordID, sessionID)
	}

	// All validations passed, create the review
	review := models.WordReviewItem{
		WordID:         wordID,
		StudySessionID: sessionID,
		Correct:        correct,
		CreatedAt:      time.Now(),
	}

	if err := db.db.Create(&review).Error; err != nil {
		return fmt.Errorf("failed to create review: %v", err)
	}

	return nil
}

// ResetStudyHistory resets all study history
func (db *DB) ResetStudyHistory() error {
	return db.db.Where("1 = 1").Delete(&models.WordReviewItem{}).Error
}

// FullReset performs a complete reset of the system
func (db *DB) FullReset() error {
	err := db.db.Where("1 = 1").Delete(&models.WordReviewItem{}).Error
	if err != nil {
		return err
	}
	err = db.db.Where("1 = 1").Delete(&models.StudySession{}).Error
	if err != nil {
		return err
	}
	return db.db.Where("1 = 1").Delete(&models.StudyActivity{}).Error
}

// Migrate runs database migrations from the specified directory
func (db *DB) Migrate(migrationsPath string) error {
	// For now, we're using GORM's auto-migration
	// In the future, we can implement proper migrations using the migrations path
	return nil
}

// GetTotalWordsStudied returns the total number of words studied
func (db *DB) GetTotalWordsStudied() (int64, error) {
	var count int64
	err := db.db.Model(&models.WordReviewItem{}).Distinct("word_id").Count(&count).Error
	return count, err
}

// GetTotalAvailableWords returns the total number of available words
func (db *DB) GetTotalAvailableWords() (int64, error) {
	var count int64
	err := db.db.Model(&models.Word{}).Count(&count).Error
	return count, err
}

// SaveReviewAttempt saves a review attempt
func (db *DB) SaveReviewAttempt(sessionID, wordID int64, isCorrect bool, nextReview time.Time) error {
	review := models.WordReviewItem{
		WordID:         wordID,
		StudySessionID: sessionID,
		Correct:        isCorrect,
		CreatedAt:      time.Now(),
	}
	return db.db.Create(&review).Error
}

// GetWords retrieves words with pagination
func (db *DB) GetWords(page, pageSize int) ([]models.Word, int64, error) {
	var words []models.Word
	var total int64

	// Get total count
	if err := db.db.Model(&models.Word{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	// Get paginated results
	err := db.db.Select("id, japanese, romaji, english, parts").Offset(offset).Limit(pageSize).Find(&words).Error
	if err != nil {
		return nil, 0, err
	}

	return words, total, nil
}

// Health checks if the database connection is healthy
func (db *DB) Health() error {
	sqlDB, err := db.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
