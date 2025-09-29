package main
package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

type Word struct {
	ID       int    `json:"id"`
	Word     string `json:"word"`
	Phonetic string `json:"phonetic"`
}

func main() {
	// Database connection
	connStr := "host=localhost port=5432 user=sorami password=sorami dbname=postgres sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Query words with NULL kana
	rows, err := db.Query("SELECT id, kanji FROM words WHERE kana IS NULL ORDER BY id")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var words []Word
	for rows.Next() {
		var w Word
		err := rows.Scan(&w.ID, &w.Word)
		if err != nil {
			log.Fatal(err)
		}
		w.Phonetic = "" // empty for manual filling
		words = append(words, w)
	}

	// Chunk into 200
	chunkSize := 200
	for i := 0; i < len(words); i += chunkSize {
		end := i + chunkSize
		if end > len(words) {
			end = len(words)
		}
		chunk := words[i:end]

		filename := fmt.Sprintf("chunk_%d.json", (i/chunkSize)+1)
		file, err := os.Create(filename)
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()

		encoder := json.NewEncoder(file)
		encoder.SetIndent("", "  ")
		if err := encoder.Encode(chunk); err != nil {
			log.Fatal(err)
		}

		fmt.Printf("Created %s with %d words\n", filename, len(chunk))
	}
}