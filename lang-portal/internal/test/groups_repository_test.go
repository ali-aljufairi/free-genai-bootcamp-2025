package test

import (
	"os"
	"testing"

	"lang-portal/internal/database/models"
	"lang-portal/internal/repositories"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// newTestDB opens a real Postgres connection using DATABASE_URL,
// mirroring the application's migration tool configuration.
func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set; skipping groups repository tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	return db
}

// cleanUserGroups deletes all groups for the given user to keep tests isolated.
func cleanUserGroups(t *testing.T, db *gorm.DB, userID int64) {
	t.Helper()
	if err := db.Where("user_id = ?", userID).Delete(&models.Group{}).Error; err != nil {
		t.Fatalf("failed to clean groups for user %d: %v", userID, err)
	}
}

func TestGroupsStore_GetOrCreate_Idempotent(t *testing.T) {
	db := newTestDB(t)

	// Use a high test user ID to avoid clashing with real users
	const testUserID int64 = 999999
	const groupName = "Favorites"

	cleanUserGroups(t, db, testUserID)
	defer cleanUserGroups(t, db, testUserID)

	store := repositories.NewGroupsStore(db)

	desc := "Your favorite vocabulary items"

	// First call should create the group
	g1, err := store.GetOrCreate(groupName, &desc, testUserID)
	if err != nil {
		t.Fatalf("GetOrCreate (first) returned error: %v", err)
	}
	if g1 == nil {
		t.Fatal("GetOrCreate (first) returned nil group")
	}

	// Second call should return the same group without error
	g2, err := store.GetOrCreate(groupName, &desc, testUserID)
	if err != nil {
		t.Fatalf("GetOrCreate (second) returned error: %v", err)
	}
	if g2 == nil {
		t.Fatal("GetOrCreate (second) returned nil group")
	}

	if g1.ID != g2.ID {
		t.Fatalf("expected same group ID on subsequent GetOrCreate calls, got %d and %d", g1.ID, g2.ID)
	}
}
