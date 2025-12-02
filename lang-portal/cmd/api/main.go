package main

import (
	"context"
	"fmt"
	"lang-portal/internal/config"
	"lang-portal/internal/server"
	"log"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	// Initialize observability and infrastructure clients
	if err := config.InitSentry(); err != nil {
		log.Printf("Failed to initialize Sentry: %v", err)
	}
	defer config.FlushSentry()

	// Initialize Valkey cache (optional, non-fatal if unavailable)
	config.InitCache()

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	if dbHost == "" || dbUser == "" || dbName == "" {
		return fmt.Errorf("database configuration missing: DB_HOST, DB_USER, and DB_NAME are required")
	}

	if dbPort == "" {
		dbPort = "5432"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)
	postgresDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to PostgreSQL database: %w", err)
	}
	log.Printf("Connected to PostgreSQL database")

	// Create and initialize the server
	fiberServer, err := server.NewFiberServer(postgresDB)
	if err != nil {
		return fmt.Errorf("failed to create server: %w", err)
	}

	// Start the server in a goroutine
	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8080"
		}

		// Retry logic for port binding (handles Air hot reload race condition)
		maxRetries := 3
		for i := 0; i < maxRetries; i++ {
			err := fiberServer.Start(port)
			if err == nil {
				return // Success
			}

			// Check if it's a port binding error
			errStr := err.Error()
			if i < maxRetries-1 && strings.Contains(errStr, "bind: address already in use") {
				// Port still in use, kill it aggressively and retry immediately
				log.Printf("Port %s in use, cleaning up... (attempt %d/%d)", port, i+1, maxRetries)
				// Kill any process on the port immediately
				exec.Command("sh", "-c", fmt.Sprintf("lsof -ti:%s | xargs kill -9 2>/dev/null || true", port)).Run()
				// Retry immediately - kill -9 should release port instantly
				continue
			}

			log.Printf("Server error: %v", err)
			return
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
