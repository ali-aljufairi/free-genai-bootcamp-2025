package main

import (
	"bufio"
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/lib/pq"
)

const (
	defaultBatchSize = 1000
	maxScanTokenSize = 50 * 1024 * 1024 // 50MB
)

type seedTask struct {
	name      string
	fileName  string
	tableName string
	insertSQL string
	required  bool
}

func main() {
	pathFlag := flag.String("path", "", "Path to NDJSON seed bundle (or use SEED_BUNDLE_PATH)")
	batchFlag := flag.Int("batch", defaultBatchSize, "Number of NDJSON records per batch")
	envFile := flag.String("env", ".env", "Path to .env file")
	flag.Parse()

	if err := loadEnvFile(*envFile); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	seedPath := strings.TrimSpace(*pathFlag)
	if seedPath == "" {
		seedPath = strings.TrimSpace(os.Getenv("SEED_BUNDLE_PATH"))
	}
	if seedPath == "" {
		log.Fatal("SEED_BUNDLE_PATH is required (or pass -path)")
	}

	batchSize := *batchFlag
	if batchSize <= 0 {
		batchSize = defaultBatchSize
	}

	seedTasks := []seedTask{
		{
			name:      "kanji",
			fileName:  "kanji.ndjson",
			tableName: "kanji",
			insertSQL: insertSQL("kanji"),
			required:  true,
		},
		{
			name:      "words",
			fileName:  "words.ndjson",
			tableName: "words",
			insertSQL: insertSQL("words"),
			required:  true,
		},
		{
			name:      "grammar_points",
			fileName:  "grammar_points.ndjson",
			tableName: "grammar_points",
			insertSQL: insertSQL("grammar_points"),
			required:  true,
		},
		{
			name:      "grammar_details",
			fileName:  "grammar_details.ndjson",
			tableName: "grammar_details",
			insertSQL: insertSQL("grammar_details"),
			required:  true,
		},
		{
			name:      "grammar_examples",
			fileName:  "grammar_examples.ndjson",
			tableName: "grammar_examples",
			insertSQL: insertSQL("grammar_examples"),
			required:  true,
		},
		{
			name:      "grammar_readings",
			fileName:  "grammar_readings.ndjson",
			tableName: "grammar_readings",
			insertSQL: insertSQL("grammar_readings"),
			required:  true,
		},
		{
			name:      "sentences",
			fileName:  "sentences.ndjson",
			tableName: "sentences",
			insertSQL: insertSQL("sentences"),
			required:  true,
		},
		{
			name:      "groups",
			fileName:  "groups.ndjson",
			tableName: "groups",
			insertSQL: insertSQL("groups"),
			required:  true,
		},
		{
			name:      "word_groups",
			fileName:  "word_groups.ndjson",
			tableName: "word_groups",
			insertSQL: wordGroupsInsertSQL(),
			required:  true,
		},
		{
			name:      "kanji_groups",
			fileName:  "kanji_groups.ndjson",
			tableName: "kanji_groups",
			insertSQL: kanjiGroupsInsertSQL(),
			required:  true,
		},
		{
			name:      "courses",
			fileName:  "courses.ndjson",
			tableName: "courses",
			insertSQL: insertSQL("courses"),
			required:  true,
		},
		{
			name:      "units",
			fileName:  "units.ndjson",
			tableName: "units",
			insertSQL: unitsInsertSQL(),
			required:  true,
		},
		{
			name:      "unit_items",
			fileName:  "unit_items.ndjson",
			tableName: "unit_items",
			insertSQL: unitItemsInsertSQL(),
			required:  true,
		},
		{
			name:      "item_relations",
			fileName:  "item_relations.ndjson",
			tableName: "item_relations",
			insertSQL: insertSQL("item_relations"),
			required:  true,
		},
		{
			name:      "study_activities",
			fileName:  "study_activities.ndjson",
			tableName: "study_activities",
			insertSQL: insertSQL("study_activities"),
			required:  true,
		},
		{
			name:      "jlpt_questions",
			fileName:  "jlpt_questions.ndjson",
			tableName: "jlpt_questions",
			insertSQL: insertSQL("jlpt_questions"),
			required:  true,
		},
		{
			name:      "jlpt_grammar_questions",
			fileName:  "jlpt_grammar_questions.ndjson",
			tableName: "jlpt_grammar_questions",
			insertSQL: insertSQL("jlpt_grammar_questions"),
			required:  true,
		},
		{
			name:      "jlpt_listening_questions",
			fileName:  "jlpt_listening_questions.ndjson",
			tableName: "jlpt_listening_questions",
			insertSQL: insertSQL("jlpt_listening_questions"),
			required:  true,
		},
		{
			name:      "jlpt_reading_questions",
			fileName:  "jlpt_reading_questions.ndjson",
			tableName: "jlpt_reading_questions",
			insertSQL: insertSQL("jlpt_reading_questions"),
			required:  true,
		},
		{
			name:      "jlpt_word_questions",
			fileName:  "jlpt_word_questions.ndjson",
			tableName: "jlpt_word_questions",
			insertSQL: insertSQL("jlpt_word_questions"),
			required:  true,
		},
	}

	db, err := openDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	ctx := context.Background()
	for _, task := range seedTasks {
		if err := seedFile(ctx, db, seedPath, batchSize, task); err != nil {
			log.Fatalf("Seeding failed for %s: %v", task.name, err)
		}
	}

	log.Println("✅ Database seeding completed successfully")
}

func insertSQL(table string) string {
	return fmt.Sprintf(
		"INSERT INTO %s SELECT * FROM jsonb_populate_recordset(NULL::%s, $1::jsonb) ON CONFLICT DO NOTHING",
		pq.QuoteIdentifier(table),
		pq.QuoteIdentifier(table),
	)
}

func unitsInsertSQL() string {
	return "INSERT INTO units (id, course_id, path, title, description, total_words) " +
		"SELECT id, course_id, path::ltree, title, description, total_words " +
		"FROM jsonb_to_recordset($1::jsonb) AS x(id INT, course_id INT, path TEXT, title TEXT, description TEXT, total_words INT) " +
		"ON CONFLICT DO NOTHING"
}

func wordGroupsInsertSQL() string {
	return "INSERT INTO word_groups (word_id, group_id) " +
		"SELECT wg.word_id, wg.group_id " +
		"FROM jsonb_to_recordset($1::jsonb) AS wg(word_id INT, group_id INT) " +
		"JOIN words w ON w.id = wg.word_id " +
		"JOIN groups g ON g.id = wg.group_id " +
		"ON CONFLICT DO NOTHING"
}

func kanjiGroupsInsertSQL() string {
	return "INSERT INTO kanji_groups (kanji_id, group_id) " +
		"SELECT kg.kanji_id, kg.group_id " +
		"FROM jsonb_to_recordset($1::jsonb) AS kg(kanji_id INT, group_id INT) " +
		"JOIN kanji k ON k.id = kg.kanji_id " +
		"JOIN groups g ON g.id = kg.group_id " +
		"ON CONFLICT DO NOTHING"
}

func unitItemsInsertSQL() string {
	return "INSERT INTO unit_items (unit_id, item_type, item_id, position) " +
		"SELECT ui.unit_id, ui.item_type::unit_item_enum, ui.item_id, ui.position " +
		"FROM jsonb_to_recordset($1::jsonb) AS ui(unit_id INT, item_type TEXT, item_id INT, position INT) " +
		"JOIN units u ON u.id = ui.unit_id " +
		"LEFT JOIN words w ON ui.item_type = 'word' AND w.id = ui.item_id " +
		"LEFT JOIN kanji k ON ui.item_type = 'kanji' AND k.id = ui.item_id " +
		"LEFT JOIN grammar_points g ON ui.item_type = 'grammar' AND g.id = ui.item_id " +
		"LEFT JOIN sentences s ON ui.item_type = 'sentence' AND s.id = ui.item_id " +
		"WHERE (ui.item_type = 'word' AND w.id IS NOT NULL) " +
		"   OR (ui.item_type = 'kanji' AND k.id IS NOT NULL) " +
		"   OR (ui.item_type = 'grammar' AND g.id IS NOT NULL) " +
		"   OR (ui.item_type = 'sentence' AND s.id IS NOT NULL) " +
		"ON CONFLICT DO NOTHING"
}

func seedFile(ctx context.Context, db *sql.DB, seedPath string, batchSize int, task seedTask) error {
	filePath := filepath.Join(seedPath, task.fileName)
	if err := verifyFile(filePath, task.required); err != nil {
		return err
	}

	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	scanner.Buffer(make([]byte, 1024*1024), maxScanTokenSize)

	log.Printf("Seeding %s from %s", task.name, filePath)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	batch := make([]string, 0, batchSize)
	recordCount := 0
	batchCount := 0

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		batch = append(batch, line)
		recordCount++

		if len(batch) >= batchSize {
			if err := executeBatch(ctx, tx, task.insertSQL, batch); err != nil {
				return fmt.Errorf("insert batch: %w", err)
			}
			batchCount++
			batch = batch[:0]
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scan file: %w", err)
	}

	if len(batch) > 0 {
		if err := executeBatch(ctx, tx, task.insertSQL, batch); err != nil {
			return fmt.Errorf("insert final batch: %w", err)
		}
		batchCount++
	}

	if recordCount == 0 {
		log.Printf("Warning: %s is empty (no records found)", task.fileName)
	}

	if err := bumpSequence(ctx, tx, task.tableName); err != nil {
		return fmt.Errorf("update sequence: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	log.Printf("Seeded %s: %d records in %d batches", task.name, recordCount, batchCount)
	return nil
}

func executeBatch(ctx context.Context, execer interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
}, query string, lines []string) error {
	payload := buildJSONArray(lines)
	_, err := execer.ExecContext(ctx, query, payload)
	return err
}

func buildJSONArray(lines []string) string {
	var b strings.Builder
	b.Grow(len(lines) * 64)
	b.WriteByte('[')
	for i, line := range lines {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(line)
	}
	b.WriteByte(']')
	return b.String()
}

func bumpSequence(ctx context.Context, tx *sql.Tx, table string) error {
	var hasID bool
	if err := tx.QueryRowContext(
		ctx,
		"SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'id')",
		table,
	).Scan(&hasID); err != nil {
		return err
	}
	if !hasID {
		return nil
	}

	var seq sql.NullString
	if err := tx.QueryRowContext(ctx, "SELECT pg_get_serial_sequence($1, 'id')", table).Scan(&seq); err != nil {
		return err
	}
	if !seq.Valid || seq.String == "" {
		return nil
	}

	query := fmt.Sprintf(
		"SELECT setval($1::regclass, COALESCE((SELECT MAX(id) FROM %s), 1), true)",
		pq.QuoteIdentifier(table),
	)
	_, err := tx.ExecContext(ctx, query, seq.String)
	return err
}

func verifyFile(path string, required bool) error {
	info, err := os.Stat(path)
	if err == nil {
		if info.IsDir() {
			return fmt.Errorf("expected file but found directory: %s", path)
		}
		return nil
	}
	if os.IsNotExist(err) && !required {
		log.Printf("Skipping optional seed file (not found): %s", path)
		return nil
	}
	return fmt.Errorf("seed file not found: %s", path)
}

func openDatabase() (*sql.DB, error) {
	dbString := os.Getenv("DATABASE_URL")
	if dbString == "" {
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")

		if dbHost == "" || dbUser == "" || dbName == "" {
			return nil, fmt.Errorf("DATABASE_URL or DB_HOST/DB_USER/DB_NAME are required")
		}
		if dbPort == "" {
			dbPort = "5432"
		}

		dbString = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName,
		)
		log.Printf("Constructed database connection from DB_* variables")
	} else {
		log.Printf("Using DATABASE_URL for database connection")
	}

	db, err := sql.Open("postgres", dbString)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}
