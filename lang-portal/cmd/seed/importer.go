package main

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
)

// importKanjiData imports kanji data from JSON
func importKanjiData(db *sql.DB) error {
	log.Println("Importing kanji data...")

	data, err := os.ReadFile(DataDir + "/cleaned_kanji.json")
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

// importKanjiSVGStrokes imports kanji SVG stroke data
func importKanjiSVGStrokes(db *sql.DB) error {
	log.Println("Importing kanji SVG strokes...")

	data, err := os.ReadFile(KanjiSVGPath)
	if err != nil {
		// SVG file is optional - log warning but don't fail
		log.Printf("Warning: SVG strokes file not found at %s, skipping SVG import", KanjiSVGPath)
		return nil
	}

	var count int
	err = db.QueryRow("SELECT import_kanji_svg_strokes($1::jsonb)", string(data)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import kanji SVG strokes: %w", err)
	}

	log.Printf("Successfully imported SVG strokes for %d kanji", count)
	return nil
}

// importWordsData imports word/vocabulary data
func importWordsData(db *sql.DB) error {
	log.Println("Importing words data...")

	data, err := os.ReadFile(DataDir + "/javi_cleaned.json")
	if err != nil {
		return fmt.Errorf("failed to read words file: %w", err)
	}

	var count int
	err = db.QueryRow("SELECT import_words_data($1::jsonb)", string(data)).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to import words: %w", err)
	}

	log.Printf("Successfully imported %d words", count)
	return nil
}

// importGrammarData imports grammar patterns and readings
func importGrammarData(db *sql.DB) error {
	log.Println("Importing grammar data...")

	// Import main grammar data
	grammarData, err := os.ReadFile(DataDir + "/cleaned_grammar.json")
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
	furiganaData, err := os.ReadFile(DataDir + "/cleaned_grammar_furigana.json")
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

// importExampleSentences imports example sentences
func importExampleSentences(db *sql.DB) error {
	log.Println("Importing example sentences...")

	data, err := os.ReadFile(DataDir + "/examples_clean.json")
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

// importBooksAndUnits imports courses, units, and their relationships
func importBooksAndUnits(db *sql.DB) error {
	log.Println("Importing books and units...")

	// Import book sets (courses)
	bookData, err := os.ReadFile(DataDir + "/book_set.json")
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
	unitData, err := os.ReadFile(DataDir + "/book_set_unit_all.json")
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
	detailData, err := os.ReadFile(DataDir + "/book_set_unit_detail.json")
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

// generateAndWireCompounds generates multi-kanji compounds and wires relationships
func generateAndWireCompounds(db *sql.DB) error {
	// Generate multi-kanji compounds from existing kanji
	log.Println("Generating multi-kanji compounds...")
	var compoundsCreated int
	var compoundsTotal int
	if err := db.QueryRow("SELECT * FROM generate_multi_kanji_compounds()").Scan(&compoundsCreated, &compoundsTotal); err != nil {
		return fmt.Errorf("generate_multi_kanji_compounds: %w", err)
	}
	log.Printf("Generated %d multi-kanji compound words (Total: %d)", compoundsCreated, compoundsTotal)

	// Wire item_relations for multi-kanji words only
	log.Println("Wiring word-kanji relationships...")
	var relationsCreated int
	var relationsTotal int
	if err := db.QueryRow("SELECT * FROM wire_word_kanji_relations()").Scan(&relationsCreated, &relationsTotal); err != nil {
		return fmt.Errorf("wire_word_kanji_relations: %w", err)
	}
	log.Printf("Created %d word-kanji relationships (Total: %d)", relationsCreated, relationsTotal)

	// Verify word-kanji relations
	var totalMulti, withRels, withoutRels int
	var sampleWord string
	if err := db.QueryRow("SELECT * FROM verify_word_kanji_relations()").Scan(&totalMulti, &withRels, &withoutRels, &sampleWord); err != nil {
		return fmt.Errorf("verify_word_kanji_relations: %w", err)
	}
	log.Printf("Verification: %d multi-kanji words, %d with relations, %d without (sample: %s)", totalMulti, withRels, withoutRels, sampleWord)

	return nil
}

// createJLPTGroups creates JLPT-based groupings for kanji and words
func createJLPTGroups(db *sql.DB) error {
	// Create JLPT-based kanji groups in chunks of 15 (levels 1..5 only)
	if _, err := db.Exec("SELECT created_groups, linked_kanji FROM create_kanji_groups_by_jlpt($1)", 15); err != nil {
		log.Printf("Warning: Failed to create JLPT kanji groups: %v", err)
	} else {
		log.Println("JLPT kanji groups (chunks of 15) created/updated successfully")
	}

	// Create JLPT-based word groups in chunks of 10 (levels 1..5 only)
	if _, err := db.Exec("SELECT created_groups, linked_words FROM create_word_groups_by_jlpt($1)", 10); err != nil {
		log.Printf("Warning: Failed to create JLPT word groups: %v", err)
	} else {
		log.Println("JLPT word groups (chunks of 10) created/updated successfully")
	}

	return nil
}

// importKanjiFromNDJSON imports kanji from NDJSON file exported from database
func importKanjiFromNDJSON(db *sql.DB) error {
	log.Println("Importing kanji from NDJSON...")

	file, err := os.Open(DBDataDir + "/kanji.ndjson")
	if err != nil {
		return fmt.Errorf("failed to open kanji.ndjson: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	batch := make([]string, 0, 1000)
	count := 0

	for scanner.Scan() {
		line := scanner.Bytes()
		batch = append(batch, string(line))

		if len(batch) >= 1000 {
			if err := importKanjiBatch(db, batch); err != nil {
				return fmt.Errorf("failed to import kanji batch: %w", err)
			}
			count += len(batch)
			batch = batch[:0]
		}
	}

	if len(batch) > 0 {
		if err := importKanjiBatch(db, batch); err != nil {
			return fmt.Errorf("failed to import final kanji batch: %w", err)
		}
		count += len(batch)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading NDJSON: %w", err)
	}

	log.Printf("Successfully imported %d kanji from NDJSON", count)
	return nil
}

// importKanjiBatch imports a batch of kanji JSON records
func importKanjiBatch(db *sql.DB, batch []string) error {
	jsonArray := "[" + strings.Join(batch, ",") + "]"
	var count int
	err := db.QueryRow("SELECT import_kanji_data($1::jsonb)", jsonArray).Scan(&count)
	return err
}

// importWordsFromNDJSON imports words from NDJSON file exported from database
// Uses parallel workers for faster import
func importWordsFromNDJSON(db *sql.DB) error {
	log.Println("Importing words from NDJSON with parallel workers...")

	file, err := os.Open(DBDataDir + "/words.ndjson")
	if err != nil {
		return fmt.Errorf("failed to open words.ndjson: %w", err)
	}
	defer file.Close()

	// Count total lines first for progress reporting
	scanner := bufio.NewScanner(file)
	var lines []string
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading NDJSON: %w", err)
	}
	totalLines := len(lines)
	log.Printf("Found %d words to import", totalLines)

	// Process in parallel using worker goroutines
	const numWorkers = 8
	const batchSize = 500 // Smaller batches for more parallelism

	// Create batches
	var batches [][]string
	for i := 0; i < len(lines); i += batchSize {
		end := i + batchSize
		if end > len(lines) {
			end = len(lines)
		}
		batches = append(batches, lines[i:end])
	}

	// Channel for work distribution
	jobs := make(chan []string, len(batches))
	results := make(chan int, len(batches))
	errors := make(chan error, len(batches))

	// Start workers
	for w := 0; w < numWorkers; w++ {
		go func() {
			for batch := range jobs {
				count, err := importWordsBatchFast(db, batch)
				if err != nil {
					errors <- err
					results <- 0
				} else {
					errors <- nil
					results <- count
				}
			}
		}()
	}

	// Send jobs
	for _, batch := range batches {
		jobs <- batch
	}
	close(jobs)

	// Collect results
	totalImported := 0
	var importErrors []error
	for i := 0; i < len(batches); i++ {
		count := <-results
		err := <-errors
		totalImported += count
		if err != nil {
			importErrors = append(importErrors, err)
		}
		// Progress update every 10 batches
		if (i+1)%10 == 0 || i == len(batches)-1 {
			log.Printf("Progress: %d/%d batches, %d words imported", i+1, len(batches), totalImported)
		}
	}

	if len(importErrors) > 0 {
		log.Printf("Warning: %d batch errors occurred during import", len(importErrors))
	}

	log.Printf("Successfully imported %d words from NDJSON", totalImported)
	return nil
}

// importWordsBatch imports a batch of word JSON records directly using database columns
func importWordsBatch(db *sql.DB, batch []string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO words (
			id, kana, kanji, romaji, english, part_of_speech, jlpt, level, 
			correct_count, audio_path, embedding, raw_data
		) VALUES ($1, $2, $3, $4, $5, $6::pos_enum, $7, $8, $9, $10, $11, $12::jsonb)
		ON CONFLICT (id) DO UPDATE SET
			kana = EXCLUDED.kana,
			kanji = EXCLUDED.kanji,
			romaji = EXCLUDED.romaji,
			english = EXCLUDED.english,
			part_of_speech = EXCLUDED.part_of_speech,
			jlpt = EXCLUDED.jlpt,
			level = EXCLUDED.level,
			audio_path = EXCLUDED.audio_path,
			raw_data = EXCLUDED.raw_data
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for i, jsonStr := range batch {
		// Use savepoint for each row to prevent transaction abort on error
		savepointName := fmt.Sprintf("sp_word_%d", i)
		if _, err := tx.Exec("SAVEPOINT " + savepointName); err != nil {
			log.Printf("Warning: Failed to create savepoint: %v", err)
			continue
		}

		var row map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &row); err != nil {
			tx.Exec("ROLLBACK TO SAVEPOINT " + savepointName)
			log.Printf("Warning: Failed to parse word JSON: %v", err)
			continue
		}

		// Extract values with proper type handling
		var id int
		if idVal, ok := row["id"]; ok {
			switch v := idVal.(type) {
			case float64:
				id = int(v)
			case int:
				id = v
			}
		}

		var kana, kanji, romaji, english, audioPath *string
		if v, ok := row["kana"].(string); ok && v != "" {
			kana = &v
		}
		if v, ok := row["kanji"].(string); ok && v != "" {
			kanji = &v
		}
		if v, ok := row["romaji"].(string); ok && v != "" {
			romaji = &v
		}
		if v, ok := row["english"].(string); ok && v != "" && v != "No meaning available" {
			english = &v
		}
		if v, ok := row["audio_path"].(string); ok && v != "" {
			audioPath = &v
		}

		// Handle part_of_speech (enum string)
		var pos string = "unclassified"
		if v, ok := row["part_of_speech"].(string); ok && v != "" {
			pos = v
		}

		// Handle jlpt and level (integers)
		var jlpt, level *int
		if v, ok := row["jlpt"]; ok {
			switch val := v.(type) {
			case float64:
				jlptVal := int(val)
				jlpt = &jlptVal
				level = &jlptVal
			case int:
				jlpt = &val
				level = &val
			}
		}

		// Handle correct_count
		var correctCount int
		if v, ok := row["correct_count"]; ok {
			switch val := v.(type) {
			case float64:
				correctCount = int(val)
			case int:
				correctCount = val
			}
		}

		// Handle raw_data (preserve as JSONB) - convert to JSON string for PostgreSQL
		var rawData interface{}
		if v, ok := row["raw_data"]; ok && v != nil {
			// Convert map/array to JSON string, PostgreSQL will convert to JSONB
			if rawDataBytes, err := json.Marshal(v); err == nil {
				rawData = string(rawDataBytes)
			}
		}

		// Handle embedding (can be null) - convert vector to JSON string if needed
		var embedding interface{}
		if v, ok := row["embedding"]; ok && v != nil {
			// If it's an array, convert to JSON string for PostgreSQL vector type
			if embeddingBytes, err := json.Marshal(v); err == nil {
				embedding = string(embeddingBytes)
			} else {
				embedding = nil
			}
		}

		_, err := stmt.Exec(
			id, kana, kanji, romaji, english, pos, jlpt, level,
			correctCount, audioPath, embedding, rawData,
		)
		if err != nil {
			tx.Exec("ROLLBACK TO SAVEPOINT " + savepointName)
			log.Printf("Warning: Failed to insert word ID %d: %v", id, err)
			continue
		}

		// Release savepoint on success
		tx.Exec("RELEASE SAVEPOINT " + savepointName)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// importWordsBatchFast imports a batch of word JSON records using bulk insert without savepoints
// This is much faster than importWordsBatch as it doesn't create savepoints for each row
func importWordsBatchFast(db *sql.DB, batch []string) (int, error) {
	if len(batch) == 0 {
		return 0, nil
	}

	tx, err := db.Begin()
	if err != nil {
		return 0, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO words (
			id, kana, kanji, romaji, english, part_of_speech, jlpt, level, 
			correct_count, audio_path, embedding, raw_data
		) VALUES ($1, $2, $3, $4, $5, $6::pos_enum, $7, $8, $9, $10, $11, $12::jsonb)
		ON CONFLICT (id) DO UPDATE SET
			kana = EXCLUDED.kana,
			kanji = EXCLUDED.kanji,
			romaji = EXCLUDED.romaji,
			english = EXCLUDED.english,
			part_of_speech = EXCLUDED.part_of_speech,
			jlpt = EXCLUDED.jlpt,
			level = EXCLUDED.level,
			audio_path = EXCLUDED.audio_path,
			raw_data = EXCLUDED.raw_data
	`)
	if err != nil {
		return 0, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	count := 0
	for _, jsonStr := range batch {
		var row map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &row); err != nil {
			continue // Skip invalid JSON
		}

		// Extract values with proper type handling
		var id int
		if idVal, ok := row["id"]; ok {
			switch v := idVal.(type) {
			case float64:
				id = int(v)
			case int:
				id = v
			}
		}

		var kana, kanji, romaji, english, audioPath *string
		if v, ok := row["kana"].(string); ok && v != "" {
			kana = &v
		}
		if v, ok := row["kanji"].(string); ok && v != "" {
			kanji = &v
		}
		if v, ok := row["romaji"].(string); ok && v != "" {
			romaji = &v
		}
		if v, ok := row["english"].(string); ok && v != "" && v != "No meaning available" {
			english = &v
		}
		if v, ok := row["audio_path"].(string); ok && v != "" {
			audioPath = &v
		}

		// Handle part_of_speech (enum string)
		var pos string = "unclassified"
		if v, ok := row["part_of_speech"].(string); ok && v != "" {
			pos = v
		}

		// Handle jlpt and level (integers)
		var jlpt, level *int
		if v, ok := row["jlpt"]; ok {
			switch val := v.(type) {
			case float64:
				jlptVal := int(val)
				jlpt = &jlptVal
				level = &jlptVal
			case int:
				jlpt = &val
				level = &val
			}
		}

		// Handle correct_count
		var correctCount int
		if v, ok := row["correct_count"]; ok {
			switch val := v.(type) {
			case float64:
				correctCount = int(val)
			case int:
				correctCount = val
			}
		}

		// Handle raw_data (preserve as JSONB)
		var rawData interface{}
		if v, ok := row["raw_data"]; ok && v != nil {
			if rawDataBytes, err := json.Marshal(v); err == nil {
				rawData = string(rawDataBytes)
			}
		}

		// Handle embedding (can be null)
		var embedding interface{}
		if v, ok := row["embedding"]; ok && v != nil {
			if embeddingBytes, err := json.Marshal(v); err == nil {
				embedding = string(embeddingBytes)
			}
		}

		_, err := stmt.Exec(
			id, kana, kanji, romaji, english, pos, jlpt, level,
			correctCount, audioPath, embedding, rawData,
		)
		if err != nil {
			// Log but continue - don't abort the whole batch
			continue
		}
		count++
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return count, nil
}

// importGraphRelationsFromNDJSON imports item_relations (graph relationships) from NDJSON
// Uses parallel workers for faster import
func importGraphRelationsFromNDJSON(db *sql.DB) error {
	log.Println("Importing graph relationships (item_relations) from NDJSON with parallel workers...")

	file, err := os.Open(DBDataDir + "/item_relations.ndjson")
	if err != nil {
		return fmt.Errorf("failed to open item_relations.ndjson: %w", err)
	}
	defer file.Close()

	// Read all lines first
	scanner := bufio.NewScanner(file)
	var lines []string
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading NDJSON: %w", err)
	}
	totalLines := len(lines)
	log.Printf("Found %d graph relationships to import", totalLines)

	// Process in parallel
	const numWorkers = 8
	const batchSize = 1000

	// Create batches
	var batches [][]string
	for i := 0; i < len(lines); i += batchSize {
		end := i + batchSize
		if end > len(lines) {
			end = len(lines)
		}
		batches = append(batches, lines[i:end])
	}

	// Channel for work distribution
	jobs := make(chan []string, len(batches))
	results := make(chan int, len(batches))

	// Start workers
	for w := 0; w < numWorkers; w++ {
		go func() {
			for batch := range jobs {
				count := importGraphRelationsBatchFast(db, batch)
				results <- count
			}
		}()
	}

	// Send jobs
	for _, batch := range batches {
		jobs <- batch
	}
	close(jobs)

	// Collect results
	totalImported := 0
	for i := 0; i < len(batches); i++ {
		count := <-results
		totalImported += count
		if (i+1)%5 == 0 || i == len(batches)-1 {
			log.Printf("Graph relations progress: %d/%d batches, %d imported", i+1, len(batches), totalImported)
		}
	}

	log.Printf("Successfully imported %d graph relationships from NDJSON", totalImported)
	return nil
}

// importGraphRelationsBatchFast imports a batch of item_relations without savepoints
func importGraphRelationsBatchFast(db *sql.DB, batch []string) int {
	if len(batch) == 0 {
		return 0
	}

	tx, err := db.Begin()
	if err != nil {
		return 0
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
		VALUES ($1, $2, $3::relation_enum, $4, $5, $6)
		ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING
	`)
	if err != nil {
		return 0
	}
	defer stmt.Close()

	count := 0
	for _, jsonStr := range batch {
		var rel map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &rel); err != nil {
			continue
		}

		_, err := stmt.Exec(
			rel["from_type"],
			rel["from_id"],
			rel["rel_type"],
			rel["to_type"],
			rel["to_id"],
			rel["position"],
		)
		if err == nil {
			count++
		}
	}

	if err := tx.Commit(); err != nil {
		return 0
	}

	return count
}

// importGraphRelationsBatch imports a batch of item_relations JSON records (legacy)
func importGraphRelationsBatch(db *sql.DB, batch []string) error {
	// Build INSERT statement for each relation
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO item_relations (from_type, from_id, rel_type, to_type, to_id, position)
		VALUES ($1, $2, $3::relation_enum, $4, $5, $6)
		ON CONFLICT (from_type, from_id, rel_type, to_type, to_id, position) DO NOTHING
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	for _, jsonStr := range batch {
		var rel map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &rel); err != nil {
			log.Printf("Warning: Failed to parse relation JSON: %v", err)
			continue
		}

		_, err := stmt.Exec(
			rel["from_type"],
			rel["from_id"],
			rel["rel_type"],
			rel["to_type"],
			rel["to_id"],
			rel["position"],
		)
		if err != nil {
			log.Printf("Warning: Failed to insert relation: %v", err)
			continue
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// importGroupsFromNDJSON imports groups, word_groups, and kanji_groups from NDJSON
func importGroupsFromNDJSON(db *sql.DB) error {
	log.Println("Importing groups from NDJSON...")

	// Import groups
	if err := importTableFromNDJSON(db, "groups", "groups.ndjson"); err != nil {
		return fmt.Errorf("failed to import groups: %w", err)
	}

	// Import word_groups
	if err := importTableFromNDJSON(db, "word_groups", "word_groups.ndjson"); err != nil {
		return fmt.Errorf("failed to import word_groups: %w", err)
	}

	// Import kanji_groups
	if err := importTableFromNDJSON(db, "kanji_groups", "kanji_groups.ndjson"); err != nil {
		return fmt.Errorf("failed to import kanji_groups: %w", err)
	}

	return nil
}

// importTableFromNDJSON is a generic function to import any table from NDJSON
func importTableFromNDJSON(db *sql.DB, tableName, filename string) error {
	file, err := os.Open(DBDataDir + "/" + filename)
	if err != nil {
		return fmt.Errorf("failed to open %s: %w", filename, err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	batch := make([]string, 0, 1000)
	count := 0

	for scanner.Scan() {
		line := scanner.Bytes()
		batch = append(batch, string(line))

		if len(batch) >= 1000 {
			if err := importGenericBatch(db, tableName, batch); err != nil {
				return fmt.Errorf("failed to import batch: %w", err)
			}
			count += len(batch)
			batch = batch[:0]
		}
	}

	if len(batch) > 0 {
		if err := importGenericBatch(db, tableName, batch); err != nil {
			return fmt.Errorf("failed to import final batch: %w", err)
		}
		count += len(batch)
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading NDJSON: %w", err)
	}

	log.Printf("Successfully imported %d rows into %s from NDJSON", count, tableName)
	return nil
}

// importGenericBatch imports a batch of JSON records into any table using COPY
func importGenericBatch(db *sql.DB, tableName string, batch []string) error {
	// For simple tables, we can use a generic approach
	// This is a simplified version - for complex tables, use specific functions
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Build JSON array and use PostgreSQL's json_populate_recordset
	jsonArray := "[" + strings.Join(batch, ",") + "]"

	// Use dynamic SQL to insert (table name is from constant list, safe)
	query := fmt.Sprintf(`
		INSERT INTO %s
		SELECT * FROM json_populate_recordset(NULL::%s, $1::json)
		ON CONFLICT DO NOTHING
	`, tableName, tableName)

	_, err = tx.Exec(query, jsonArray)
	if err != nil {
		// Fallback: try row-by-row insert for tables without json_populate_recordset support
		return importGenericBatchRowByRow(tx, tableName, batch)
	}

	return tx.Commit()
}

// importGenericBatchRowByRow fallback for tables that don't support json_populate_recordset
func importGenericBatchRowByRow(tx *sql.Tx, tableName string, batch []string) error {
	// This is a simplified fallback - for production, you'd want table-specific handlers
	for _, jsonStr := range batch {
		var row map[string]interface{}
		if err := json.Unmarshal([]byte(jsonStr), &row); err != nil {
			continue
		}

		// Build dynamic INSERT (table name is from constant, safe)
		cols := make([]string, 0, len(row))
		vals := make([]interface{}, 0, len(row))
		placeholders := make([]string, 0, len(row))

		for col, val := range row {
			cols = append(cols, col)
			vals = append(vals, val)
			placeholders = append(placeholders, fmt.Sprintf("$%d", len(placeholders)+1))
		}

		query := fmt.Sprintf(
			"INSERT INTO %s (%s) VALUES (%s) ON CONFLICT DO NOTHING",
			tableName,
			strings.Join(cols, ", "),
			strings.Join(placeholders, ", "),
		)

		_, err := tx.Exec(query, vals...)
		if err != nil {
			log.Printf("Warning: Failed to insert into %s: %v", tableName, err)
		}
	}

	return tx.Commit()
}

// importCoursesAndUnitsFromNDJSON imports courses, units, and unit_items from NDJSON
func importCoursesAndUnitsFromNDJSON(db *sql.DB) error {
	log.Println("Importing courses, units, and unit_items from NDJSON...")

	// Import courses
	if err := importTableFromNDJSON(db, "courses", "courses.ndjson"); err != nil {
		return fmt.Errorf("failed to import courses: %w", err)
	}

	// Import units
	if err := importTableFromNDJSON(db, "units", "units.ndjson"); err != nil {
		return fmt.Errorf("failed to import units: %w", err)
	}

	// Import unit_items (critical for course content)
	if err := importTableFromNDJSON(db, "unit_items", "unit_items.ndjson"); err != nil {
		return fmt.Errorf("failed to import unit_items: %w", err)
	}

	log.Println("Successfully imported courses, units, and unit_items from NDJSON")
	return nil
}

// importStudyActivitiesFromNDJSON imports study_activities and learning_activities from NDJSON
func importStudyActivitiesFromNDJSON(db *sql.DB) error {
	log.Println("Importing study activities from NDJSON...")

	// Import study_activities (activity definitions)
	if err := importTableFromNDJSON(db, "study_activities", "study_activities.ndjson"); err != nil {
		return fmt.Errorf("failed to import study_activities: %w", err)
	}

	// Import learning_activities (user activity records) - optional, may be user-specific
	if err := importTableFromNDJSON(db, "learning_activities", "learning_activities.ndjson"); err != nil {
		log.Printf("Warning: Failed to import learning_activities (may be user-specific): %v", err)
	}

	// Import progression_settings (user progression config) - optional
	if err := importTableFromNDJSON(db, "progression_settings", "progression_settings.ndjson"); err != nil {
		log.Printf("Warning: Failed to import progression_settings (may be user-specific): %v", err)
	}

	log.Println("Successfully imported study activities from NDJSON")
	return nil
}

// importGrammarFromNDJSON imports grammar data from NDJSON files
func importGrammarFromNDJSON(db *sql.DB) error {
	log.Println("Importing grammar data from NDJSON...")

	// Import grammar_points first (parent table)
	if err := importTableFromNDJSON(db, "grammar_points", "grammar_points.ndjson"); err != nil {
		return fmt.Errorf("failed to import grammar_points: %w", err)
	}

	// Import grammar_readings
	if err := importTableFromNDJSON(db, "grammar_readings", "grammar_readings.ndjson"); err != nil {
		return fmt.Errorf("failed to import grammar_readings: %w", err)
	}

	// Import grammar_examples
	if err := importTableFromNDJSON(db, "grammar_examples", "grammar_examples.ndjson"); err != nil {
		return fmt.Errorf("failed to import grammar_examples: %w", err)
	}

	// Import grammar_details
	if err := importTableFromNDJSON(db, "grammar_details", "grammar_details.ndjson"); err != nil {
		return fmt.Errorf("failed to import grammar_details: %w", err)
	}

	// Import grammar_relations (if any)
	if err := importTableFromNDJSON(db, "grammar_relations", "grammar_relations.ndjson"); err != nil {
		log.Printf("Warning: Failed to import grammar_relations (may be empty): %v", err)
	}

	log.Println("Successfully imported grammar data from NDJSON")
	return nil
}
