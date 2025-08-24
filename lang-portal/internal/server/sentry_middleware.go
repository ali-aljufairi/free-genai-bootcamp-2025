package server

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gofiber/fiber/v2"
)

// SentryMiddleware creates a Fiber middleware that integrates with Sentry
func SentryMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Create a new hub for this request
		hub := sentry.CurrentHub().Clone()

		// Create HTTP request for Sentry
		req, _ := http.NewRequest(c.Method(), c.OriginalURL(), nil)
		for k, v := range c.GetReqHeaders() {
			if len(v) > 0 {
				req.Header.Set(k, v[0])
			}
		}

		// Set request context
		hub.Scope().SetRequest(req)

		// Set user context if available
		if userID := c.Locals("user_id"); userID != nil {
			hub.Scope().SetUser(sentry.User{
				ID: fmt.Sprintf("%v", userID),
			})
		}

		if clerkUserID := c.Locals("clerk_user_id"); clerkUserID != nil {
			hub.Scope().SetTag("clerk_user_id", fmt.Sprintf("%v", clerkUserID))
		}

		// Set additional context
		hub.Scope().SetTag("route", c.Route().Path)
		hub.Scope().SetTag("method", c.Method())
		hub.Scope().SetContext("request", map[string]interface{}{
			"url":        c.OriginalURL(),
			"method":     c.Method(),
			"user_agent": c.Get("User-Agent"),
			"ip":         c.IP(),
		})

		// Start transaction for performance monitoring
		transactionName := fmt.Sprintf("%s %s", c.Method(), c.Route().Path)
		transaction := sentry.StartTransaction(context.Background(), transactionName)
		transaction.SetTag("http.method", c.Method())
		transaction.SetTag("http.route", c.Route().Path)
		defer transaction.Finish()

		// Store hub and transaction in context
		c.Locals("sentry_hub", hub)
		c.Locals("sentry_transaction", transaction)

		// Recovery middleware to catch panics
		defer func() {
			if r := recover(); r != nil {
				// Capture the panic
				hub.Recover(r)
				hub.Flush(2 * time.Second)

				// Re-panic to let Fiber handle it
				panic(r)
			}
		}()

		// Execute the next handler
		err := c.Next()

		// Capture errors
		if err != nil {
			hub.CaptureException(err)
		}

		// Set response status
		transaction.SetTag("http.status_code", fmt.Sprintf("%d", c.Response().StatusCode()))

		return err
	}
}

// CaptureError captures an error with the current request context
func CaptureError(c *fiber.Ctx, err error) {
	if hub, ok := c.Locals("sentry_hub").(*sentry.Hub); ok {
		hub.CaptureException(err)
	} else {
		sentry.CaptureException(err)
	}
}

// CaptureMessage captures a message with the current request context
func CaptureMessage(c *fiber.Ctx, message string) {
	if hub, ok := c.Locals("sentry_hub").(*sentry.Hub); ok {
		hub.CaptureMessage(message)
	} else {
		sentry.CaptureMessage(message)
	}
}
