package daily_mission

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"lang-portal/internal/database/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

const (
	defaultVariant       = "mission"
	defaultMotivation    = "consistency_small_wins"
	maxTaskTargetValue   = 200
	insightWindowInDays  = 7
	dashboardLabActivity = "dashboard_lab"
)

type activityDefinition struct {
	Title         string `json:"title"`
	Description   string `json:"description"`
	DefaultMode   string `json:"default_target_mode"`
	DefaultTarget int    `json:"default_target_value"`
	StartType     string `json:"start_type"`
	CtaPath       string `json:"cta_path"`
}

var activityCatalog = map[string]activityDefinition{
	"kanji": {
		Title:         "Kanji Practice",
		Description:   "Build recognition and recall with kanji-focused practice.",
		DefaultMode:   "items",
		DefaultTarget: 10,
		StartType:     "kanji",
		CtaPath:       "/study/kanji",
	},
	"vocabulary_review": {
		Title:         "Vocabulary Review",
		Description:   "Reinforce vocabulary through review and retrieval.",
		DefaultMode:   "items",
		DefaultTarget: 20,
		StartType:     "words",
		CtaPath:       "/study/words",
	},
	"speaking_conversation": {
		Title:         "Speaking Conversation",
		Description:   "Practice speaking and conversation for fluency.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "chat",
		CtaPath:       "/study/chat",
	},
	"grammar": {
		Title:         "Grammar",
		Description:   "Practice sentence structure and grammar patterns.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "grammar",
		CtaPath:       "/study/grammar",
	},
	"reading": {
		Title:         "Reading",
		Description:   "Improve comprehension with reading quizzes.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "reading",
		CtaPath:       "/study/reading",
	},
	"word_builder": {
		Title:         "Word Builder",
		Description:   "Form valid words quickly to build kanji fluency.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "word-builder",
		CtaPath:       "/study/word-builder",
	},
	"writing": {
		Title:         "Writing",
		Description:   "Practice writing skills with guided drawing and feedback.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "drawing",
		CtaPath:       "/study/drawing",
	},
	"learning_resources": {
		Title:         "Learning Resources",
		Description:   "Generate a focused study plan to stay intentional.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "agent",
		CtaPath:       "/study/agent",
	},
	"speech": {
		Title:         "Speech Practice",
		Description:   "Use speech activities to strengthen active recall.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "speech",
		CtaPath:       "/study/speech",
	},
	"companion": {
		Title:         "Companion",
		Description:   "Practice real-time voice conversation with AI companion.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "companion-study",
		CtaPath:       "/study/companion-study",
	},
	"chat": {
		Title:         "Sentence Constructor",
		Description:   "Build and refine sentences through guided conversation.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "chat",
		CtaPath:       "/study/chat",
	},
}

var allowedEvents = map[string]struct{}{
	"variant_opened":    {},
	"task_started":      {},
	"task_completed":    {},
	"mission_completed": {},
	"return_next_day":   {},
	"activity_logged":   {},
}

var allowedVariants = map[string]struct{}{
	"mission":   {},
	"planner":   {},
	"analytics": {},
}

type defaultTask struct {
	ActivityKey string
	TargetMode  string
	TargetValue int
	Order       int
}

var balancedTrioDefaults = []defaultTask{
	{ActivityKey: "kanji", TargetMode: "items", TargetValue: 10, Order: 1},
	{ActivityKey: "vocabulary_review", TargetMode: "items", TargetValue: 20, Order: 2},
	{ActivityKey: "speaking_conversation", TargetMode: "sessions", TargetValue: 1, Order: 3},
}

type DailyMissionHandler struct {
	DB *gorm.DB
}

func NewDailyMissionHandler(db *gorm.DB) *DailyMissionHandler {
	return &DailyMissionHandler{DB: db}
}

type missionTaskView struct {
	ID             int64  `json:"id"`
	ActivityKey    string `json:"activity_key"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	TargetMode     string `json:"target_mode"`
	TargetValue    int    `json:"target_value"`
	CurrentValue   int    `json:"current_value"`
	RemainingValue int    `json:"remaining_value"`
	Completed      bool   `json:"completed"`
	StartType      string `json:"start_type"`
	CtaPath        string `json:"cta_path"`
}

type nextActionView struct {
	ActivityKey string `json:"activity_key"`
	Title       string `json:"title"`
	StartType   string `json:"start_type"`
	CtaPath     string `json:"cta_path"`
}

type missionTodayResponse struct {
	Date                  string            `json:"date"`
	Timezone              string            `json:"timezone"`
	ActiveVariant         string            `json:"active_variant"`
	MotivationMode        string            `json:"motivation_mode"`
	TotalTasks            int               `json:"total_tasks"`
	CompletedTasks        int               `json:"completed_tasks"`
	CompletionPercent     int               `json:"completion_percent"`
	StreakDays            int               `json:"streak_days"`
	Tasks                 []missionTaskView `json:"tasks"`
	NextRecommendedAction *nextActionView   `json:"next_recommended_action,omitempty"`
}

type missionConfigResponse struct {
	ActiveVariant       string               `json:"active_variant"`
	MotivationMode      string               `json:"motivation_mode"`
	Tasks               []missionTaskView    `json:"tasks"`
	AvailableActivities []activityOptionView `json:"available_activities"`
}

type activityOptionView struct {
	ActivityKey   string `json:"activity_key"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	DefaultMode   string `json:"default_target_mode"`
	DefaultTarget int    `json:"default_target_value"`
	StartType     string `json:"start_type"`
	CtaPath       string `json:"cta_path"`
}

type updateTaskRequest struct {
	ActivityKey  string `json:"activity_key"`
	TargetMode   string `json:"target_mode"`
	TargetValue  int    `json:"target_value"`
	DisplayOrder int    `json:"display_order"`
	IsActive     *bool  `json:"is_active"`
}

type updateMissionConfigRequest struct {
	ActiveVariant  *string             `json:"active_variant"`
	MotivationMode *string             `json:"motivation_mode"`
	Tasks          []updateTaskRequest `json:"tasks"`
}

type createMissionEventRequest struct {
	ActivityKey string                 `json:"activity_key"`
	EventType   string                 `json:"event_type"`
	Value       *int                   `json:"value"`
	SessionRef  *string                `json:"session_ref"`
	Metadata    map[string]interface{} `json:"metadata"`
	OccurredAt  *time.Time             `json:"occurred_at"`
}

type trendPoint struct {
	Date              string `json:"date"`
	CompletionPercent int    `json:"completion_percent"`
	CompletedTasks    int    `json:"completed_tasks"`
	TotalTasks        int    `json:"total_tasks"`
}

type activityMixPoint struct {
	ActivityKey string `json:"activity_key"`
	Title       string `json:"title"`
	Value       int    `json:"value"`
}

type streakHealth struct {
	CurrentStreakDays int    `json:"current_streak_days"`
	ActiveDaysLast7   int    `json:"active_days_last_7"`
	Status            string `json:"status"`
}

type burnoutRisk struct {
	Level  string `json:"level"`
	Reason string `json:"reason"`
}

type missionInsightsResponse struct {
	Timezone        string             `json:"timezone"`
	RangeDays       int                `json:"range_days"`
	CompletionTrend []trendPoint       `json:"completion_trend"`
	ActivityMix     []activityMixPoint `json:"activity_mix"`
	StreakHealth    streakHealth       `json:"streak_health"`
	BurnoutRisk     burnoutRisk        `json:"burnout_risk"`
}

func (h *DailyMissionHandler) GetToday(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
	}

	if err := h.ensureDefaults(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize daily mission defaults"})
	}

	response, err := h.buildMissionToday(userID, time.Now())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build daily mission"})
	}

	return c.JSON(response)
}

func (h *DailyMissionHandler) GetConfig(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
	}

	if err := h.ensureDefaults(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize daily mission defaults"})
	}

	config, tasks, err := h.loadConfigAndTasks(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load daily mission config"})
	}

	taskViews := make([]missionTaskView, 0, len(tasks))
	for _, task := range tasks {
		def := getActivityDefinition(task.ActivityKey)
		taskViews = append(taskViews, missionTaskView{
			ID:             task.ID,
			ActivityKey:    task.ActivityKey,
			Title:          def.Title,
			Description:    def.Description,
			TargetMode:     task.TargetMode,
			TargetValue:    task.TargetValue,
			CurrentValue:   0,
			RemainingValue: task.TargetValue,
			Completed:      false,
			StartType:      def.StartType,
			CtaPath:        def.CtaPath,
		})
	}

	return c.JSON(missionConfigResponse{
		ActiveVariant:       config.ActiveVariant,
		MotivationMode:      config.MotivationMode,
		Tasks:               taskViews,
		AvailableActivities: listAvailableActivities(),
	})
}

func (h *DailyMissionHandler) UpdateConfig(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
	}

	if err := h.ensureDefaults(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize daily mission defaults"})
	}

	var req updateMissionConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	err = h.DB.Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{}
		if req.ActiveVariant != nil {
			v := normalizeVariant(*req.ActiveVariant)
			if _, ok := allowedVariants[v]; !ok {
				return fiber.NewError(fiber.StatusBadRequest, "Invalid active_variant")
			}
			updates["active_variant"] = v
		}
		if req.MotivationMode != nil {
			m := strings.TrimSpace(*req.MotivationMode)
			if m == "" {
				return fiber.NewError(fiber.StatusBadRequest, "motivation_mode cannot be empty")
			}
			updates["motivation_mode"] = m
		}
		if len(updates) > 0 {
			updates["updated_at"] = time.Now()
			if err := tx.Model(&models.DailyMissionConfig{}).Where("user_id = ?", userID).Updates(updates).Error; err != nil {
				return err
			}
		}

		for _, task := range req.Tasks {
			if _, ok := activityCatalog[task.ActivityKey]; !ok {
				return fiber.NewError(fiber.StatusBadRequest, fmt.Sprintf("Invalid activity_key: %s", task.ActivityKey))
			}

			mode := normalizeMode(task.TargetMode)
			if mode != "sessions" && mode != "items" {
				return fiber.NewError(fiber.StatusBadRequest, "Invalid target_mode")
			}

			targetValue := task.TargetValue
			if targetValue == 0 {
				targetValue = activityCatalog[task.ActivityKey].DefaultTarget
			}
			if targetValue < 1 || targetValue > maxTaskTargetValue {
				return fiber.NewError(fiber.StatusBadRequest, "target_value must be between 1 and 200")
			}

			isActive := true
			if task.IsActive != nil {
				isActive = *task.IsActive
			}

			now := time.Now()
			upsert := models.DailyMissionTask{
				UserID:       userID,
				ActivityKey:  task.ActivityKey,
				TargetMode:   mode,
				TargetValue:  targetValue,
				DisplayOrder: task.DisplayOrder,
				IsActive:     isActive,
				UpdatedAt:    now,
			}
			if err := tx.
				Where("user_id = ? AND activity_key = ?", userID, task.ActivityKey).
				Assign(upsert).
				FirstOrCreate(&upsert).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		var fe *fiber.Error
		if errors.As(err, &fe) {
			return c.Status(fe.Code).JSON(fiber.Map{"error": fe.Message})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update daily mission config"})
	}

	config, tasks, err := h.loadConfigAndTasks(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load updated daily mission config"})
	}

	taskViews := make([]missionTaskView, 0, len(tasks))
	for _, task := range tasks {
		def := getActivityDefinition(task.ActivityKey)
		taskViews = append(taskViews, missionTaskView{
			ID:             task.ID,
			ActivityKey:    task.ActivityKey,
			Title:          def.Title,
			Description:    def.Description,
			TargetMode:     task.TargetMode,
			TargetValue:    task.TargetValue,
			CurrentValue:   0,
			RemainingValue: task.TargetValue,
			Completed:      false,
			StartType:      def.StartType,
			CtaPath:        def.CtaPath,
		})
	}

	return c.JSON(missionConfigResponse{
		ActiveVariant:       config.ActiveVariant,
		MotivationMode:      config.MotivationMode,
		Tasks:               taskViews,
		AvailableActivities: listAvailableActivities(),
	})
}

func (h *DailyMissionHandler) CreateEvent(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
	}

	var req createMissionEventRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.ActivityKey = strings.TrimSpace(req.ActivityKey)
	req.EventType = strings.TrimSpace(req.EventType)

	if req.ActivityKey == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "activity_key is required"})
	}
	if req.ActivityKey != dashboardLabActivity {
		if _, ok := activityCatalog[req.ActivityKey]; !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid activity_key"})
		}
	}
	if _, ok := allowedEvents[req.EventType]; !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid event_type"})
	}

	value := 1
	if req.Value != nil {
		value = *req.Value
	}
	if value < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "value must be >= 0"})
	}

	metadata := toJSONB(req.Metadata)

	event := models.DailyMissionEvent{
		UserID:      userID,
		ActivityKey: req.ActivityKey,
		EventType:   req.EventType,
		Value:       value,
		SessionRef:  req.SessionRef,
		Metadata:    metadata,
		OccurredAt:  time.Now(),
	}
	if req.OccurredAt != nil {
		event.OccurredAt = *req.OccurredAt
	}

	if err := h.DB.Create(&event).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save event"})
	}

	return c.Status(fiber.StatusCreated).JSON(event)
}

func (h *DailyMissionHandler) GetInsights(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
	}

	if err := h.ensureDefaults(userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize daily mission defaults"})
	}

	_, tasks, err := h.loadConfigAndTasks(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to load daily mission config"})
	}

	timezone := h.getUserTimezone(userID)
	loc := loadLocationOrUTC(timezone)
	nowLocal := time.Now().In(loc)

	trend := make([]trendPoint, 0, insightWindowInDays)
	activeDays := 0
	mixMap := map[string]int{}

	for i := insightWindowInDays - 1; i >= 0; i-- {
		day := nowLocal.AddDate(0, 0, -i)
		startUTC, endUTC, dayLabel := dayBoundsInLocation(day, loc)

		taskViews, completedTasks, totalTasks, err := h.buildTaskViewsForRange(userID, tasks, startUTC, endUTC)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build insight trend"})
		}

		anyProgress := false
		for _, tv := range taskViews {
			if tv.CurrentValue > 0 {
				anyProgress = true
				mixMap[tv.ActivityKey] += tv.CurrentValue
			}
		}
		if anyProgress {
			activeDays++
		}

		completionPercent := 0
		if totalTasks > 0 {
			completionPercent = int(float64(completedTasks) / float64(totalTasks) * 100)
		}
		trend = append(trend, trendPoint{
			Date:              dayLabel,
			CompletionPercent: completionPercent,
			CompletedTasks:    completedTasks,
			TotalTasks:        totalTasks,
		})
	}

	activityMix := make([]activityMixPoint, 0, len(mixMap))
	for activityKey, value := range mixMap {
		if value <= 0 {
			continue
		}
		def := getActivityDefinition(activityKey)
		activityMix = append(activityMix, activityMixPoint{
			ActivityKey: activityKey,
			Title:       def.Title,
			Value:       value,
		})
	}
	sort.Slice(activityMix, func(i, j int) bool {
		return activityMix[i].Value > activityMix[j].Value
	})

	streakDays, err := h.getStreakDays(userID, timezone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to calculate streak"})
	}

	todayStartUTC, todayEndUTC, _ := dayBoundsInLocation(nowLocal, loc)
	todayTaskViews, _, _, err := h.buildTaskViewsForRange(userID, tasks, todayStartUTC, todayEndUTC)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to calculate today intensity"})
	}
	todayIntensity := 0
	for _, tv := range todayTaskViews {
		todayIntensity += tv.CurrentValue
	}

	risk := burnoutRisk{
		Level:  "low",
		Reason: "Current workload looks sustainable for consistency.",
	}
	if todayIntensity >= 40 {
		risk = burnoutRisk{
			Level:  "high",
			Reason: "Today's load is high. Consider reducing target intensity to protect consistency.",
		}
	} else if todayIntensity >= 20 {
		risk = burnoutRisk{
			Level:  "medium",
			Reason: "Today's load is moderate. Keep sessions focused and short.",
		}
	}

	streakStatus := "new"
	if streakDays >= 7 {
		streakStatus = "strong"
	} else if streakDays >= 3 {
		streakStatus = "building"
	}

	return c.JSON(missionInsightsResponse{
		Timezone:        timezone,
		RangeDays:       insightWindowInDays,
		CompletionTrend: trend,
		ActivityMix:     activityMix,
		StreakHealth: streakHealth{
			CurrentStreakDays: streakDays,
			ActiveDaysLast7:   activeDays,
			Status:            streakStatus,
		},
		BurnoutRisk: risk,
	})
}

func (h *DailyMissionHandler) ensureDefaults(userID int64) error {
	return h.DB.Transaction(func(tx *gorm.DB) error {
		cfg := models.DailyMissionConfig{
			UserID:         userID,
			ActiveVariant:  defaultVariant,
			MotivationMode: defaultMotivation,
		}
		if err := tx.Where("user_id = ?", userID).FirstOrCreate(&cfg).Error; err != nil {
			return err
		}

		var count int64
		if err := tx.Model(&models.DailyMissionTask{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}

		now := time.Now()
		defaults := make([]models.DailyMissionTask, 0, len(balancedTrioDefaults))
		for _, d := range balancedTrioDefaults {
			defaults = append(defaults, models.DailyMissionTask{
				UserID:       userID,
				ActivityKey:  d.ActivityKey,
				TargetMode:   d.TargetMode,
				TargetValue:  d.TargetValue,
				DisplayOrder: d.Order,
				IsActive:     true,
				CreatedAt:    now,
				UpdatedAt:    now,
			})
		}
		return tx.Create(&defaults).Error
	})
}

func (h *DailyMissionHandler) loadConfigAndTasks(userID int64) (*models.DailyMissionConfig, []models.DailyMissionTask, error) {
	var config models.DailyMissionConfig
	if err := h.DB.Where("user_id = ?", userID).First(&config).Error; err != nil {
		return nil, nil, err
	}

	var tasks []models.DailyMissionTask
	if err := h.DB.Where("user_id = ? AND is_active = TRUE", userID).Order("display_order ASC, id ASC").Find(&tasks).Error; err != nil {
		return nil, nil, err
	}

	return &config, tasks, nil
}

func (h *DailyMissionHandler) buildMissionToday(userID int64, at time.Time) (*missionTodayResponse, error) {
	config, tasks, err := h.loadConfigAndTasks(userID)
	if err != nil {
		return nil, err
	}

	timezone := h.getUserTimezone(userID)
	loc := loadLocationOrUTC(timezone)
	startUTC, endUTC, dateLabel := dayBoundsInLocation(at.In(loc), loc)

	taskViews, completedTasks, totalTasks, err := h.buildTaskViewsForRange(userID, tasks, startUTC, endUTC)
	if err != nil {
		return nil, err
	}

	var nextAction *nextActionView
	for _, task := range taskViews {
		if !task.Completed {
			nextAction = &nextActionView{
				ActivityKey: task.ActivityKey,
				Title:       task.Title,
				StartType:   task.StartType,
				CtaPath:     task.CtaPath,
			}
			break
		}
	}

	completionPercent := 0
	if totalTasks > 0 {
		completionPercent = int(float64(completedTasks) / float64(totalTasks) * 100)
	}

	streakDays, err := h.getStreakDays(userID, timezone)
	if err != nil {
		return nil, err
	}

	return &missionTodayResponse{
		Date:                  dateLabel,
		Timezone:              timezone,
		ActiveVariant:         config.ActiveVariant,
		MotivationMode:        config.MotivationMode,
		TotalTasks:            totalTasks,
		CompletedTasks:        completedTasks,
		CompletionPercent:     completionPercent,
		StreakDays:            streakDays,
		Tasks:                 taskViews,
		NextRecommendedAction: nextAction,
	}, nil
}

func (h *DailyMissionHandler) buildTaskViewsForRange(userID int64, tasks []models.DailyMissionTask, startUTC, endUTC time.Time) ([]missionTaskView, int, int, error) {
	taskViews := make([]missionTaskView, 0, len(tasks))
	completedTasks := 0

	for _, task := range tasks {
		current, err := h.getTaskCurrentValue(userID, task, startUTC, endUTC)
		if err != nil {
			return nil, 0, 0, err
		}

		completed := current >= task.TargetValue
		if completed {
			completedTasks++
		}

		remaining := task.TargetValue - current
		if remaining < 0 {
			remaining = 0
		}

		def := getActivityDefinition(task.ActivityKey)
		taskViews = append(taskViews, missionTaskView{
			ID:             task.ID,
			ActivityKey:    task.ActivityKey,
			Title:          def.Title,
			Description:    def.Description,
			TargetMode:     task.TargetMode,
			TargetValue:    task.TargetValue,
			CurrentValue:   current,
			RemainingValue: remaining,
			Completed:      completed,
			StartType:      def.StartType,
			CtaPath:        def.CtaPath,
		})
	}

	return taskViews, completedTasks, len(tasks), nil
}

func (h *DailyMissionHandler) getTaskCurrentValue(userID int64, task models.DailyMissionTask, startUTC, endUTC time.Time) (int, error) {
	sessions, items, err := h.getAutomaticProgress(userID, task.ActivityKey, startUTC, endUTC)
	if err != nil {
		return 0, err
	}

	eventContribution, err := h.getEventContribution(userID, task.ActivityKey, task.TargetMode, startUTC, endUTC)
	if err != nil {
		return 0, err
	}

	if task.TargetMode == "items" {
		return items + eventContribution, nil
	}
	return sessions + eventContribution, nil
}

func (h *DailyMissionHandler) getAutomaticProgress(userID int64, activityKey string, startUTC, endUTC time.Time) (int, int, error) {
	switch activityKey {
	case "kanji":
		return h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type = 'kanji_study'")
	case "vocabulary_review":
		return h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type = 'vocabulary_review' AND notes::text LIKE '%flashcard_config%' AND notes::text NOT LIKE '%grammar_config%' AND notes::text NOT LIKE '%reading_config%'")
	case "grammar":
		return h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type = 'vocabulary_review' AND notes::text LIKE '%grammar_config%'")
	case "reading":
		return h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type = 'vocabulary_review' AND notes::text LIKE '%reading_config%'")
	case "speech":
		return h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type IN ('speech', 'mixed') AND notes::text LIKE '%recording_duration_seconds%'")
	case "companion":
		return h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type = 'speech' AND notes::text LIKE '%assistant_id%'")
	case "chat":
		sessions, err := h.queryChatSessionCount(userID, startUTC, endUTC)
		return sessions, sessions, err
	case "speaking_conversation":
		chatSessions, err := h.queryChatSessionCount(userID, startUTC, endUTC)
		if err != nil {
			return 0, 0, err
		}
		companionSessions, _, err := h.queryEnhancedSessionStats(userID, startUTC, endUTC, "session_type = 'speech'")
		if err != nil {
			return 0, 0, err
		}
		total := chatSessions + companionSessions
		return total, total, nil
	case "word_builder":
		return h.queryLearningActivityStats(userID, startUTC, endUTC, "activity_type = 'word_builder'")
	case "writing", "learning_resources":
		return 0, 0, nil
	default:
		return 0, 0, nil
	}
}

func (h *DailyMissionHandler) queryEnhancedSessionStats(userID int64, startUTC, endUTC time.Time, whereClause string) (int, int, error) {
	var result struct {
		Sessions int64 `gorm:"column:sessions"`
		Items    int64 `gorm:"column:items"`
	}

	query := `
		SELECT
			COUNT(*)::BIGINT AS sessions,
			COALESCE(SUM(COALESCE(total_correct, 0) + COALESCE(total_incorrect, 0)), 0)::BIGINT AS items
		FROM enhanced_study_sessions
		WHERE user_id = ?
		  AND ended_at IS NOT NULL
		  AND started_at >= ?
		  AND started_at < ?
	`
	if strings.TrimSpace(whereClause) != "" {
		query += " AND " + whereClause
	}
	if err := h.DB.Raw(query, userID, startUTC, endUTC).Scan(&result).Error; err != nil {
		return 0, 0, err
	}

	return int(result.Sessions), int(result.Items), nil
}

func (h *DailyMissionHandler) queryLearningActivityStats(userID int64, startUTC, endUTC time.Time, whereClause string) (int, int, error) {
	var result struct {
		Sessions int64 `gorm:"column:sessions"`
		Items    int64 `gorm:"column:items"`
	}

	query := `
		SELECT
			COUNT(*)::BIGINT AS sessions,
			COALESCE(SUM(COALESCE(item_count, 0)), 0)::BIGINT AS items
		FROM learning_activities
		WHERE user_id = ?
		  AND completed_at IS NOT NULL
		  AND started_at >= ?
		  AND started_at < ?
	`
	if strings.TrimSpace(whereClause) != "" {
		query += " AND " + whereClause
	}
	if err := h.DB.Raw(query, userID, startUTC, endUTC).Scan(&result).Error; err != nil {
		return 0, 0, err
	}

	return int(result.Sessions), int(result.Items), nil
}

func (h *DailyMissionHandler) queryChatSessionCount(userID int64, startUTC, endUTC time.Time) (int, error) {
	var sessions int64
	err := h.DB.Table("chat_sessions").
		Where("user_id = ?", userID).
		Where("COALESCE(started_at, created_at) >= ? AND COALESCE(started_at, created_at) < ?", startUTC, endUTC).
		Count(&sessions).Error
	if err != nil {
		return 0, err
	}
	return int(sessions), nil
}

func (h *DailyMissionHandler) getEventContribution(userID int64, activityKey, targetMode string, startUTC, endUTC time.Time) (int, error) {
	if targetMode == "items" {
		var total int64
		err := h.DB.Table("daily_mission_events").
			Where("user_id = ? AND activity_key = ?", userID, activityKey).
			Where("event_type IN ?", []string{"activity_logged", "task_completed"}).
			Where("occurred_at >= ? AND occurred_at < ?", startUTC, endUTC).
			Select("COALESCE(SUM(CASE WHEN event_type = 'task_completed' THEN GREATEST(value, 1) ELSE GREATEST(value, 0) END), 0)").
			Scan(&total).Error
		return int(total), err
	}

	var count int64
	err := h.DB.Table("daily_mission_events").
		Where("user_id = ? AND activity_key = ?", userID, activityKey).
		Where("event_type IN ?", []string{"activity_logged", "task_completed"}).
		Where("occurred_at >= ? AND occurred_at < ?", startUTC, endUTC).
		Count(&count).Error
	return int(count), err
}

func (h *DailyMissionHandler) getStreakDays(userID int64, timezone string) (int, error) {
	type row struct {
		ActivityDate string `gorm:"column:activity_date"`
	}
	var dates []row

	if err := h.DB.Raw(`
		SELECT TO_CHAR(activity_date, 'YYYY-MM-DD') AS activity_date FROM (
			SELECT DATE(started_at AT TIME ZONE ?) AS activity_date FROM enhanced_study_sessions WHERE user_id = ? AND ended_at IS NOT NULL
			UNION
			SELECT DATE(started_at AT TIME ZONE ?) AS activity_date FROM learning_activities WHERE user_id = ? AND completed_at IS NOT NULL
			UNION
			SELECT DATE(COALESCE(started_at, created_at) AT TIME ZONE ?) AS activity_date FROM chat_sessions WHERE user_id = ?
			UNION
			SELECT DATE(last_seen AT TIME ZONE ?) AS activity_date FROM progress WHERE user_id = ? AND last_seen IS NOT NULL
			UNION
			SELECT DATE(occurred_at AT TIME ZONE ?) AS activity_date FROM daily_mission_events
			WHERE user_id = ? AND event_type IN ('activity_logged', 'task_completed', 'mission_completed')
		) all_activity
		GROUP BY activity_date
		ORDER BY activity_date DESC
	`, timezone, userID, timezone, userID, timezone, userID, timezone, userID, timezone, userID).Scan(&dates).Error; err != nil {
		return 0, err
	}

	if len(dates) == 0 {
		return 0, nil
	}

	loc := loadLocationOrUTC(timezone)
	nowLocal := time.Now().In(loc)
	today := time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 0, 0, 0, 0, loc)
	yesterday := today.AddDate(0, 0, -1)

	activityMap := map[string]bool{}
	for _, d := range dates {
		activityMap[d.ActivityDate] = true
	}

	startDate := time.Time{}
	if activityMap[today.Format("2006-01-02")] {
		startDate = today
	} else if activityMap[yesterday.Format("2006-01-02")] {
		startDate = yesterday
	} else {
		return 0, nil
	}

	streak := 0
	for current := startDate; ; current = current.AddDate(0, 0, -1) {
		if !activityMap[current.Format("2006-01-02")] {
			break
		}
		streak++
	}

	return streak, nil
}

func (h *DailyMissionHandler) getUserTimezone(userID int64) string {
	var timezone string
	if err := h.DB.Table("user_settings").Select("timezone").Where("user_id = ?", userID).Scan(&timezone).Error; err != nil {
		return "UTC"
	}
	timezone = strings.TrimSpace(timezone)
	if timezone == "" {
		return "UTC"
	}
	return timezone
}

func getActivityDefinition(activityKey string) activityDefinition {
	if d, ok := activityCatalog[activityKey]; ok {
		return d
	}
	return activityDefinition{
		Title:         "Study",
		Description:   "Continue your study habit.",
		DefaultMode:   "sessions",
		DefaultTarget: 1,
		StartType:     "words",
		CtaPath:       "/study",
	}
}

func listAvailableActivities() []activityOptionView {
	keys := make([]string, 0, len(activityCatalog))
	for key := range activityCatalog {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	options := make([]activityOptionView, 0, len(keys))
	for _, key := range keys {
		def := activityCatalog[key]
		options = append(options, activityOptionView{
			ActivityKey:   key,
			Title:         def.Title,
			Description:   def.Description,
			DefaultMode:   def.DefaultMode,
			DefaultTarget: def.DefaultTarget,
			StartType:     def.StartType,
			CtaPath:       def.CtaPath,
		})
	}
	return options
}

func getUserID(c *fiber.Ctx) (int64, error) {
	userID, ok := c.Locals("user_id").(int64)
	if !ok || userID == 0 {
		return 0, errors.New("user not authenticated")
	}
	return userID, nil
}

func normalizeVariant(v string) string {
	return strings.ToLower(strings.TrimSpace(v))
}

func normalizeMode(mode string) string {
	mode = strings.ToLower(strings.TrimSpace(mode))
	if mode == "" {
		return "sessions"
	}
	return mode
}

func loadLocationOrUTC(timezone string) *time.Location {
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.UTC
	}
	return loc
}

func dayBoundsInLocation(localTime time.Time, loc *time.Location) (time.Time, time.Time, string) {
	startLocal := time.Date(localTime.Year(), localTime.Month(), localTime.Day(), 0, 0, 0, 0, loc)
	endLocal := startLocal.Add(24 * time.Hour)
	return startLocal.UTC(), endLocal.UTC(), startLocal.Format("2006-01-02")
}

func toJSONB(data map[string]interface{}) models.JSONB {
	if data == nil {
		return models.JSONB{Data: map[string]interface{}{}}
	}
	// Normalize by round-tripping through JSON so map values are safe for DB encoding.
	raw, err := json.Marshal(data)
	if err != nil {
		return models.JSONB{Data: map[string]interface{}{}}
	}
	var out map[string]interface{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return models.JSONB{Data: map[string]interface{}{}}
	}
	return models.JSONB{Data: out}
}
