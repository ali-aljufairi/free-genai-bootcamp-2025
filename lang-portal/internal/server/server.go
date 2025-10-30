package server

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type FiberServer struct {
	App        *fiber.App
	postgresDB *gorm.DB
}

func NewFiberServer(postgresDB *gorm.DB) (*FiberServer, error) {
	if postgresDB == nil {
		return nil, fmt.Errorf("PostgreSQL database connection is required")
	}

	server := &FiberServer{
		App: fiber.New(fiber.Config{
			DisableStartupMessage: false,
		}),
		postgresDB: postgresDB,
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
	sqlDB, err := s.postgresDB.DB()
	postgresStatus := "connected"
	if err != nil {
		postgresStatus = "error"
	} else if err := sqlDB.Ping(); err != nil {
		postgresStatus = "disconnected"
	}

	return map[string]interface{}{
		"status":   "healthy",
		"postgres": postgresStatus,
	}
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
