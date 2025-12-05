package main

import (
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var (
	dbURL = flag.String("db", "", "Database connection string (or use DATABASE_URL env var)")
)

func main() {
	flag.Parse()

	connStr := *dbURL
	if connStr == "" {
		connStr = os.Getenv("DATABASE_URL")
	}
	if connStr == "" {
		log.Fatal("DATABASE_URL environment variable or -db flag required")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	log.Println("Validating database schema and data...")

	errors := []string{}
	warnings := []string{}

	// Check core tables exist
	coreTables := []string{
		"users", "roles", "user_roles", "user_settings",
		"kanji", "words", "grammar_points", "sentences",
		"jlpt_questions", "study_activities", "progress",
		"item_relations", "courses", "units",
	}

	for _, table := range coreTables {
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = $1
			)`, table).Scan(&exists)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to check table %s: %v", table, err))
			continue
		}
		if !exists {
			errors = append(errors, fmt.Sprintf("Missing required table: %s", table))
		}
	}

	// Check critical functions exist
	criticalFunctions := []string{
		"import_kanji_data", "import_words_data", "import_grammar_data",
		"import_jlpt_questions", "hiragana_to_romaji", "update_srs_progress",
	}

	for _, funcName := range criticalFunctions {
		var exists bool
		err := db.QueryRow(`
			SELECT EXISTS (
				SELECT FROM pg_proc 
				WHERE proname = $1
			)`, funcName).Scan(&exists)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to check function %s: %v", funcName, err))
			continue
		}
		if !exists {
			errors = append(errors, fmt.Sprintf("Missing required function: %s", funcName))
		}
	}

	// Check minimum row counts for seeded data
	type rowCheck struct {
		table      string
		minRows    int
		description string
	}

	rowChecks := []rowCheck{
		{"kanji", 1000, "Kanji data"},
		{"words", 5000, "Words data"},
		{"jlpt_questions", 1000, "JLPT questions"},
		{"grammar_points", 100, "Grammar points"},
	}

	for _, check := range rowChecks {
		var count int
		err := db.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", check.table)).Scan(&count)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("Failed to count rows in %s: %v", check.table, err))
			continue
		}
		if count < check.minRows {
			warnings = append(warnings, fmt.Sprintf("%s: Only %d rows (expected at least %d)", check.description, count, check.minRows))
		} else {
			log.Printf("✓ %s: %d rows", check.description, count)
		}
	}

	// Check migrations table exists and has entries
	var migrationCount int
	err = db.QueryRow("SELECT COUNT(*) FROM goose_db_version").Scan(&migrationCount)
	if err != nil {
		warnings = append(warnings, fmt.Sprintf("Migrations table check failed: %v", err))
	} else {
		if migrationCount < 10 {
			warnings = append(warnings, fmt.Sprintf("Only %d migrations applied (expected 10)", migrationCount))
		} else {
			log.Printf("✓ Migrations: %d applied", migrationCount)
		}
	}

	// Report results
	if len(errors) > 0 {
		log.Println("\n❌ VALIDATION ERRORS:")
		for _, err := range errors {
			log.Printf("  - %s", err)
		}
		os.Exit(1)
	}

	if len(warnings) > 0 {
		log.Println("\n⚠️  VALIDATION WARNINGS:")
		for _, warn := range warnings {
			log.Printf("  - %s", warn)
		}
	}

	log.Println("\n✅ Database validation passed!")
}





