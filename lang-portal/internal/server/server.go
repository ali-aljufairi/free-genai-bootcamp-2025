package server

import (
	"fmt"
	"lang-portal/internal/database"
	"log"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type FiberServer struct {
	App        *fiber.App
	sqlDB      *database.DB
	sqliteDB   *gorm.DB
	postgresDB *gorm.DB
}

func NewFiberServer(sqliteDB *gorm.DB, postgresDB *gorm.DB) (*FiberServer, error) {
	// Initialize SQLite database
	sqlDB, err := database.New("./words.db")
	if err != nil {
		return nil, fmt.Errorf("failed to initialize SQLite database: %w", err)
	}

	server := &FiberServer{
		App: fiber.New(fiber.Config{
			DisableStartupMessage: false,
		}),
		sqlDB:      sqlDB,
		sqliteDB:   sqliteDB,
		postgresDB: postgresDB, // PostgreSQL connection if available
	}

	server.RegisterFiberRoutes()
	return server, nil
}

func (s *FiberServer) Start(port string) error {
	log.Printf("Server is starting on port %s", port)
	return s.App.Listen(fmt.Sprintf(":%s", port))
}

func (s *FiberServer) Shutdown() error {
	return s.App.Shutdown()
}

func (s *FiberServer) Health() map[string]interface{} {
	health := map[string]interface{}{
		"status": "healthy",
		"sqlite": s.sqlDB.Health(),
	}

	if s.postgresDB != nil {
		health["postgres"] = "connected"
	} else {
		health["postgres"] = "not connected"
	}

	return health
}

func (s *FiberServer) testSentryHandler(c *fiber.Ctx) error {
	// Test Sentry integration by capturing a test message and error
	CaptureMessage(c, "Test message from Go backend - Sentry integration working!")

	// Also test error capture
	testErr := fmt.Errorf("test error for Sentry integration - this is intentional")
	CaptureError(c, testErr)

	return c.JSON(fiber.Map{
		"message": "Sentry test completed - check your Sentry dashboard",
		"status":  "success",
	})
}
