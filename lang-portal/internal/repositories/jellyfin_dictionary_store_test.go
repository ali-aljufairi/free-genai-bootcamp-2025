package repositories

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func testJellyfinDictionaryStore(t *testing.T) *GormJellyfinDictionaryStore {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	// Deliberately create only words: any user/progress query makes the test fail.
	if err := db.Exec(`CREATE TABLE words (id INTEGER PRIMARY KEY, kanji TEXT, kana TEXT, english TEXT, part_of_speech TEXT, jlpt INTEGER)`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO words(id,kanji,kana,english,part_of_speech,jlpt) VALUES
		(7,'挨拶','あいさつ','greeting','noun',3),
		(8,'挨拶','あいさつ','salutation','noun',3),
		(9,NULL,'する','to do','verb',5),
		(10,'形','なり','form','noun',4),
		(11,'形','かたち','shape','noun',5),
		(12,'みぬく','みぬく','see through','expression',NULL)`).Error; err != nil {
		t.Fatal(err)
	}
	return NewJellyfinDictionaryStore(db)
}

func TestJellyfinDictionaryStoreBatchLookupRetainsCandidatesAndUsesWordsOnly(t *testing.T) {
	store := testJellyfinDictionaryStore(t)
	words, err := store.FindWords([]string{"挨拶", "あいさつ", "する", "形", "かたち", "みぬく", "missing"})
	if err != nil {
		t.Fatal(err)
	}
	if len(words) != 6 {
		t.Fatalf("got %d rows: %#v", len(words), words)
	}
	if words[0].ID != 7 || words[1].ID != 8 {
		t.Fatalf("duplicates were collapsed or reordered: %#v", words)
	}
	if words[2].English != "to do" || words[2].PartOfSpeech != "verb" {
		t.Fatalf("unexpected cast/kana lookup: %#v", words[2])
	}
}

func TestJellyfinDictionaryStoreEmptyLookupDoesNotQuery(t *testing.T) {
	store := testJellyfinDictionaryStore(t)
	words, err := store.FindWords(nil)
	if err != nil || len(words) != 0 {
		t.Fatalf("words=%#v err=%v", words, err)
	}
}
