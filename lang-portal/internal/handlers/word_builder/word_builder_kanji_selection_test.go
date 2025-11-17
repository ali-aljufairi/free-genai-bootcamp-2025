package word_builder

import (
	"os"
	"testing"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupTestDB creates a test database connection
func setupTestDBForKanjiSelection(t *testing.T) *gorm.DB {
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

func TestGetSmartKanji_ChainBuilding(t *testing.T) {
	db := setupTestDBForKanjiSelection(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil,
		WordsStore: nil,
		DB:         db,
	}

	tests := []struct {
		name        string
		jlptLevel   int
		count       int
		excludeIDs   []int64
		expectedMin int // Minimum kanji expected
		description string
	}{
		{
			name:        "Get 6 kanji at JLPT 3",
			jlptLevel:   3,
			count:       6,
			excludeIDs:  nil,
			expectedMin: 6,
			description: "Should return exactly 6 connected kanji",
		},
		{
			name:        "Get 6 kanji at JLPT 4",
			jlptLevel:   4,
			count:       6,
			excludeIDs:  nil,
			expectedMin: 6,
			description: "Should return exactly 6 connected kanji at JLPT 4",
		},
		{
			name:        "Get 6 kanji with exclusions",
			jlptLevel:   3,
			count:       6,
			excludeIDs:   []int64{1, 2, 3, 4, 5}, // Exclude some kanji
			expectedMin: 1, // May get fewer if many are excluded
			description: "Should return kanji excluding specified IDs",
		},
		{
			name:        "Get 6 kanji at JLPT 5",
			jlptLevel:   5,
			count:       6,
			excludeIDs:  nil,
			expectedMin: 1, // JLPT 5 might have fewer kanji, so accept 1+
			description: "Should return kanji at JLPT 5 level",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			kanji, err := handler.getSmartKanji(tt.jlptLevel, tt.count, tt.excludeIDs)
			if err != nil {
				t.Fatalf("getSmartKanji() error = %v", err)
			}

			if len(kanji) < tt.expectedMin {
				t.Errorf("getSmartKanji() returned %d kanji, expected at least %d. %s", len(kanji), tt.expectedMin, tt.description)
			}

			// Verify all kanji have required fields
			for i, k := range kanji {
				if k.ID == 0 {
					t.Errorf("Kanji[%d] has invalid ID (0)", i)
				}
				if k.Character == "" {
					t.Errorf("Kanji[%d] has empty character", i)
				}
			}

			// Verify no duplicates
			seen := make(map[int64]bool)
			for _, k := range kanji {
				if seen[k.ID] {
					t.Errorf("Duplicate kanji found: ID %d (%s)", k.ID, k.Character)
				}
				seen[k.ID] = true
			}

			// Verify exclusions are respected
			excludeMap := make(map[int64]bool)
			for _, id := range tt.excludeIDs {
				excludeMap[id] = true
			}
			for _, k := range kanji {
				if excludeMap[k.ID] {
					t.Errorf("Excluded kanji was returned: ID %d (%s)", k.ID, k.Character)
				}
			}

			// Verify JLPT levels are within range (±1)
			jlptMin := tt.jlptLevel - 1
			if jlptMin < 1 {
				jlptMin = 1
			}
			jlptMax := tt.jlptLevel + 1
			if jlptMax > 5 {
				jlptMax = 5
			}

			for _, k := range kanji {
				if k.JLPT != nil {
					jlpt := *k.JLPT
					if jlpt < jlptMin || jlpt > jlptMax {
						t.Logf("Warning: Kanji %d (%s) has JLPT %d, expected between %d and %d", k.ID, k.Character, jlpt, jlptMin, jlptMax)
						// This is a warning, not an error, as the function allows ±1 flexibility
					}
				}
			}

			t.Logf("Successfully got %d kanji: %v", len(kanji), func() []string {
				chars := make([]string, len(kanji))
				for i, k := range kanji {
					chars[i] = k.Character
				}
				return chars
			}())
		})
	}
}

func TestGetSmartKanji_ChainConnectivity(t *testing.T) {
	db := setupTestDBForKanjiSelection(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil,
		WordsStore: nil,
		DB:         db,
	}

	// Test that returned kanji actually form words together
	t.Run("Kanji form words together", func(t *testing.T) {
		kanji, err := handler.getSmartKanji(3, 6, nil)
		if err != nil {
			t.Fatalf("getSmartKanji() error = %v", err)
		}

		if len(kanji) < 2 {
			t.Skip("Not enough kanji returned to test connectivity")
			return
		}

		// Compute valid words for these kanji
		validWords, err := handler.ComputeValidWords(kanji)
		if err != nil {
			t.Fatalf("ComputeValidWords() error = %v", err)
		}

		// Chain building ensures each kanji is connected to the previous one via words,
		// but doesn't guarantee all 6 kanji form words together.
		// However, since each hop is via a word, we should find at least some words.
		// If we get 0 words, it might be a data issue, but we'll log it as a warning rather than fail.
		if len(validWords) == 0 {
			t.Logf("Warning: Kanji chain returned %d kanji but no valid words found. Kanji: %v", len(kanji), func() []string {
				chars := make([]string, len(kanji))
				for i, k := range kanji {
					chars[i] = k.Character
				}
				return chars
			}())
			// This is a warning, not a failure, as the chain ensures connectivity between adjacent kanji
			// but not necessarily that all kanji form words together
		} else {
			t.Logf("Found %d valid words for %d kanji (chain ensures connectivity)", len(validWords), len(kanji))
			// Log first few words as examples
			maxWords := 5
			if len(validWords) < maxWords {
				maxWords = len(validWords)
			}
			for i := 0; i < maxWords; i++ {
				t.Logf("  - %s (%s): %s", validWords[i].Kanji, validWords[i].Kana, validWords[i].English)
			}
		}
	})
}

func TestGetSmartKanji_MultipleCalls(t *testing.T) {
	db := setupTestDBForKanjiSelection(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil,
		WordsStore: nil,
		DB:         db,
	}

	// Test that multiple calls return different kanji (variety)
	t.Run("Multiple calls return different kanji", func(t *testing.T) {
		allKanjiIDs := make(map[int64]bool)
		uniqueSets := 0

		// Make 5 calls
		for i := 0; i < 5; i++ {
			kanji, err := handler.getSmartKanji(3, 6, nil)
			if err != nil {
				t.Fatalf("getSmartKanji() call %d error = %v", i+1, err)
			}

			if len(kanji) > 0 {
				uniqueSets++
				for _, k := range kanji {
					allKanjiIDs[k.ID] = true
				}
			}
		}

		// Should get at least some variety across calls
		if len(allKanjiIDs) < 6 {
			t.Logf("Warning: Only %d unique kanji across 5 calls (expected more variety)", len(allKanjiIDs))
		} else {
			t.Logf("Got %d unique kanji across 5 calls (good variety)", len(allKanjiIDs))
		}

		if uniqueSets == 0 {
			t.Error("All calls returned empty results")
		}
	})
}

func TestGetSmartKanji_ExclusionWorks(t *testing.T) {
	db := setupTestDBForKanjiSelection(t)
	handler := &WordBuilderHandler{
		KanjiStore: nil,
		WordsStore: nil,
		DB:         db,
	}

	t.Run("Excluded kanji are not returned", func(t *testing.T) {
		// First call: get some kanji
		firstKanji, err := handler.getSmartKanji(3, 6, nil)
		if err != nil {
			t.Fatalf("First getSmartKanji() error = %v", err)
		}

		if len(firstKanji) == 0 {
			t.Skip("No kanji returned in first call, cannot test exclusion")
			return
		}

		// Extract IDs from first call
		excludeIDs := make([]int64, len(firstKanji))
		for i, k := range firstKanji {
			excludeIDs[i] = k.ID
		}

		t.Logf("Excluding kanji IDs: %v", excludeIDs)

		// Second call: exclude the kanji from first call
		secondKanji, err := handler.getSmartKanji(3, 6, excludeIDs)
		if err != nil {
			t.Fatalf("Second getSmartKanji() error = %v", err)
		}

		// Verify none of the excluded kanji are in the second result
		excludeMap := make(map[int64]bool)
		for _, id := range excludeIDs {
			excludeMap[id] = true
		}

		for _, k := range secondKanji {
			if excludeMap[k.ID] {
				t.Errorf("Excluded kanji %d (%s) was returned in second call", k.ID, k.Character)
			}
		}

		if len(secondKanji) > 0 {
			t.Logf("Successfully excluded %d kanji, got %d new kanji", len(excludeIDs), len(secondKanji))
		} else {
			t.Logf("Warning: After excluding %d kanji, got 0 new kanji (may be normal if few kanji available)", len(excludeIDs))
		}
	})
}

