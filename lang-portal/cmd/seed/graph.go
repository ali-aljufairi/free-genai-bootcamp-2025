package main

import (
	"database/sql"
	"fmt"
	"log"
)

// buildGraphRelationships builds only USES_KANJI relationships (needed for Word Builder)
func buildGraphRelationships(db *sql.DB) error {
	log.Println("Building kanji-word relationships (USES_KANJI only)...")
	
	// Only build USES_KANJI relationships (needed for Word Builder)
	var created, total int
	err := db.QueryRow("SELECT * FROM build_kanji_word_relations()").Scan(&created, &total)
	if err != nil {
		return fmt.Errorf("failed to build kanji-word relations: %w", err)
	}
	log.Printf("Kanji-word relations: Created %d, Total %d", created, total)
	
	// Refresh kanji adjacency map for Word Builder
	log.Println("Refreshing kanji adjacency map for Word Builder...")
	if _, err := db.Exec("SELECT refresh_kanji_adjacency_map()"); err != nil {
		log.Printf("Warning: Failed to refresh kanji adjacency map: %v", err)
	} else {
		var count int64
		if err := db.QueryRow("SELECT COUNT(*) FROM kanji_adjacency_map").Scan(&count); err == nil {
			log.Printf("Kanji adjacency map refreshed successfully! (%d entries)", count)
		} else {
			log.Println("Kanji adjacency map refreshed (count verification failed)")
		}
	}
	
	return nil
}
