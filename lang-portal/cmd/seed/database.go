package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

// connectDB establishes a connection to the PostgreSQL database
func connectDB(config Config) (*sql.DB, error) {
	var connStr string
	if config.DatabaseURL != "" {
		connStr = config.DatabaseURL
		log.Printf("Connecting using DATABASE_URL")
	} else {
		connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			config.Host, config.Port, config.User, config.Password, config.Database)
		log.Printf("Connecting with: host=%s port=%s user=%s dbname=%s",
			config.Host, config.Port, config.User, config.Database)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}
