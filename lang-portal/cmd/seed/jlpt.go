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
)

// importAllJLPTQuestions orchestrates full import of JLPT questions from organized directory
func importAllJLPTQuestions(db *sql.DB) error {
	log.Println("Starting full JLPT questions import...")

	baseDir := JLPTDataDir
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

// importDirectory processes all JLPT JSON files in a directory and imports them
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

// generateStats queries and logs JLPT question statistics
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

// analyzeJLPTData analyzes JLPT data directory structure and question validity
func analyzeJLPTData() {
	baseDir := JLPTDataDir

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

// analyzeDirectory walks through a directory and analyzes question files for validity
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

// isValidQuestion checks if a JLPT question has all required fields
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

// analyzeQuestionIssues identifies and formats missing required fields
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
