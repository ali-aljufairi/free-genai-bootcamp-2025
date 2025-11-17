package main

import (
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// Load .env file
	if err := loadEnvFile("../.env"); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	// Handle analyze command first (no DB connection needed)
	if len(os.Args) > 1 && os.Args[1] == "analyze" {
		analyzeJLPTData()
		return
	}

	config := loadConfig()

	db, err := connectDB(config)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	log.Println("Connected to PostgreSQL database")

	// Import all data in the correct order
	log.Println("Starting complete data import...")

	// 1. Import core content first
	if err := importKanjiData(db); err != nil {
		log.Fatal("Kanji import failed:", err)
	}

	// Import SVG strokes for kanji
	if err := importKanjiSVGStrokes(db); err != nil {
		log.Fatal("Kanji SVG stroke import failed:", err)
	}

	// Create JLPT-based kanji groups in chunks of 15 (levels 1..5 only)
	if _, err := db.Exec("SELECT created_groups, linked_kanji FROM create_kanji_groups_by_jlpt($1)", 15); err != nil {
		log.Printf("Warning: Failed to create JLPT kanji groups: %v", err)
	} else {
		log.Println("JLPT kanji groups (chunks of 15) created/updated successfully")
	}

	if err := importWordsData(db); err != nil {
		log.Fatal("Words import failed:", err)
	}

	// Create JLPT-based word groups in chunks of 10 (levels 1..5 only)
	if _, err := db.Exec("SELECT created_groups, linked_words FROM create_word_groups_by_jlpt($1)", 10); err != nil {
		log.Printf("Warning: Failed to create JLPT word groups: %v", err)
	} else {
		log.Println("JLPT word groups (chunks of 10) created/updated successfully")
	}

	if err := importGrammarData(db); err != nil {
		log.Fatal("Grammar import failed:", err)
	}

	// Import example sentences
	if err := importExampleSentences(db); err != nil {
		log.Fatal("Example sentences import failed:", err)
	}

	if err := generateAndWireCompounds(db); err != nil {
		log.Fatal("Multi-kanji compound generation failed:", err)
	}

	// 2. Import JLPT questions
	if err := importAllJLPTQuestions(db); err != nil {
		log.Fatal("JLPT questions import failed:", err)
	}

	// 3. Import books and units
	if err := importBooksAndUnits(db); err != nil {
		log.Fatal("Books and units import failed:", err)
	}

	// 4. Build graph relationships
	log.Println("Building graph relationships...")
	if err := buildGraphRelationships(db); err != nil {
		log.Printf("Warning: Failed to build graph relationships: %v", err)
	} else {
		log.Println("Graph relationships built successfully!")
	}

	log.Println("Complete import finished successfully!")
}
