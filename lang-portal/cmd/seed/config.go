package main

import (
	"os"
)

// loadConfig loads configuration from environment variables
// Supports both DATABASE_URL and individual DB_* variables
func loadConfig() Config {
	// Try DATABASE_URL first (standard format)
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		return Config{
			DatabaseURL: dbURL,
		}
	}

	// Fall back to individual variables
	return Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		Database: getEnv("DB_NAME", "sorami"),
		User:     getEnv("DB_USER", "sorami_user"),
		Password: getEnv("DB_PASSWORD", ""),
	}
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
