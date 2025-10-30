package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
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

// ClerkUser represents the user data from Clerk API
type ClerkUser struct {
	ID             string `json:"id"`
	EmailAddresses []struct {
		EmailAddress string `json:"email_address"`
		Primary      bool   `json:"primary"`
	} `json:"email_addresses"`
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	FullName  *string `json:"full_name"`
	Username  *string `json:"username"`
}

// fetchClerkUser fetches user data from Clerk API
func fetchClerkUser(userID string) (*ClerkUser, error) {
	secretKey := os.Getenv("CLERK_SECRET_KEY")
	if secretKey == "" {
		return nil, errors.New("CLERK_SECRET_KEY environment variable not set")
	}

	url := fmt.Sprintf("https://api.clerk.com/v1/users/%s", userID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+secretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("clerk API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var user ClerkUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &user, nil
}

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
			// In production, require authentication - reject requests without token
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authentication required",
				"code":  "AUTHENTICATION_REQUIRED",
			})
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
			} else {
				// User doesn't exist, let's create them automatically
				log.Printf("No user found for Clerk ID %s, creating new user", sub)

				// Fetch real user data from Clerk API
				clerkUser, err := fetchClerkUser(sub)
				var email, name string

				if err != nil {
					log.Printf("Failed to fetch user data from Clerk API for user %s: %v", sub, err)
					// Fallback to JWT claims and defaults
					log.Printf("Available JWT claims for user %s: %+v", sub, claims)

					email, _ = claims["email"].(string)
					if email == "" {
						email = fmt.Sprintf("%s@clerk.user", sub) // Fallback email
					}

					name, _ = claims["name"].(string)
					if name == "" {
						name = "User" // Fallback name
					}
				} else {
					// Use real data from Clerk API
					log.Printf("Successfully fetched user data from Clerk API for user %s", sub)

					// Get primary email
					email = fmt.Sprintf("%s@clerk.user", sub) // Default fallback
					for _, emailAddr := range clerkUser.EmailAddresses {
						if emailAddr.Primary {
							email = emailAddr.EmailAddress
							break
						}
					}
					// If no primary email found, use the first one
					if email == fmt.Sprintf("%s@clerk.user", sub) && len(clerkUser.EmailAddresses) > 0 {
						email = clerkUser.EmailAddresses[0].EmailAddress
					}

					// Get display name
					name = "User" // Default fallback
					if clerkUser.FullName != nil && *clerkUser.FullName != "" {
						name = *clerkUser.FullName
					} else if clerkUser.FirstName != nil && *clerkUser.FirstName != "" {
						if clerkUser.LastName != nil && *clerkUser.LastName != "" {
							name = *clerkUser.FirstName + " " + *clerkUser.LastName
						} else {
							name = *clerkUser.FirstName
						}
					} else if clerkUser.Username != nil && *clerkUser.Username != "" {
						name = *clerkUser.Username
					}

					log.Printf("Using real user data: email=%s, name=%s", email, name)
				}

				// Create the user with proper setup
				createUserQuery := `
					INSERT INTO users (clerk_id, email, display_name, created_at, updated_at) 
					VALUES (?, ?, ?, NOW(), NOW()) 
					RETURNING id`

				if err := caa.db.Raw(createUserQuery, sub, email, name).Scan(&id).Error; err != nil {
					log.Printf("Failed to create user for Clerk ID %s: %v", sub, err)
					if caa.allowDevFallback {
						c.Locals("user_id", int64(1))
						log.Printf("Using dev fallback user_id=1 for Clerk user %s", sub)
					} else {
						log.Printf("No internal user mapping found for Clerk user %s", sub)
					}
				} else {
					// Create default user settings
					settingsQuery := `
						INSERT INTO user_settings (user_id, hide_english, ui_language, timezone, daily_review_target, current_jlpt_level)
						VALUES (?, false, 'en', 'UTC', 20, 5)`

					if err := caa.db.Exec(settingsQuery, id).Error; err != nil {
						log.Printf("Failed to create user settings for user_id %d: %v", id, err)
					}

					// Assign default student role
					roleQuery := `
						INSERT INTO user_roles (user_id, role_id)
						SELECT ?, r.id
						FROM roles r 
						WHERE r.role_name = 'student'
						LIMIT 1`

					if err := caa.db.Exec(roleQuery, id).Error; err != nil {
						log.Printf("Failed to assign student role to user_id %d: %v", id, err)
					}

					c.Locals("user_id", id)
					log.Printf("Created and mapped Clerk user %s to new internal user_id %d with full setup", sub, id)
				}
			}
		} else if caa.allowDevFallback {
			c.Locals("user_id", int64(1))
		}

		return c.Next()
	}
}
