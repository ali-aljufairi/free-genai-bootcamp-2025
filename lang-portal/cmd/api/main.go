package main

import (
	"context"
	"fmt"
	"lang-portal/internal/config"
	"lang-portal/internal/server"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	// Initialize Sentry
	if err := config.InitSentry(); err != nil {
		log.Printf("Failed to initialize Sentry: %v", err)
	}
	defer config.FlushSentry()

	// Initialize both databases
	var sqliteDB *gorm.DB
	var postgresDB *gorm.DB
	var err error

	// Always initialize SQLite
	sqliteDB, err = gorm.Open(sqlite.Open("words.db"), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to SQLite database: %w", err)
	}
	log.Printf("Connected to SQLite database")

	// Try to connect to PostgreSQL
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	if dbHost != "" && dbUser != "" && dbName != "" {
		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)
		postgresDB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Printf("Failed to connect to PostgreSQL: %v", err)
			log.Printf("Continuing with SQLite only...")
			postgresDB = nil
		} else {
			log.Printf("Connected to PostgreSQL database")
		}
	}

	// Create and initialize the server
	fiberServer, err := server.NewFiberServer(sqliteDB, postgresDB)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}

	// Start the server in a goroutine
	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}
		if err := fiberServer.Start(port); err != nil {
			log.Printf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Give outstanding requests 5 seconds to complete
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := fiberServer.Shutdown(); err != nil {
		return fmt.Errorf("error shutting down server: %w", err)
	}

	<-ctx.Done()
	log.Println("Server gracefully stopped")

	return nil
}
