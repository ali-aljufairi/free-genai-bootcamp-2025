package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestJellyfinDictionaryRouteAuthenticationMethodsAndIsolation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`CREATE TABLE words (id INTEGER PRIMARY KEY, kanji TEXT, kana TEXT, english TEXT, part_of_speech TEXT, jlpt INTEGER)`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO words VALUES (1,'猫','ねこ','cat','noun',5)`).Error; err != nil {
		t.Fatal(err)
	}

	app := fiber.New()
	registerJellyfinRoutes(app, db, "secret")
	app.Get("/unrelated", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	tests := []struct {
		name, method, token, origin string
		want                        int
	}{
		{"authenticated post", http.MethodPost, "secret", "", fiber.StatusOK},
		{"missing token", http.MethodPost, "", "", fiber.StatusUnauthorized},
		{"invalid token", http.MethodPost, "wrong", "", fiber.StatusUnauthorized},
		{"browser post", http.MethodPost, "secret", "https://example.test", fiber.StatusForbidden},
		{"browser preflight", http.MethodOptions, "secret", "https://example.test", fiber.StatusForbidden},
		{"get rejected", http.MethodGet, "secret", "", fiber.StatusMethodNotAllowed},
		{"put rejected", http.MethodPut, "secret", "", fiber.StatusMethodNotAllowed},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/internal/jellyfin/dictionary/analyze", strings.NewReader(`{"text":"猫"}`))
			req.Header.Set("Content-Type", "application/json")
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
			if resp.StatusCode != tt.want {
				t.Fatalf("got %d, want %d", resp.StatusCode, tt.want)
			}
		})
	}

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/unrelated", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("Jellyfin middleware leaked onto unrelated route: %d", resp.StatusCode)
	}
}
