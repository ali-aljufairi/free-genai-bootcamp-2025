package main

import (
	"bufio"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

var (
	flags   = flag.NewFlagSet("migrate", flag.ExitOnError)
	dir     = flags.String("dir", "internal/database/migrations", "directory with migration files")
	verbose = flags.Bool("v", false, "enable verbose mode")
	envFile = flags.String("env", ".env", "Path to .env file")
)

// loadEnvFile loads environment variables from .env file
func loadEnvFile(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return err
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		// Skip empty lines and comments
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Split on first = sign
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Only set if not already set by environment
		if os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}

	return scanner.Err()
}

func main() {
	flags.Parse(os.Args[1:])
	args := flags.Args()

	if len(args) < 1 {
		flags.Usage()
		log.Fatal("Usage: migrate [command] [args...]")
		return
	}

	// Load .env file
	if err := loadEnvFile(*envFile); err != nil {
		log.Printf("Warning: Could not load .env file: %v", err)
	}

	command := args[0]

	// Try DATABASE_URL first, then fall back to constructing from DB_* variables (same as application)
	dbString := os.Getenv("DATABASE_URL")
	if dbString == "" {
		// Construct DSN the same way the application does
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")

		if dbHost == "" || dbUser == "" || dbName == "" {
			log.Fatal("Either DATABASE_URL or DB_HOST/DB_USER/DB_NAME environment variables are required")
		}

		if dbPort == "" {
			dbPort = "5432"
		}

		dbString = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			dbHost, dbPort, dbUser, dbPassword, dbName)
		log.Printf("Constructed database connection from DB_* variables")
	} else {
		log.Printf("Using DATABASE_URL for database connection")
	}

	db, err := sql.Open("postgres", dbString)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	if *verbose {
		goose.SetVerbose(true)
	}

	if err := goose.Run(command, db, *dir, args[1:]...); err != nil {
		log.Fatalf("migrate %v: %v", command, err)
	}
}
