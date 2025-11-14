package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/lib/pq"
)

type Config struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
}

type JLPTQuestion struct {
	ID               int                      `json:"id"`
	Title            string                   `json:"title"`
	TitleTrans       string                   `json:"title_trans"`
	Level            int                      `json:"level"`
	LevelOfDifficult int                      `json:"level_of_difficult"`
	Kind             string                   `json:"kind"`
	Tag              string                   `json:"tag"`
	Score            int                      `json:"score"`
	CorrectAnswers   []int                    `json:"correct_answers"`
	CheckExplain     int                      `json:"check_explain"`
	CreatedAt        string                   `json:"created_at"`
	UpdatedAt        string                   `json:"updated_at"`
	Time             *int                     `json:"Time"`
	General          map[string]interface{}   `json:"general"`
	Content          []map[string]interface{} `json:"content"`
}

type JLPTFile struct {
	Questions []JLPTQuestion `json:"Questions"`
}

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

	// Handle other commands
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "test":
			if err := testImport(db); err != nil {
				log.Fatal("Test import failed:", err)
			}
			return
		}
	}

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

func loadConfig() Config {
	return Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		Database: getEnv("DB_NAME", "sorami"),
		User:     getEnv("DB_USER", "sorami_user"),
		Password: getEnv("DB_PASSWORD", "sorami123"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func connectDB(config Config) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		config.Host, config.Port, config.User, config.Password, config.Database)

	log.Printf("Connecting with: host=%s port=%s user=%s dbname=%s",
		config.Host, config.Port, config.User, config.Database)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func loadImportFunctions(db *sql.DB) error {
	log.Println("Loading import functions...")

	content, err := os.ReadFile("../schema/import_functions.sql")
	if err != nil {
		return fmt.Errorf("failed to read schema/import_functions.sql: %w", err)
	}

	if _, err := db.Exec(string(content)); err != nil {
		return fmt.Errorf("failed to execute import functions: %w", err)
	}

	log.Println("Import functions loaded successfully")
	return nil
}

func testImport(db *sql.DB) error {
	log.Println("Testing import with single file...")

	testFile := "../cleaned_json/jlpt_organized/grammar/grammar_choice/jlpt_question_6231.json"

	data, err := os.ReadFile(testFile)
	if err != nil {
		return fmt.Errorf("failed to read test file: %w", err)
	}

	var jlptFile JLPTFile
	if err := json.Unmarshal(data, &jlptFile); err != nil {
		return fmt.Errorf("failed to parse JSON: %w", err)
	}

	jsonData, err := json.Marshal(jlptFile)
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	var count int
	err = db.QueryRow("SELECT import_jlpt_questions($1::jsonb)", string(jsonData)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import questions: %w", err)
	}

	log.Printf("Test import successful: imported %d questions", count)

	// Verify the import
	var verifyCount int
	err = db.QueryRow("SELECT COUNT(*) FROM jlpt_questions WHERE original_id = 6231").Scan(&verifyCount)
	if err != nil {
		return fmt.Errorf("failed to verify import: %w", err)
	}

	if verifyCount != 1 {
		return fmt.Errorf("verification failed: expected 1 question, found %d", verifyCount)
	}

	log.Println("Test verification successful!")
	return nil
}

func importAllJLPTQuestions(db *sql.DB) error {
	log.Println("Starting full JLPT questions import...")

	baseDir := "../cleaned_json/jlpt_organized"
	totalImported := 0

	// Define question categories and types
	categories := map[string][]string{
		"grammar": {"grammar_choice", "passage_grammar", "sentence_composition"},
		"listen":  {"listening_comprehensive", "listening_expressions", "listening_main_points", "listening_overview", "listening_topic", "quick_response"},
		"read":    {"information_search", "long_passage", "medium_passage", "reading_comprehensive", "reading_topic", "short_passage"},
		"word":    {"context_fill_in", "expression_change", "grammar_choice", "kanji_reading", "passage_grammar", "sentence_composition", "word_application", "word_formation", "word_writing"},
	}

	for category, types := range categories {
		log.Printf("=== Importing %s questions ===", strings.Title(category))

		for _, questionType := range types {
			dirPath := filepath.Join(baseDir, category, questionType)

			count, err := importDirectory(db, dirPath, category, questionType)
			if err != nil {
				log.Printf("Warning: Failed to import from %s: %v", dirPath, err)
				continue
			}

			totalImported += count
			log.Printf("Imported %d questions from %s/%s", count, category, questionType)
		}
	}

	log.Printf("=== Import Summary ===")
	log.Printf("Total questions imported: %d", totalImported)

	// Generate statistics
	if err := generateStats(db); err != nil {
		log.Printf("Warning: Failed to generate statistics: %v", err)
	}

	return nil
}

func importDirectory(db *sql.DB, dirPath, category, questionType string) (int, error) {
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		log.Printf("Directory %s does not exist, skipping...", dirPath)
		return 0, nil
	}

	var allQuestions []JLPTQuestion
	fileCount := 0

	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if !d.IsDir() && strings.HasSuffix(path, ".json") {
			data, err := os.ReadFile(path)
			if err != nil {
				log.Printf("Warning: Failed to read %s: %v", path, err)
				return nil
			}

			var jlptFile JLPTFile
			if err := json.Unmarshal(data, &jlptFile); err != nil {
				log.Printf("Warning: Failed to parse %s: %v", path, err)
				return nil
			}

			allQuestions = append(allQuestions, jlptFile.Questions...)
			fileCount++
		}

		return nil
	})

	if err != nil {
		return 0, err
	}

	if len(allQuestions) == 0 {
		return 0, nil
	}

	log.Printf("Processing %d questions from %d files in %s", len(allQuestions), fileCount, dirPath)

	// Create wrapper structure
	wrapper := JLPTFile{Questions: allQuestions}
	jsonData, err := json.Marshal(wrapper)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal questions: %w", err)
	}

	var count int
	err = db.QueryRow("SELECT import_jlpt_questions($1::jsonb)", string(jsonData)).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to import questions: %w", err)
	}

	return count, nil
}

func generateStats(db *sql.DB) error {
	log.Println("Generating import statistics...")

	// Total questions by level
	rows, err := db.Query(`
		SELECT level, COUNT(*) as count 
		FROM jlpt_questions 
		GROUP BY level 
		ORDER BY level
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	log.Println("Questions by JLPT level:")
	for rows.Next() {
		var level, count int
		if err := rows.Scan(&level, &count); err != nil {
			return err
		}
		log.Printf("  N%d: %d questions", level, count)
	}

	// Questions by category
	rows, err = db.Query(`
		SELECT tag, COUNT(*) as count 
		FROM jlpt_questions 
		GROUP BY tag 
		ORDER BY tag
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	log.Println("Questions by category:")
	for rows.Next() {
		var tag string
		var count int
		if err := rows.Scan(&tag, &count); err != nil {
			return err
		}
		log.Printf("  %s: %d questions", strings.Title(tag), count)
	}

	return nil
}

func analyzeJLPTData() {
	baseDir := "../cleaned_json/jlpt_organized"

	categories := map[string][]string{
		"grammar": {"grammar_choice", "passage_grammar", "sentence_composition"},
		"listen":  {"listening_comprehensive", "listening_expressions", "listening_main_points", "listening_overview", "listening_topic", "quick_response"},
		"read":    {"information_search", "long_passage", "medium_passage", "reading_comprehensive", "reading_topic", "short_passage"},
		"word":    {"context_fill_in", "expression_change", "grammar_choice", "kanji_reading", "passage_grammar", "sentence_composition", "word_application", "word_formation", "word_writing"},
	}

	for category, types := range categories {
		fmt.Printf("\n=== %s Questions Analysis ===\n", strings.ToUpper(category))

		for _, questionType := range types {
			dirPath := filepath.Join(baseDir, category, questionType)
			analyzeDirectory(dirPath, category, questionType)
		}
	}
}

func analyzeDirectory(dirPath, category, questionType string) {
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		fmt.Printf("%s/%s: Directory does not exist\n", category, questionType)
		return
	}

	fileCount := 0
	totalQuestions := 0
	validQuestions := 0
	invalidQuestions := 0
	sampleIssues := []string{}

	err := filepath.WalkDir(dirPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if !d.IsDir() && strings.HasSuffix(path, ".json") {
			data, err := os.ReadFile(path)
			if err != nil {
				sampleIssues = append(sampleIssues, fmt.Sprintf("Failed to read %s: %v", path, err))
				return nil
			}

			var jlptFile JLPTFile
			if err := json.Unmarshal(data, &jlptFile); err != nil {
				sampleIssues = append(sampleIssues, fmt.Sprintf("Failed to parse %s: %v", path, err))
				return nil
			}

			fileCount++
			totalQuestions += len(jlptFile.Questions)

			// Analyze each question
			for _, q := range jlptFile.Questions {
				if isValidQuestion(q, category) {
					validQuestions++
				} else {
					invalidQuestions++
					if len(sampleIssues) < 3 { // Keep only first 3 issues
						issue := analyzeQuestionIssues(q, category, filepath.Base(path))
						if issue != "" {
							sampleIssues = append(sampleIssues, issue)
						}
					}
				}
			}
		}

		return nil
	})

	if err != nil {
		fmt.Printf("%s/%s: Error walking directory: %v\n", category, questionType, err)
		return
	}

	fmt.Printf("%s/%s: %d files, %d total questions, %d valid, %d invalid\n",
		category, questionType, fileCount, totalQuestions, validQuestions, invalidQuestions)

	if len(sampleIssues) > 0 {
		fmt.Printf("  Sample issues:\n")
		for _, issue := range sampleIssues {
			fmt.Printf("    - %s\n", issue)
		}
	}
}

func isValidQuestion(q JLPTQuestion, category string) bool {
	// Basic validation
	if q.ID == 0 {
		return false
	}

	if q.Tag == "" {
		return false
	}

	if q.Kind == "" {
		return false
	}

	if len(q.Content) == 0 {
		return false
	}

	// Check if content has required fields
	content := q.Content[0]

	// For listening questions, the question text might be empty (audio-based)
	// but they should have a title or audio content
	if category == "listen" {
		// Listening questions are valid if they have:
		// 1. A title (question instructions)
		// 2. Audio content OR image
		// 3. Answers and correct answer
		hasQuestionContent := q.Title != "" ||
			(q.General != nil && (q.General["audio"] != nil && q.General["audio"] != "")) ||
			(content["image"] != nil && content["image"] != "")

		if !hasQuestionContent {
			return false
		}
	} else {
		// For non-listening questions, require question text
		if content["question"] == nil || content["question"] == "" {
			return false
		}
	}

	if content["answers"] == nil {
		return false
	}

	if content["correctAnswer"] == nil {
		return false
	}

	return true
}

func analyzeQuestionIssues(q JLPTQuestion, category, filename string) string {
	issues := []string{}

	if q.ID == 0 {
		issues = append(issues, "missing ID")
	}

	if q.Tag == "" {
		issues = append(issues, "missing tag")
	}

	if q.Kind == "" {
		issues = append(issues, "missing kind")
	}

	if len(q.Content) == 0 {
		issues = append(issues, "no content")
	} else {
		content := q.Content[0]
		if content["question"] == nil || content["question"] == "" {
			issues = append(issues, "missing question text")
		}

		if content["answers"] == nil {
			issues = append(issues, "missing answers")
		}

		if content["correctAnswer"] == nil {
			issues = append(issues, "missing correctAnswer")
		}
	}

	if len(issues) > 0 {
		return fmt.Sprintf("%s (ID: %d): %s", filename, q.ID, strings.Join(issues, ", "))
	}

	return ""
}
func importKanjiData(db *sql.DB) error {
	log.Println("Importing kanji data...")

	data, err := os.ReadFile("../cleaned_json/cleaned_kanji.json")
	if err != nil {
		return fmt.Errorf("failed to read kanji file: %w", err)
	}

	var count int
	err = db.QueryRow("SELECT import_kanji_data($1::jsonb)", string(data)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import kanji: %w", err)
	}

	log.Printf("Successfully imported %d kanji", count)
	return nil
}

func importKanjiSVGStrokes(db *sql.DB) error {
	log.Println("Importing kanji SVG strokes...")

	data, err := os.ReadFile("../cleaned_json/kanji_svg_strokes.json")
	if err != nil {
		return fmt.Errorf("failed to read kanji_svg_strokes.json: %w", err)
	}

	var count int
	err = db.QueryRow("SELECT import_kanji_svg_strokes($1::jsonb)", string(data)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import kanji SVG strokes: %w", err)
	}

	log.Printf("Successfully imported SVG strokes for %d kanji", count)
	return nil
}

func importWordsData(db *sql.DB) error {
	log.Println("Importing words data...")

	data, err := os.ReadFile("../cleaned_json/javi_cleaned.json")
	if err != nil {
		return fmt.Errorf("failed to read words file: %w", err)
	}

	// Optional: data quality analysis disabled to speed up imports

	var count int
	err = db.QueryRow("SELECT import_words_data($1::jsonb)", string(data)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import words: %w", err)
	}

	log.Printf("Successfully imported %d words", count)
	return nil
}

func analyzeWordsDataQuality(db *sql.DB, jsonData string) error {
	rows, err := db.Query("SELECT * FROM analyze_words_data_quality($1::jsonb)", jsonData)
	if err != nil {
		return fmt.Errorf("failed to analyze data quality: %w", err)
	}
	defer rows.Close()

	log.Println("=== WORDS DATA QUALITY ANALYSIS ===")
	for rows.Next() {
		var issueType, sampleIds, description string
		var count int64
		if err := rows.Scan(&issueType, &count, &sampleIds, &description); err != nil {
			return fmt.Errorf("failed to scan analysis result: %w", err)
		}
		log.Printf("Issue: %s - Count: %d - Sample IDs: %s - Description: %s",
			issueType, count, sampleIds, description)
	}
	log.Println("=== END ANALYSIS ===")
	return nil
}

func importGrammarData(db *sql.DB) error {
	log.Println("Importing grammar data...")

	// Import main grammar data
	grammarData, err := os.ReadFile("../cleaned_json/cleaned_grammar.json")
	if err != nil {
		return fmt.Errorf("failed to read grammar file: %w", err)
	}

	var grammarCount int
	err = db.QueryRow("SELECT import_grammar_data($1::jsonb)", string(grammarData)).Scan(&grammarCount)
	if err != nil {
		return fmt.Errorf("failed to import grammar: %w", err)
	}

	log.Printf("Successfully imported %d grammar points", grammarCount)

	// Import grammar readings (furigana)
	log.Println("Importing grammar readings...")
	furiganaData, err := os.ReadFile("../cleaned_json/cleaned_grammar_furigana.json")
	if err != nil {
		return fmt.Errorf("failed to read grammar furigana file: %w", err)
	}

	var readingsCount int
	err = db.QueryRow("SELECT import_grammar_readings($1::jsonb)", string(furiganaData)).Scan(&readingsCount)
	if err != nil {
		return fmt.Errorf("failed to import grammar readings: %w", err)
	}

	log.Printf("Successfully imported %d grammar readings", readingsCount)
	return nil
}

func importExampleSentences(db *sql.DB) error {
	log.Println("Importing example sentences...")

	data, err := os.ReadFile("../cleaned_json/examples_clean.json")
	if err != nil {
		return fmt.Errorf("failed to read examples_clean file: %w", err)
	}

	var count int
	err = db.QueryRow("SELECT import_example_sentences($1::jsonb)", string(data)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import example sentences: %w", err)
	}

	log.Printf("Successfully imported %d example sentences", count)
	return nil
}

func importBooksAndUnits(db *sql.DB) error {
	log.Println("Importing books and units...")

	// Import book sets (courses)
	bookData, err := os.ReadFile("../cleaned_json/book_set.json")
	if err != nil {
		return fmt.Errorf("failed to read book_set file: %w", err)
	}

	var bookCount int
	err = db.QueryRow("SELECT import_book_sets($1::jsonb)", string(bookData)).Scan(&bookCount)
	if err != nil {
		return fmt.Errorf("failed to import book sets: %w", err)
	}
	log.Printf("Successfully imported %d book sets", bookCount)

	// Import units
	unitData, err := os.ReadFile("../cleaned_json/book_set_unit_all.json")
	if err != nil {
		return fmt.Errorf("failed to read book_set_unit_all file: %w", err)
	}

	var unitCount int
	err = db.QueryRow("SELECT import_units($1::jsonb)", string(unitData)).Scan(&unitCount)
	if err != nil {
		return fmt.Errorf("failed to import units: %w", err)
	}
	log.Printf("Successfully imported %d units", unitCount)

	// Import unit-word relationships
	detailData, err := os.ReadFile("../cleaned_json/book_set_unit_detail.json")
	if err != nil {
		return fmt.Errorf("failed to read book_set_unit_detail file: %w", err)
	}

	var relationCount int
	err = db.QueryRow("SELECT import_unit_word_relations($1::jsonb)", string(detailData)).Scan(&relationCount)
	if err != nil {
		return fmt.Errorf("failed to import unit-word relations: %w", err)
	}
	log.Printf("Successfully imported %d unit-word relationships", relationCount)

	return nil
}

// buildGraphRelationships builds the complete graph of relationships between content
func buildGraphRelationships(db *sql.DB) error {
	log.Println("Building kanji-word relationships...")
	rows, err := db.Query("SELECT * FROM build_complete_graph()")
	if err != nil {
		return fmt.Errorf("failed to build graph: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var stage string
		var created, total int
		if err := rows.Scan(&stage, &created, &total); err != nil {
			return fmt.Errorf("failed to scan graph build result: %w", err)
		}
		log.Printf("  %s: Created %d relations, Total %d", stage, created, total)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error reading graph build results: %w", err)
	}

	// Get and display graph statistics
	log.Println("\nGraph Statistics:")
	statsRows, err := db.Query("SELECT * FROM get_graph_statistics()")
	if err != nil {
		log.Printf("Warning: Could not get graph statistics: %v", err)
		return nil
	}
	defer statsRows.Close()

	for statsRows.Next() {
		var relType, fromBreakdown, toBreakdown string
		var count int64
		if err := statsRows.Scan(&relType, &count, &fromBreakdown, &toBreakdown); err != nil {
			log.Printf("Warning: Could not scan statistics: %v", err)
			continue
		}
		log.Printf("  %s: %d total (from: %s, to: %s)", relType, count, fromBreakdown, toBreakdown)
	}

	return nil
}

