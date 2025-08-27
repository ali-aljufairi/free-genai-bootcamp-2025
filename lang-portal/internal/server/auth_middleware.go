package server

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

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

	// Build JWKS with background refresh
	jwks, err := keyfunc.Get(jwksURL, keyfunc.Options{
		RefreshErrorHandler: func(err error) {
			log.Printf("clerk jwks refresh error: %v", err)
		},
		RefreshUnknownKID: true, // fetch if unknown KID encountered
		Client:            &http.Client{},
	})
	if err != nil {
		return nil, err
	}

	ca := &clerkAuth{
		jwks: jwks,
		db:   postgresDB,
	}
	if strings.ToLower(os.Getenv("APP_ENV")) != "prod" && os.Getenv("ALLOW_DEV_FALLBACK_USER") != "0" {
		ca.allowDevFallback = true
	}
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
				return c.Next()
			}
			// No token; continue without user context.
			return c.Next()
		}

		parts := strings.SplitN(authz, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid authorization header"})
		}

		tokenStr := strings.TrimSpace(parts[1])

		// Parse and validate JWT using JWKS
		tok, err := jwt.Parse(tokenStr, caa.jwks.Keyfunc)
		if err != nil || !tok.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired token"})
		}

		claims, ok := tok.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token claims"})
		}

		// Extract Clerk user id from sub
		sub, _ := claims["sub"].(string)
		if sub == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing subject in token"})
		}
		c.Locals("clerk_user_id", sub)

		// Attempt to resolve our internal numeric user id
		if caa.db != nil {
			var id int64
			// Query for user_id using clerk_id (TEXT column)
			if err := caa.db.Raw("SELECT id FROM users WHERE clerk_id = ? LIMIT 1", sub).Scan(&id).Error; err == nil && id != 0 {
				c.Locals("user_id", id)
			} else if caa.allowDevFallback {
				c.Locals("user_id", int64(1))
			}
		} else if caa.allowDevFallback {
			c.Locals("user_id", int64(1))
		}

		return c.Next()
	}
}
