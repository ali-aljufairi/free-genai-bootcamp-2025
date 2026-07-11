package server

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestServiceTokenMiddleware(t *testing.T) {
	tests := []struct {
		name, token, origin string
		expected            int
	}{
		{"valid", "secret", "", 200}, {"missing", "", "", 401}, {"invalid", "wrong", "", 401}, {"browser", "secret", "https://example.test", 403},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(ServiceTokenMiddleware("secret"))
			app.Post("/", func(c *fiber.Ctx) error { return c.SendStatus(200) })
			req := httptest.NewRequest("POST", "/", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			resp, err := app.Test(req)
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != tt.expected {
				t.Fatalf("got %d want %d", resp.StatusCode, tt.expected)
			}
		})
	}
}

func TestServiceTokenMiddlewareFailsClosedWithoutConfiguration(t *testing.T) {
	app := fiber.New()
	app.Use(ServiceTokenMiddleware(""))
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(200) })
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer anything")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 503 {
		t.Fatalf("got %d", resp.StatusCode)
	}
}

func TestServiceTokenFromEnvironmentOrFile(t *testing.T) {
	t.Setenv(jellyfinServiceTokenEnv, "")
	path := filepath.Join(t.TempDir(), "token")
	if err := os.WriteFile(path, []byte("from-file\n"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv(jellyfinServiceTokenFileEnv, path)
	if got := serviceTokenFromEnvironment(); got != "from-file" {
		t.Fatalf("got %q", got)
	}
	t.Setenv(jellyfinServiceTokenEnv, "  from-env\n")
	if got := serviceTokenFromEnvironment(); got != "from-env" {
		t.Fatalf("got %q", got)
	}
}
