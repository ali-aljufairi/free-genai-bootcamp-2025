package config

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// cacheClient is a shared Valkey/Redis-compatible client for the backend.
// It is initialized once at startup from environment variables.
var cacheClient *redis.Client

// InitCache initializes the global cache client from environment variables.
// If configuration is missing or Valkey is unavailable, it logs a warning
// and leaves caching disabled (the rest of the app continues to work).
func InitCache() {
	host := os.Getenv("VALKEY_HOST")
	if host == "" {
		log.Printf("Valkey cache not configured: VALKEY_HOST is empty, caching disabled")
		return
	}

	port := os.Getenv("VALKEY_PORT")
	if port == "" {
		port = "6379"
	}

	dbStr := os.Getenv("VALKEY_DB")
	db := 0
	if dbStr != "" {
		if v, err := strconv.Atoi(dbStr); err == nil && v >= 0 {
			db = v
		}
	}

	addr := host + ":" + port
	client := redis.NewClient(&redis.Options{
		Addr:        addr,
		DB:          db,
		ReadTimeout:  500 * time.Millisecond,
		WriteTimeout: 500 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Valkey cache disabled: ping to %s failed: %v", addr, err)
		_ = client.Close()
		return
	}

	cacheClient = client
	log.Printf("Valkey cache initialized at %s (db=%d)", addr, db)
}

// GetCacheClient returns the shared cache client or nil if caching is disabled.
func GetCacheClient() *redis.Client {
	return cacheClient
}


