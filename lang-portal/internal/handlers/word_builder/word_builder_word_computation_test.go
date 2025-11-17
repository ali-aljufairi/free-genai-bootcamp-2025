package word_builder

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupTestDB creates a test database connection
func setupTestDB(t *testing.T) *gorm.DB {
	if err := godotenv.Load("../../../.env"); err != nil {
		t.Logf("Warning: .env file not found, using environment variables")
	}

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "5432"
	}
	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "sorami"
	}
	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "sorami"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "sorami"
	}

	dsn := "host=" + dbHost + " port=" + dbPort + " user=" + dbUser + " password=" + dbPassword + " dbname=" + dbName + " sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to connect to database: %v", err)
	}

	return db
}

func TestComputeValidWords(t *testing.T) {
	db := setupTestDB(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil, // Not needed for this test
		WordsStore: nil, // Not needed for this test
		DB:         db,
	}

	tests := []struct {
		name           string
		kanji          []KanjiData
		expectedMin    int      // Minimum number of words expected
		expectedMax    int      // Maximum number of words expected (0 = no limit)
		shouldHaveWord string   // A specific word that should be in results (optional)
		shouldHaveAny  []string // Any of these words should be in results (optional)
	}{
		{
			name: "Kanji that form words - 意思 (intention)",
			kanji: []KanjiData{
				{ID: 53, Character: "意", JLPT: intPtr(4)},
				{ID: 1089, Character: "思", JLPT: intPtr(4)},
			},
			expectedMin: 1,
			expectedMax: 0,
			shouldHaveWord: "意思",
		},
		{
			name: "Kanji that form multiple words - 会 and 社",
			kanji: []KanjiData{
				{ID: 269, Character: "会", JLPT: intPtr(4)},
				{ID: 1178, Character: "社", JLPT: intPtr(4)},
			},
			expectedMin: 2,
			expectedMax: 0,
			shouldHaveAny: []string{"会社", "社会"},
		},
		{
			name: "Kanji that form words - 運転 (driving)",
			kanji: []KanjiData{
				{ID: 125, Character: "運", JLPT: intPtr(4)},
				{ID: 2004, Character: "転", JLPT: intPtr(4)},
			},
			expectedMin: 1,
			expectedMax: 0,
			shouldHaveWord: "運転",
		},
		{
			name: "Empty kanji array",
			kanji: []KanjiData{},
			expectedMin: 0,
			expectedMax: 0,
		},
		{
			name: "Single kanji",
			kanji: []KanjiData{
				{ID: 53, Character: "意", JLPT: intPtr(4)},
			},
			expectedMin: 0,
			expectedMax: 0, // Single kanji might not form words alone
		},
		{
			name: "Kanji that don't form words together",
			kanji: []KanjiData{
				{ID: 1331, Character: "少", JLPT: intPtr(4)},
				{ID: 547, Character: "牛", JLPT: intPtr(4)},
			},
			expectedMin: 0,
			expectedMax: 0, // These might not form words together
		},
		{
			name: "Three kanji that form words",
			kanji: []KanjiData{
				{ID: 133, Character: "映", JLPT: intPtr(4)},
				{ID: 260, Character: "画", JLPT: intPtr(4)},
				{ID: 1833, Character: "館", JLPT: intPtr(4)},
			},
			expectedMin: 0, // May or may not form words, depends on data
			expectedMax: 0,
		},
		{
			name: "Kanji with nil JLPT level",
			kanji: []KanjiData{
				{ID: 53, Character: "意", JLPT: nil},
				{ID: 1089, Character: "思", JLPT: nil},
			},
			expectedMin: 0, // Should default to JLPT 4
			expectedMax: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := handler.ComputeValidWords(tt.kanji)
			if err != nil {
				t.Fatalf("ComputeValidWords() error = %v", err)
			}

			if len(result) < tt.expectedMin {
				t.Errorf("ComputeValidWords() returned %d words, expected at least %d", len(result), tt.expectedMin)
			}

			if tt.expectedMax > 0 && len(result) > tt.expectedMax {
				t.Errorf("ComputeValidWords() returned %d words, expected at most %d", len(result), tt.expectedMax)
			}

			if tt.shouldHaveWord != "" {
				found := false
				for _, word := range result {
					if word.Kanji == tt.shouldHaveWord {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("ComputeValidWords() should have returned word '%s' but didn't. Got: %v", tt.shouldHaveWord, result)
				}
			}

			if len(tt.shouldHaveAny) > 0 {
				found := false
				foundWords := make([]string, 0)
				for _, word := range result {
					for _, expected := range tt.shouldHaveAny {
						if word.Kanji == expected {
							found = true
							foundWords = append(foundWords, expected)
							break
						}
					}
				}
				if !found {
					t.Errorf("ComputeValidWords() should have returned at least one of %v but didn't. Got: %v", tt.shouldHaveAny, result)
				} else if len(foundWords) > 0 {
					t.Logf("Found expected words: %v", foundWords)
				}
			}

			// Verify all returned words have valid structure
			for _, word := range result {
				if word.Kanji == "" {
					t.Errorf("ComputeValidWords() returned word with empty kanji: %+v", word)
				}
				if word.Kana == "" {
					t.Errorf("ComputeValidWords() returned word with empty kana: %+v", word)
				}
				if word.English == "" {
					t.Errorf("ComputeValidWords() returned word with empty english: %+v", word)
				}
				if word.WordID == 0 {
					t.Errorf("ComputeValidWords() returned word with zero word_id: %+v", word)
				}
				if len(word.KanjiIDs) == 0 {
					t.Errorf("ComputeValidWords() returned word with empty kanji_ids: %+v", word)
				}

				// Verify that all kanji IDs in the word are from the provided set
				providedKanjiIDs := make(map[int64]bool)
				for _, k := range tt.kanji {
					providedKanjiIDs[k.ID] = true
				}
				for _, kid := range word.KanjiIDs {
					if !providedKanjiIDs[kid] {
						t.Errorf("ComputeValidWords() returned word '%s' with kanji_id %d that was not in provided set %v", word.Kanji, kid, providedKanjiIDs)
					}
				}
			}
		})
	}
}

// TestComputeValidWordsKanjiFiltering tests that words only contain kanji from the provided set
func TestComputeValidWordsKanjiFiltering(t *testing.T) {
	db := setupTestDB(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil,
		WordsStore: nil,
		DB:         db,
	}

	// Test with kanji that form words
	kanji := []KanjiData{
		{ID: 269, Character: "会", JLPT: intPtr(4)},
		{ID: 1178, Character: "社", JLPT: intPtr(4)},
	}

	result, err := handler.ComputeValidWords(kanji)
	if err != nil {
		t.Fatalf("ComputeValidWords() error = %v", err)
	}

	// Build set of provided kanji IDs
	providedIDs := make(map[int64]bool)
	for _, k := range kanji {
		providedIDs[k.ID] = true
	}

	// Verify all words only use provided kanji
	for _, word := range result {
		for _, kid := range word.KanjiIDs {
			if !providedIDs[kid] {
				t.Errorf("Word '%s' contains kanji_id %d which is not in provided set %v", word.Kanji, kid, providedIDs)
			}
		}
		// Verify word kanji length matches kanji_ids length (rough check)
		if len(word.Kanji) < len(word.KanjiIDs) {
			t.Logf("Warning: Word '%s' has %d kanji characters but %d kanji_ids - this might be expected for some words", word.Kanji, len(word.Kanji), len(word.KanjiIDs))
		}
	}
}

// TestComputeValidWordsEmptyResult tests edge cases that should return empty results
func TestComputeValidWordsEmptyResult(t *testing.T) {
	db := setupTestDB(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil,
		WordsStore: nil,
		DB:         db,
	}

	tests := []struct {
		name string
		kanji []KanjiData
	}{
		{
			name: "Empty array",
			kanji: []KanjiData{},
		},
		{
			name: "Nil kanji (should be handled gracefully)",
			kanji: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := handler.ComputeValidWords(tt.kanji)
			if err != nil {
				t.Fatalf("ComputeValidWords() error = %v", err)
			}
			if len(result) != 0 {
				t.Errorf("ComputeValidWords() returned %d words, expected 0 for %s", len(result), tt.name)
			}
		})
	}
}

func intPtr(i int) *int {
	return &i
}

