package daily_mission

import (
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}

	schema := []string{
		`CREATE TABLE users (id INTEGER PRIMARY KEY);`,
		`CREATE TABLE daily_mission_configs (
			user_id INTEGER PRIMARY KEY,
			active_variant TEXT NOT NULL,
			motivation_mode TEXT NOT NULL,
			created_at DATETIME,
			updated_at DATETIME
		);`,
		`CREATE TABLE daily_mission_tasks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			activity_key TEXT NOT NULL,
			target_mode TEXT NOT NULL,
			target_value INTEGER NOT NULL,
			display_order INTEGER NOT NULL,
			is_active BOOLEAN NOT NULL,
			created_at DATETIME,
			updated_at DATETIME
		);`,
	}
	for _, stmt := range schema {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("failed to create schema: %v", err)
		}
	}

	if err := db.Exec(`INSERT INTO users(id) VALUES (1)`).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	return db
}

func TestEnsureDefaultsIsIdempotent(t *testing.T) {
	db := setupTestDB(t)
	handler := NewDailyMissionHandler(db)

	if err := handler.ensureDefaults(1); err != nil {
		t.Fatalf("ensureDefaults first call failed: %v", err)
	}
	if err := handler.ensureDefaults(1); err != nil {
		t.Fatalf("ensureDefaults second call failed: %v", err)
	}

	var cfgCount int64
	if err := db.Table("daily_mission_configs").Where("user_id = 1").Count(&cfgCount).Error; err != nil {
		t.Fatalf("failed counting configs: %v", err)
	}
	if cfgCount != 1 {
		t.Fatalf("expected 1 config row, got %d", cfgCount)
	}

	var taskCount int64
	if err := db.Table("daily_mission_tasks").Where("user_id = 1").Count(&taskCount).Error; err != nil {
		t.Fatalf("failed counting tasks: %v", err)
	}
	if taskCount != int64(len(balancedTrioDefaults)) {
		t.Fatalf("expected %d task rows, got %d", len(balancedTrioDefaults), taskCount)
	}
}

func TestNormalizeFunctions(t *testing.T) {
	if got := normalizeVariant("  ANALYTICS "); got != "analytics" {
		t.Fatalf("normalizeVariant expected analytics, got %s", got)
	}
	if got := normalizeMode(""); got != "sessions" {
		t.Fatalf("normalizeMode expected sessions for empty mode, got %s", got)
	}
	if got := normalizeMode(" ITEMS "); got != "items" {
		t.Fatalf("normalizeMode expected items, got %s", got)
	}
}

func TestDayBoundsInLocation(t *testing.T) {
	loc := loadLocationOrUTC("Asia/Tokyo")
	ref := time.Date(2026, 2, 6, 10, 30, 0, 0, loc)

	startUTC, endUTC, label := dayBoundsInLocation(ref, loc)
	if label != "2026-02-06" {
		t.Fatalf("expected date label 2026-02-06, got %s", label)
	}
	if !startUTC.Before(endUTC) {
		t.Fatalf("expected start before end")
	}
	if endUTC.Sub(startUTC) != 24*time.Hour {
		t.Fatalf("expected 24 hour range, got %s", endUTC.Sub(startUTC))
	}
}
