package server

import (
	"github.com/gofiber/fiber/v2"
	"io"
	"net/http"
	"testing"
	"encoding/json"
)

// Test for the new public stats endpoint
func TestPublicStatsHandler(t *testing.T) {
	// Note: This test requires actual handler implementation and DB mock
	// This is a template showing the test structure
	
	// Create a Fiber app for testing
	app := fiber.New()
	
	// Inject the Fiber app into the server
	// In real implementation, you'd need to mock the postgresDB
	s := &FiberServer{App: app}
	
	// This would require proper handler setup with mocked DB
	// contentHandler := roothandlers.NewContentSearchHandler(s.postgresDB)
	// app.Get("/api/public/stats", contentHandler.GetContentStats)
	
	// Create a test HTTP request
	req, err := http.NewRequest("GET", "/api/public/stats", nil)
	if err != nil {
		t.Fatalf("error creating request. Err: %v", err)
	}
	
	// Perform the request
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("error making request to server. Err: %v", err)
	}
	
	// Assert status code
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status OK; got %v", resp.Status)
	}
	
	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("error reading response body. Err: %v", err)
	}
	
	// Parse JSON response
	var stats map[string]interface{}
	err = json.Unmarshal(body, &stats)
	if err != nil {
		t.Fatalf("error parsing JSON response. Err: %v", err)
	}
	
	// Verify response structure
	// Expected fields would depend on actual implementation
	// This is a placeholder for the structure check
	if stats == nil {
		t.Error("expected non-nil stats response")
	}
}

// Test that public endpoint doesn't require authentication
func TestPublicStatsNoAuthRequired(t *testing.T) {
	app := fiber.New()
	s := &FiberServer{App: app}
	
	// The endpoint should be accessible without auth headers
	req, err := http.NewRequest("GET", "/api/public/stats", nil)
	if err != nil {
		t.Fatalf("error creating request. Err: %v", err)
	}
	
	// No Authorization header added
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("error making request to server. Err: %v", err)
	}
	
	// Should not return 401 Unauthorized
	if resp.StatusCode == http.StatusUnauthorized {
		t.Error("public endpoint should not require authentication")
	}
}

// Test for vocabulary search endpoint (existing, but verify it's still working)
func TestVocabularySearchEndpoint(t *testing.T) {
	app := fiber.New()
	s := &FiberServer{App: app}
	
	// Mock the content handler
	// In real implementation: contentHandler := roothandlers.NewContentSearchHandler(s.postgresDB)
	// app.Get("/api/langportal/vocabulary/search", contentHandler.SearchContent)
	
	req, err := http.NewRequest("GET", "/api/langportal/vocabulary/search?q=test", nil)
	if err != nil {
		t.Fatalf("error creating request. Err: %v", err)
	}
	
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("error making request to server. Err: %v", err)
	}
	
	// Verify endpoint exists and responds
	// Actual implementation would check response structure
	if resp.StatusCode == http.StatusNotFound {
		t.Error("vocabulary search endpoint should exist")
	}
}
