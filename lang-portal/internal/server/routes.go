package server

import (
	"lang-portal/internal/database"
	"lang-portal/internal/handlers"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"gorm.io/gorm"
)

func (s *FiberServer) RegisterFiberRoutes() {
	// Apply Sentry middleware first
	s.App.Use(SentryMiddleware())

	// Apply CORS middleware
	s.App.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Accept,Authorization,Content-Type",
		AllowCredentials: false, // credentials require explicit origins
		MaxAge:           300,
	}))

	s.App.Get("/", s.HelloWorldHandler)
	s.App.Get("/health", s.healthHandler)

	// Test endpoints for development
	if strings.ToLower(os.Getenv("APP_ENV")) != "prod" {
		dashboardHandler := handlers.NewDashboardHandler(s.sqlDB)
		s.App.Get("/test/sentry", dashboardHandler.TestSentry)
	}

	// Auth middleware (Clerk) - best effort. If not configured, routes still work; handlers may rely on dev fallback.
	var authMW fiber.Handler
	if ca, err := newClerkAuth(s.postgresDB); err == nil {
		authMW = ca.Middleware()
		log.Printf("Clerk authentication enabled")
	} else {
		log.Printf("Clerk authentication not configured: %v", err)
		// In development, create a simple fallback middleware
		if strings.ToLower(os.Getenv("APP_ENV")) != "prod" && os.Getenv("ALLOW_DEV_FALLBACK_USER") != "0" {
			authMW = createDevFallbackMiddleware()
			log.Printf("Using development fallback authentication (user_id=1)")
		}
	}

	// API v2 routes
	if authMW != nil {
		s.App.Use("/api/v2", authMW)
	}
	setupV2Routes(s.App, s.sqlDB, s.postgresDB)

	// Protected langportal routes - apply auth middleware
	if authMW != nil {
		s.App.Use("/api/langportal", authMW)
	}

	// Dashboard routes
	dashboardHandler := handlers.NewDashboardHandler(s.sqlDB)
	s.App.Get("/api/langportal/dashboard/last_study_session", dashboardHandler.GetLastStudySession)
	s.App.Get("/api/langportal/dashboard/study_progress", dashboardHandler.GetStudyProgress)
	s.App.Get("/api/langportal/dashboard/quick-stats", dashboardHandler.GetQuickStats)

	// Study session routes
	studySessionHandler := handlers.NewStudySessionHandler(s.sqlDB)
	s.App.Get("/api/langportal/study_sessions", studySessionHandler.GetStudySessions)
	s.App.Get("/api/langportal/study_sessions/:id", studySessionHandler.GetStudySession)
	s.App.Get("/api/langportal/study_sessions/:id/words", studySessionHandler.GetStudySessionWords)
	s.App.Post("/api/langportal/study_sessions", studySessionHandler.CreateStudySession)
	s.App.Post("/api/langportal/study_sessions/:id/words/:word_id/review", studySessionHandler.ReviewWord)

	// Group routes
	groupHandler := handlers.NewGroupHandler(s.sqlDB)
	s.App.Get("/api/langportal/groups", groupHandler.GetGroups)
	s.App.Get("/api/langportal/groups/:id", groupHandler.GetGroup)
	s.App.Get("/api/langportal/groups/:id/words", groupHandler.GetGroupWords)
	s.App.Get("/api/langportal/groups/:id/study_sessions", groupHandler.GetGroupStudySessions)

	// Study activity routes
	studyActivityHandler := handlers.NewStudyActivityHandler(s.sqlDB)
	s.App.Get("/api/langportal/study_activities", studyActivityHandler.GetStudyActivities)
	s.App.Get("/api/langportal/study_activities/:id", studyActivityHandler.GetStudyActivity)
	s.App.Get("/api/langportal/study_activities/:id/sessions", studyActivityHandler.GetStudyActivitySessions)
	s.App.Post("/api/langportal/study_activities", studyActivityHandler.CreateStudyActivity)

	// Word routes
	wordHandler := handlers.NewWordHandler(s.sqlDB)
	s.App.Get("/api/langportal/words", wordHandler.GetWords)
	s.App.Get("/api/langportal/words/search", wordHandler.SearchWords)
	s.App.Get("/api/langportal/words/random", wordHandler.GetRandomWord)
	s.App.Get("/api/langportal/words/random/batch", wordHandler.GetRandomWords)
	s.App.Get("/api/langportal/words/stats", wordHandler.GetWordStats)
	s.App.Get("/api/langportal/words/:id", wordHandler.GetWord)
	s.App.Put("/api/langportal/words/:id", wordHandler.UpdateWord)
	s.App.Delete("/api/langportal/words/:id", wordHandler.DeleteWord)
	s.App.Post("/api/langportal/words", wordHandler.CreateWord)
	s.App.Post("/api/langportal/words/bulk", wordHandler.BulkCreateWords)
	s.App.Get("/api/langportal/words/jlpt/:level", wordHandler.GetWordsByJLPTLevel)
	s.App.Get("/api/langportal/words/pos/:pos", wordHandler.GetWordsByPartOfSpeech)
	s.App.Get("/api/langportal/words/kanji/:kanji", wordHandler.GetWordsByKanji)

	// JLPT SQLite-based routes
	jlptSQLiteHandler := handlers.NewJLPTSQLiteHandler(s.sqlDB)
	s.App.Get("/api/langportal/jlpt/:level/random-kanji", jlptSQLiteHandler.GetRandomKanji)

	// Flashcard routes (prefer PostgreSQL; return 503 if unavailable)
	if s.postgresDB != nil {
		flashcardHandler := handlers.NewFlashcardHandler(s.postgresDB)
		s.App.Post("/api/langportal/flashcards/start", flashcardHandler.StartFlashcardSession)
		s.App.Post("/api/langportal/flashcards/submit", flashcardHandler.SubmitFlashcardSession)
		s.App.Get("/api/langportal/flashcards/history", flashcardHandler.GetFlashcardHistory)
		s.App.Get("/api/langportal/flashcards/courses", flashcardHandler.GetAvailableCourses)
		s.App.Get("/api/langportal/flashcards/courses/:courseId/units", flashcardHandler.GetCourseUnits)
		s.App.Get("/api/langportal/flashcards/parts-of-speech", flashcardHandler.GetAvailablePartsOfSpeech)
	} else {
		s.App.All("/api/langportal/flashcards/*", func(c *fiber.Ctx) error {
			return c.Status(503).JSON(fiber.Map{"error": "PostgreSQL database not available"})
		})
	}

	// Disabled routes during migration
	s.App.All("/api/langportal/kanji/*/compounds", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Functionality disabled during migration"})
	})
	s.App.All("/api/langportal/kanji/validate-compound", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Functionality disabled during migration"})
	})
	s.App.All("/api/langportal/neo4j/*", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Functionality disabled during migration"})
	})
	s.App.All("/api/langportal/game/*", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Game functionality disabled during migration"})
	})
}

func (s *FiberServer) HelloWorldHandler(c *fiber.Ctx) error {
	resp := fiber.Map{
		"message": "Hello World",
	}

	return c.JSON(resp)
}

func (s *FiberServer) healthHandler(c *fiber.Ctx) error {
	return c.JSON(s.Health())
}

func setupV2Routes(app *fiber.App, db *database.DB, postgresDB *gorm.DB) {
	// User management routes - use PostgreSQL when available
	var userHandler *handlers.UserHandler
	if postgresDB != nil {
		userHandler = handlers.NewUserHandler(&database.DB{PostgresDB: postgresDB})
	} else {
		userHandler = handlers.NewUserHandler(db)
	}

	// Current user endpoint (no ID needed - uses auth middleware)
	app.Get("/api/v2/users/me", userHandler.GetMe)

	// User profile and management
	app.Get("/api/v2/users/:id/profile", userHandler.GetUserProfile)
	app.Post("/api/v2/users", userHandler.CreateUser)
	app.Put("/api/v2/users/:id", userHandler.UpdateUser)

	// User settings
	app.Get("/api/v2/users/:id/settings", userHandler.GetUserSettings)
	app.Put("/api/v2/users/:id/settings", userHandler.UpdateUserSettings)

	// User roles
	app.Get("/api/v2/users/:id/roles", userHandler.GetUserRoles)
	app.Post("/api/v2/users/:id/roles", userHandler.AssignRole)

	// User subscriptions
	app.Get("/api/v2/users/:id/subscription", userHandler.GetUserSubscription)
	app.Post("/api/v2/users/:id/subscription", userHandler.CreateSubscription)
	app.Put("/api/v2/users/:id/subscription", userHandler.UpdateSubscription)

	// JLPT level assessment and SRS management
	app.Post("/api/v2/users/:id/assess-jlpt", userHandler.AssessUserJLPTLevel)
	app.Get("/api/v2/users/:id/jlpt-level", userHandler.GetUserJLPTLevel)
	app.Post("/api/v2/users/:id/reset-srs", userHandler.ResetUserSRSProgress)

	// Subscription management
	app.Get("/api/v2/users/:id/subscription/status", userHandler.CheckSubscriptionStatus)
	app.Post("/api/v2/users/:id/subscription/cancel", userHandler.CancelSubscription)

	// Kanji management routes - use PostgreSQL if available
	if postgresDB != nil {
		kanjiHandler := handlers.NewKanjiHandler(postgresDB)

		// Kanji CRUD and search
		app.Get("/api/v2/kanji", kanjiHandler.SearchKanji)
		app.Get("/api/v2/kanji/random", kanjiHandler.GetRandomKanji)
		app.Get("/api/v2/kanji/stats", kanjiHandler.GetKanjiStats)
		app.Get("/api/v2/kanji/:id", kanjiHandler.GetKanji)
		app.Get("/api/v2/kanji/character/:character", kanjiHandler.GetKanjiByCharacter)
		app.Get("/api/v2/kanji/character/:character/strokes", kanjiHandler.GetKanjiStrokeData)

		// Kanji filtering
		app.Get("/api/v2/kanji/jlpt/:level", kanjiHandler.GetKanjiByJLPTLevel)
		app.Get("/api/v2/kanji/strokes/:min/:max", kanjiHandler.GetKanjiByStrokeCount)
		app.Get("/api/v2/kanji/with-svg", kanjiHandler.GetKanjiWithSVG)
	} else {
		// Fallback for when PostgreSQL is not available
		app.Get("/api/v2/kanji/*", func(c *fiber.Ctx) error {
			return c.Status(503).JSON(fiber.Map{"error": "PostgreSQL database not available"})
		})
	}

	// Word management routes
	wordHandler := handlers.NewWordHandler(db)

	// Word CRUD and search
	app.Get("/api/v2/words", wordHandler.GetWords)
	app.Get("/api/v2/words/search", wordHandler.SearchWords)
	app.Get("/api/v2/words/stats", wordHandler.GetWordStats)
	app.Get("/api/v2/words/random", wordHandler.GetRandomWord)
	app.Get("/api/v2/words/random/batch", wordHandler.GetRandomWords)
	app.Get("/api/v2/words/:id", wordHandler.GetWord)
	app.Put("/api/v2/words/:id", wordHandler.UpdateWord)
	app.Delete("/api/v2/words/:id", wordHandler.DeleteWord)
	app.Post("/api/v2/words", wordHandler.CreateWord)
	app.Post("/api/v2/words/bulk", wordHandler.BulkCreateWords)

	// Word filtering
	app.Get("/api/v2/words/jlpt/:level", wordHandler.GetWordsByJLPTLevel)
	app.Get("/api/v2/words/pos/:pos", wordHandler.GetWordsByPartOfSpeech)
	app.Get("/api/v2/words/kanji/:kanji", wordHandler.GetWordsByKanji)

	// Grammar management routes
	grammarHandler := handlers.NewGrammarHandler(db)

	// Grammar CRUD and search
	app.Get("/api/v2/grammar", grammarHandler.SearchGrammarPoints)
	app.Get("/api/v2/grammar/stats", grammarHandler.GetGrammarStats)
	app.Get("/api/v2/grammar/random", grammarHandler.GetRandomGrammarPoint)
	app.Get("/api/v2/grammar/:id", grammarHandler.GetGrammarPoint)
	app.Get("/api/v2/grammar/key/:key", grammarHandler.GetGrammarPointByKey)

	// Grammar filtering and details
	app.Get("/api/v2/grammar/level/:level", grammarHandler.GetGrammarPointsByLevel)
	app.Get("/api/v2/grammar/:id/examples", grammarHandler.GetGrammarExamples)
	app.Get("/api/v2/grammar/:id/readings", grammarHandler.GetGrammarReadings)
	app.Get("/api/v2/grammar/:id/related", grammarHandler.GetRelatedGrammarPoints)

	// Content search routes
	contentSearchHandler := handlers.NewContentSearchHandler(db)

	// Unified content search
	app.Get("/api/v2/search", contentSearchHandler.SearchContent)
	app.Get("/api/v2/search/recommendations/:user_id", contentSearchHandler.GetContentRecommendations)
	app.Get("/api/v2/search/stats", contentSearchHandler.GetContentStats)

	// Flashcard routes
	if postgresDB != nil {
		flashcardHandler := handlers.NewFlashcardHandler(postgresDB)
		// Flashcard management
		app.Post("/api/v2/flashcards/start", flashcardHandler.StartFlashcardSession)
		app.Post("/api/v2/flashcards/submit", flashcardHandler.SubmitFlashcardSession)
		app.Get("/api/v2/flashcards/history", flashcardHandler.GetFlashcardHistory)
		app.Get("/api/v2/flashcards/courses", flashcardHandler.GetAvailableCourses)
		app.Get("/api/v2/flashcards/courses/:courseId/units", flashcardHandler.GetCourseUnits)
		app.Get("/api/v2/flashcards/parts-of-speech", flashcardHandler.GetAvailablePartsOfSpeech)
	} else {
		app.All("/api/v2/flashcards/*", func(c *fiber.Ctx) error {
			return c.Status(503).JSON(fiber.Map{"error": "PostgreSQL database not available"})
		})
	}
}

// createDevFallbackMiddleware creates a simple middleware for development that sets a fallback user
func createDevFallbackMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Set fallback user for development
		c.Locals("user_id", int64(1))
		c.Locals("clerk_user_id", "dev_user_123")

		// Add development headers for debugging
		c.Set("X-Dev-Mode", "true")
		c.Set("X-Dev-User", "fallback-user-1")

		log.Printf("[DEV] Request to %s %s - using fallback user_id=1", c.Method(), c.Path())
		return c.Next()
	}
}
