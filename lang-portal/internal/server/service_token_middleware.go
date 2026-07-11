package server

import (
	"crypto/sha256"
	"crypto/subtle"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

const jellyfinServiceTokenEnv = "JELLYFIN_SERVICE_TOKEN"
const jellyfinServiceTokenFileEnv = "JELLYFIN_SERVICE_TOKEN_FILE"

func ServiceTokenMiddleware(expectedToken string) fiber.Handler {
	expectedHash := sha256.Sum256([]byte(expectedToken))
	return func(c *fiber.Ctx) error {
		// Internal integration is server-to-server; browser-originated requests are rejected.
		if c.Get("Origin") != "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "browser access forbidden"})
		}
		if expectedToken == "" {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "service authentication unavailable"})
		}
		auth := c.Get(fiber.HeaderAuthorization)
		if !strings.HasPrefix(auth, "Bearer ") {
			return unauthorized(c)
		}
		providedHash := sha256.Sum256([]byte(strings.TrimPrefix(auth, "Bearer ")))
		if subtle.ConstantTimeCompare(expectedHash[:], providedHash[:]) != 1 {
			return unauthorized(c)
		}
		return c.Next()
	}
}

func serviceTokenFromEnvironment() string {
	if token := strings.TrimSpace(os.Getenv(jellyfinServiceTokenEnv)); token != "" {
		return token
	}
	path := os.Getenv(jellyfinServiceTokenFileEnv)
	if path == "" {
		return ""
	}
	token, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(token))
}
func unauthorized(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
}
