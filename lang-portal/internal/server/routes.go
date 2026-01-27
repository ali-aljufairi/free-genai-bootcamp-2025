package server

import (
	roothandlers "lang-portal/internal/handlers"
	"lang-portal/internal/handlers/chat"
	"lang-portal/internal/handlers/companion"
	"lang-portal/internal/handlers/dashboard"
	"lang-portal/internal/handlers/flashcard"
	"lang-portal/internal/handlers/grammar"
	"lang-portal/internal/handlers/group"
	"lang-portal/internal/handlers/reading"
	"lang-portal/internal/handlers/kanji"
	"lang-portal/internal/handlers/session"
	"lang-portal/internal/handlers/speech"
	"lang-portal/internal/handlers/subscription"
	"lang-portal/internal/handlers/user"
	"lang-portal/internal/handlers/word_builder"
	"lang-portal/internal/handlers/words"
	"lang-portal/internal/repositories"
	"lang-portal/internal/services"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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

	// Public content stats endpoint (no auth required)
	contentHandler := roothandlers.NewContentSearchHandler(s.postgresDB)
	s.App.Get("/api/public/stats", contentHandler.GetContentStats)

	// Test endpoints for development
	if strings.ToLower(os.Getenv("APP_ENV")) != "prod" {
		dashboardHandler := dashboard.NewDashboardHandler(s.postgresDB)
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

	// Protected langportal routes - apply auth middleware
	if authMW != nil {
		s.App.Use("/api/langportal", authMW)
	}

	// Dashboard routes
	dashboardHandler := dashboard.NewDashboardHandler(s.postgresDB)
	s.App.Get("/api/langportal/dashboard/last_study_session", dashboardHandler.GetLastStudySession)
	s.App.Get("/api/langportal/dashboard/study_progress", dashboardHandler.GetStudyProgress)
	s.App.Get("/api/langportal/dashboard/quick-stats", dashboardHandler.GetQuickStats)
	s.App.Get("/api/langportal/dashboard/activity_dates", dashboardHandler.GetActivityDates)
	s.App.Get("/api/langportal/dashboard/recent_activities", dashboardHandler.GetRecentActivities)

	// Study session routes
	studySessionHandler := session.NewStudySessionHandler(s.postgresDB)
	s.App.Get("/api/langportal/study_sessions", studySessionHandler.GetStudySessions)
	s.App.Get("/api/langportal/study_sessions/:id", studySessionHandler.GetStudySession)
	s.App.Get("/api/langportal/study_sessions/:id/words", studySessionHandler.GetStudySessionWords)
	s.App.Post("/api/langportal/study_sessions", studySessionHandler.CreateStudySession)
	s.App.Post("/api/langportal/study_sessions/:id/words/:word_id/review", studySessionHandler.ReviewWord)

	// Kanji routes (new handler structure)
	kanjiStore := repositories.NewKanjiStore(s.postgresDB)
	kanjiHandler := kanji.NewKanjiHandler(kanjiStore)
	s.App.Get("/api/langportal/kanji", kanjiHandler.SearchKanji)
	s.App.Get("/api/langportal/kanji/random", kanjiHandler.GetRandomKanji)

	// Group routes (new handler structure with services)
	groupsStore := repositories.NewGroupsStore(s.postgresDB)
	groupsService := services.NewGroupsService(groupsStore, s.postgresDB)
	groupHandler := group.NewGroupHandler(groupsStore, groupsService)
	s.App.Get("/api/langportal/groups", groupHandler.GetGroups)
	s.App.Post("/api/langportal/groups", groupHandler.CreateGroup)
	s.App.Put("/api/langportal/groups/:id", groupHandler.UpdateGroup)
	s.App.Post("/api/langportal/groups/:id/words", groupHandler.AddWord)
	s.App.Delete("/api/langportal/groups/:id/words/:wordId", groupHandler.RemoveWord)
	s.App.Post("/api/langportal/groups/:id/kanji", groupHandler.AddKanji)
	s.App.Delete("/api/langportal/groups/:id/kanji/:kanjiId", groupHandler.RemoveKanji)

	// User routes (favorite group)
	userHandler, err := user.NewUserHandler(s.postgresDB)
	if err != nil {
		log.Printf("Warning: Failed to initialize user handler with subscription service: %v", err)
		// Create handler without subscription service for development
		userHandler, _ = user.NewUserHandler(s.postgresDB)
	}
	s.App.Get("/api/langportal/users/me", userHandler.GetMe)
	s.App.Put("/api/langportal/users/me/favorite_group", userHandler.SetFavoriteGroup)
	s.App.Get("/api/langportal/users/:id/settings", userHandler.GetUserSettings)
	s.App.Put("/api/langportal/users/:id/settings", userHandler.UpdateUserSettings)

	// Word routes (new handler structure)
	wordsStore := repositories.NewWordsStore(s.postgresDB)
	wordsHandler := words.NewWordsHandler(wordsStore)
	s.App.Get("/api/langportal/words", wordsHandler.GetWords)
	s.App.Get("/api/langportal/words/random", wordsHandler.GetRandomWord)
	s.App.Get("/api/langportal/words/search", wordsHandler.SearchWords)

	// Unified vocabulary search route (server-side merge of kanji+words)
	s.App.Get("/api/langportal/vocabulary/search", contentHandler.SearchContent)

	// Study activity routes
	studyActivityHandler := session.NewStudyActivityHandler(s.postgresDB)
	s.App.Get("/api/langportal/study_activities", studyActivityHandler.GetStudyActivities)
	s.App.Get("/api/langportal/study_activities/:id", studyActivityHandler.GetStudyActivity)
	s.App.Get("/api/langportal/study_activities/:id/sessions", studyActivityHandler.GetStudyActivitySessions)
	s.App.Post("/api/langportal/study_activities", studyActivityHandler.CreateStudyActivity)

	// Speech study routes
	speechHandler := speech.NewSpeechHandler(s.postgresDB)
	s.App.Post("/api/langportal/speech-study/save", speechHandler.SaveSpeechStudySession)

	// Companion study routes
	companionHandler, err := companion.NewCompanionHandler(s.postgresDB)
	if err != nil {
		log.Printf("Warning: Failed to initialize companion handler with Clerk: %v", err)
		// Create handler without Clerk client for development
		companionHandler, _ = companion.NewCompanionHandler(s.postgresDB)
	}
	s.App.Post("/api/langportal/companion-study/save", companionHandler.SaveCompanionStudySession)

	// Subscription routes
	subscriptionHandler, err := subscription.NewSubscriptionHandler(s.postgresDB)
	if err != nil {
		log.Printf("Warning: Failed to initialize subscription handler: %v", err)
	} else {
		s.App.Get("/api/langportal/subscription/usage", subscriptionHandler.GetUsageCount)
		s.App.Get("/api/langportal/subscription/check-limit", subscriptionHandler.CheckCompanionStudyLimit)
	}

	// Flashcard routes
	flashcardHandler := flashcard.NewFlashcardHandler(s.postgresDB)
	s.App.Post("/api/langportal/flashcards/start", flashcardHandler.StartFlashcardSession)
	s.App.Post("/api/langportal/flashcards/submit", flashcardHandler.SubmitFlashcardSession)
	s.App.Get("/api/langportal/flashcards/history", flashcardHandler.GetFlashcardHistory)
	s.App.Get("/api/langportal/flashcards/courses", flashcardHandler.GetAvailableCourses)
	s.App.Get("/api/langportal/flashcards/courses/:courseId/units", flashcardHandler.GetCourseUnits)
	s.App.Get("/api/langportal/flashcards/parts-of-speech", flashcardHandler.GetAvailablePartsOfSpeech)

	// Grammar quiz routes
	grammarHandler := grammar.NewGrammarHandler(s.postgresDB)
	s.App.Post("/api/langportal/grammar/start", grammarHandler.StartGrammarQuiz)
	s.App.Post("/api/langportal/grammar/submit", grammarHandler.SubmitGrammarQuiz)
	s.App.Get("/api/langportal/grammar/history", grammarHandler.GetGrammarQuizHistory)

	// Reading quiz routes
	readingHandler := reading.NewReadingHandler(s.postgresDB)
	s.App.Post("/api/langportal/reading/start", readingHandler.StartReadingQuiz)
	s.App.Post("/api/langportal/reading/submit", readingHandler.SubmitReadingQuiz)
	s.App.Get("/api/langportal/reading/history", readingHandler.GetReadingQuizHistory)

	// Grammar browsing routes
	grammarStore := repositories.NewGrammarStore(s.postgresDB)
	grammarBrowseHandler := grammar.NewGrammarBrowseHandler(grammarStore)
	s.App.Get("/api/langportal/grammar", grammarBrowseHandler.ListGrammarPoints)
	s.App.Get("/api/langportal/grammar/:id", grammarBrowseHandler.GetGrammarPointDetail)
	s.App.Get("/api/langportal/grammar/recent", grammarBrowseHandler.GetRecentGrammarProgress)
	s.App.Post("/api/langportal/grammar/:id/learned", grammarBrowseHandler.MarkGrammarAsLearned)

	// Chat routes
	chatHandler := chat.NewChatHandler(s.postgresDB)
	s.App.Post("/api/langportal/chat/sessions", chatHandler.SaveChatSession)
	s.App.Get("/api/langportal/chat/sessions", chatHandler.GetChatHistory)
	s.App.Post("/api/langportal/chat/sessions/:id/assessment", chatHandler.SaveSkillAssessment)

	// Word Builder routes (reuse existing kanjiStore and wordsStore from above)
	wordBuilderHandler := word_builder.NewWordBuilderHandler(kanjiStore, wordsStore, s.postgresDB)
	s.App.Post("/api/langportal/word-builder/start", wordBuilderHandler.StartSession)
	s.App.Post("/api/langportal/word-builder/refresh", wordBuilderHandler.RefreshKanji)
	s.App.Post("/api/langportal/word-builder/submit", wordBuilderHandler.SubmitResults)

	// Disabled routes during migration
	s.App.All("/api/langportal/kanji/*/compounds", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Functionality disabled during migration"})
	})
	s.App.All("/api/langportal/kanji/validate-compound", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Functionality disabled during migration"})
	})
	s.App.All("/api/langportal/neo4j/*", func(c *fiber.Ctx) error {
		return c.Status(503).JSON(fiber.Map{"error": "Neo4j has been removed"})
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
