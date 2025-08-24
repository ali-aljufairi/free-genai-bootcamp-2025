package config

import (
	"log"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
)

// InitSentry initializes Sentry with configuration from environment variables
func InitSentry() error {
	dsn := os.Getenv("SENTRY_DSN")
	if dsn == "" {
		log.Printf("Warning: SENTRY_DSN not set, Sentry will not be initialized")
		return nil
	}

	environment := os.Getenv("APP_ENV")
	if environment == "" {
		environment = "development"
	}

	// Skip Sentry in development if explicitly disabled
	if environment == "development" && os.Getenv("SENTRY_ENABLE_IN_DEV") != "true" {
		log.Printf("Sentry disabled in development environment")
		return nil
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:         dsn,
		Environment: environment,
		// Enable performance monitoring
		EnableTracing: true,
		// Set the sample rate for tracing (1.0 = 100% in dev, lower in prod)
		TracesSampleRate: getTracesSampleRate(environment),
		// Add server name for better debugging
		ServerName: getServerName(),
		// Set release if available
		Release: os.Getenv("APP_VERSION"),
		// Before send hook to filter out certain errors
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Filter out health check errors or other noise
			if event.Request != nil && event.Request.URL == "/health" {
				return nil
			}
			return event
		},
	})

	if err != nil {
		return err
	}

	log.Printf("Sentry initialized successfully for environment: %s", environment)
	return nil
}

// FlushSentry ensures all pending events are sent to Sentry
func FlushSentry() {
	sentry.Flush(2 * time.Second)
}

// getTracesSampleRate returns appropriate sample rate based on environment
func getTracesSampleRate(environment string) float64 {
	switch environment {
	case "production", "prod":
		return 0.1 // 10% sampling in production
	case "staging":
		return 0.5 // 50% sampling in staging
	case "development", "dev":
		return 1.0 // 100% sampling in development
	default:
		return 1.0 // 100% sampling for unknown environments
	}
}

// getServerName returns a server identifier
func getServerName() string {
	if serverName := os.Getenv("SERVER_NAME"); serverName != "" {
		return serverName
	}
	if hostname, err := os.Hostname(); err == nil {
		return hostname
	}
	return "lang-portal-backend"
}
