package server

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// clerkAuth holds deps for validating Clerk JWTs and mapping to internal users.
type clerkAuth struct {
	jwks *keyfunc.JWKS
	db   *gorm.DB
	// If true, and no valid mapping is found, middleware will set a dev fallback user_id=1.
	allowDevFallback bool
	// JWT validation settings
	audience string
	issuer   string
}

// newClerkAuth initializes the JWKS client from env and returns a middleware helper.
func newClerkAuth(postgresDB *gorm.DB) (*clerkAuth, error) {
	jwksURL := os.Getenv("CLERK_JWKS_URL")
	if jwksURL == "" {
		// If not set, try to derive from issuer
		if iss := os.Getenv("CLERK_ISSUER"); iss != "" {
			jwksURL = strings.TrimSuffix(iss, "/") + "/.well-known/jwks.json"
		}
	}

	if jwksURL == "" {
		return nil, errors.New("CLERK_JWKS_URL or CLERK_ISSUER must be set")
	}

	// Build JWKS with background refresh and caching
	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{
		RefreshErrorHandler: func(err error) {
			log.Printf("clerk jwks refresh error: %v", err)
		},
		RefreshUnknownKID: true,             // fetch if unknown KID encountered
		RefreshRateLimit:  time.Minute * 5,  // limit refresh frequency
		RefreshTimeout:    time.Second * 10, // timeout for refresh requests
		Client:            &http.Client{Timeout: time.Second * 10},
	})
	if err != nil {
		return nil, err
	}

	ca := &clerkAuth{
		jwks: jwks,
		db:   postgresDB,
		// Get validation settings from environment
		audience: os.Getenv("CLERK_AUDIENCE"),
		issuer:   os.Getenv("CLERK_ISSUER"),
	}

	if strings.ToLower(os.Getenv("APP_ENV")) != "prod" && os.Getenv("ALLOW_DEV_FALLBACK_USER") != "0" {
		ca.allowDevFallback = true
	}

	log.Printf("Clerk auth initialized - issuer: %s, audience: %s", ca.issuer, ca.audience)
	return ca, nil
}

// Middleware returns a Fiber middleware that validates Clerk JWTs (if provided) and sets user context.
// - If Authorization header is missing and dev fallback is enabled, sets user_id=1 to avoid panics in dev.
// - If token is valid, sets c.Locals("clerk_user_id") and attempts to resolve numeric user_id from DB.
func (caa *clerkAuth) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authz := c.Get("Authorization")
		if authz == "" {
			if caa.allowDevFallback {
				c.Locals("user_id", int64(1))
				c.Locals("clerk_user_id", "dev_user_123")
				return c.Next()
			}
			// No token; continue without user context.
			return c.Next()
		}

		parts := strings.SplitN(authz, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid authorization header format",
				"code":  "INVALID_AUTH_HEADER",
			})
		}

		tokenStr := strings.TrimSpace(parts[1])

		// Parse and validate JWT using JWKS
		tok, err := jwt.Parse(tokenStr, caa.jwks.Keyfunc)
		if err != nil {
			log.Printf("JWT parsing error: %v", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
				"code":  "INVALID_TOKEN",
			})
		}

		if !tok.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "token validation failed",
				"code":  "INVALID_TOKEN",
			})
		}

		claims, ok := tok.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid token claims format",
				"code":  "INVALID_CLAIMS",
			})
		}

		// Validate issuer if configured
		if caa.issuer != "" {
			if iss, _ := claims["iss"].(string); iss != caa.issuer {
				log.Printf("JWT issuer mismatch: expected %s, got %s", caa.issuer, iss)
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "invalid token issuer",
					"code":  "INVALID_ISSUER",
				})
			}
		}

		// Validate audience if configured
		if caa.audience != "" {
			if aud, _ := claims["aud"].(string); aud != caa.audience {
				log.Printf("JWT audience mismatch: expected %s, got %s", caa.audience, aud)
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "invalid token audience",
					"code":  "INVALID_AUDIENCE",
				})
			}
		}

		// Extract Clerk user id from sub
		sub, _ := claims["sub"].(string)
		if sub == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing subject in token",
				"code":  "MISSING_SUBJECT",
			})
		}
		c.Locals("clerk_user_id", sub)

		// Attempt to resolve our internal numeric user id
		if caa.db != nil {
			var id int64
			// Query for user_id using clerk_id (TEXT column)
			if err := caa.db.Raw("SELECT id FROM users WHERE clerk_id = ? LIMIT 1", sub).Scan(&id).Error; err == nil && id != 0 {
				c.Locals("user_id", id)
				log.Printf("Mapped Clerk user %s to internal user_id %d", sub, id)
			} else if caa.allowDevFallback {
				c.Locals("user_id", int64(1))
				log.Printf("Using dev fallback user_id=1 for Clerk user %s", sub)
			} else {
				log.Printf("No internal user mapping found for Clerk user %s", sub)
			}
		} else if caa.allowDevFallback {
			c.Locals("user_id", int64(1))
		}

		return c.Next()
	}
}
