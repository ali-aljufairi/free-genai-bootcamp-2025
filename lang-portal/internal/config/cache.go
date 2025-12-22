package config

import (
	"context"
	"fmt"
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
		log.Printf("⚠️  Valkey cache not configured: VALKEY_HOST environment variable is empty, caching disabled")
		log.Printf("   To enable caching, set VALKEY_HOST, VALKEY_PORT (optional, default: 6379), and VALKEY_DB (optional, default: 0)")
		return
	}

	port := os.Getenv("VALKEY_PORT")
	if port == "" {
		port = "6379"
		log.Printf("Valkey cache: VALKEY_PORT not set, using default port 6379")
	}

	dbStr := os.Getenv("VALKEY_DB")
	db := 0
	if dbStr != "" {
		if v, err := strconv.Atoi(dbStr); err == nil && v >= 0 {
			db = v
		} else {
			log.Printf("⚠️  Valkey cache: Invalid VALKEY_DB value '%s', using default db=0", dbStr)
		}
	}

	addr := host + ":" + port
	log.Printf("Valkey cache: Attempting to connect to %s (db=%d)...", addr, db)

	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		DB:           db,
		ReadTimeout:  500 * time.Millisecond,
		WriteTimeout: 500 * time.Millisecond,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Test connection with ping
	startTime := time.Now()
	err := client.Ping(ctx).Err()
	pingDuration := time.Since(startTime)

	if err != nil {
		log.Printf("❌ Valkey cache connection failed: ping to %s failed after %v", addr, pingDuration)
		log.Printf("   Error details: %v", err)
		log.Printf("   Please check:")
		log.Printf("   - Valkey server is running and accessible at %s", addr)
		log.Printf("   - Network connectivity to Valkey server")
		log.Printf("   - Firewall rules allow connection to port %s", port)
		log.Printf("   - VALKEY_HOST and VALKEY_PORT environment variables are correct")
		_ = client.Close()
		return
	}

	cacheClient = client
	log.Printf("✅ Valkey cache initialized successfully at %s (db=%d) - ping time: %v", addr, db, pingDuration)

	// Test a simple set/get operation to verify cache is working
	testKey := "valkey_health_check"
	testValue := "ok"
	testCtx, testCancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer testCancel()

	if setErr := client.Set(testCtx, testKey, testValue, 5*time.Second).Err(); setErr != nil {
		log.Printf("⚠️  Valkey cache: Warning - SET operation test failed: %v", setErr)
	} else if getVal, getErr := client.Get(testCtx, testKey).Result(); getErr != nil {
		log.Printf("⚠️  Valkey cache: Warning - GET operation test failed: %v", getErr)
	} else if getVal != testValue {
		log.Printf("⚠️  Valkey cache: Warning - GET operation returned unexpected value: got %s, expected %s", getVal, testValue)
	} else {
		log.Printf("✅ Valkey cache: Health check passed (SET/GET operations working)")
	}
}

// GetCacheClient returns the shared cache client or nil if caching is disabled.
func GetCacheClient() *redis.Client {
	return cacheClient
}

// IsCacheEnabled returns true if Valkey cache is configured and connected.
func IsCacheEnabled() bool {
	return cacheClient != nil
}

// GetCacheStatus returns a status string describing the cache configuration.
func GetCacheStatus() string {
	if cacheClient == nil {
		host := os.Getenv("VALKEY_HOST")
		if host == "" {
			return "disabled (VALKEY_HOST not set)"
		}
		return "disabled (connection failed)"
	}

	host := os.Getenv("VALKEY_HOST")
	port := os.Getenv("VALKEY_PORT")
	if port == "" {
		port = "6379"
	}
	dbStr := os.Getenv("VALKEY_DB")
	if dbStr == "" {
		dbStr = "0"
	}
	return "enabled (" + host + ":" + port + ", db=" + dbStr + ")"
}

// TestCacheConnection tests the cache connection and returns an error if it fails.
func TestCacheConnection(ctx context.Context) error {
	if cacheClient == nil {
		return fmt.Errorf("cache client is nil (not initialized)")
	}
	return cacheClient.Ping(ctx).Err()
}
