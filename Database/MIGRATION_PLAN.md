# Database Migration Plan: Simplified Activity-Based Tracking

## Overview
This migration replaces the complex session tracking system with a simplified activity-based approach that:
- Tracks individual learning activities across all content types
- Provides automatic progression based on mastery
- Tracks time spent by activity type
- Integrates with existing SRS system
- Supports future activity types without schema changes

## Phase 1: Database Schema Changes

### 1.1 Create New Tables

#### `learning_activities` Table
```sql
CREATE TABLE learning_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

    -- Activity classification
    activity_type TEXT NOT NULL,     -- 'flashcards', 'srs_review', 'jlpt_practice', 'kanji_study', 'grammar_study'
    content_type TEXT NOT NULL,      -- 'word', 'kanji', 'grammar', 'jlpt_question'

    -- Content scope
    jlpt_level INT,                  -- For JLPT-focused activities
    course_id INT,                   -- For course-based activities
    unit_id INT,                     -- For unit-based activities
    item_ids BIGINT[],               -- Array of specific item IDs practiced

    -- Performance metrics
    item_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    total_time_seconds INT NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Metadata
    config JSONB,                    -- Activity-specific configuration
    device_type TEXT,
    location TEXT
);
```

#### Indexes for Performance
```sql
CREATE INDEX idx_learning_activities_user ON learning_activities(user_id);
CREATE INDEX idx_learning_activities_type ON learning_activities(activity_type, content_type);
CREATE INDEX idx_learning_activities_time ON learning_activities(started_at, completed_at);
CREATE INDEX idx_learning_activities_scope ON learning_activities(course_id, unit_id, jlpt_level);
```

### 1.2 Create New Functions

#### Automatic Progression Functions
```sql
-- Check if user mastered a course/unit
CREATE OR REPLACE FUNCTION check_course_mastery(p_user_id BIGINT, p_course_id INT DEFAULT NULL, p_unit_id INT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    total_items INT := 0;
    mastered_items INT := 0;
BEGIN
    -- Count total items in scope
    SELECT COUNT(*) INTO total_items
    FROM unit_items ui
    WHERE (p_unit_id IS NOT NULL AND ui.unit_id = p_unit_id)
       OR (p_course_id IS NOT NULL AND ui.unit_id IN (SELECT id FROM units WHERE course_id = p_course_id));

    -- Count mastered items (SRS correct_cnt >= 3)
    SELECT COUNT(*) INTO mastered_items
    FROM unit_items ui
    JOIN progress p ON p.item_type = ui.item_type AND p.item_id = ui.item_id
    WHERE p.user_id = p_user_id AND p.correct_cnt >= 3
      AND ((p_unit_id IS NOT NULL AND ui.unit_id = p_unit_id)
        OR (p_course_id IS NOT NULL AND ui.unit_id IN (SELECT id FROM units WHERE course_id = p_course_id)));

    RETURN mastered_items >= total_items AND total_items > 0;
END;
$$ LANGUAGE plpgsql;

-- Auto-advance JLPT level based on recent performance
CREATE OR REPLACE FUNCTION check_jlpt_level_advancement(p_user_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    current_level INT;
    recent_activities INT;
    avg_accuracy NUMERIC;
BEGIN
    -- Get current level
    SELECT current_jlpt_level INTO current_level
    FROM user_settings WHERE user_id = p_user_id;

    -- Check recent JLPT activities (last 30 days)
    SELECT
        COUNT(*),
        AVG(correct_count::NUMERIC / NULLIF(item_count, 0)) * 100
    INTO recent_activities, avg_accuracy
    FROM learning_activities
    WHERE user_id = p_user_id
      AND activity_type = 'jlpt_practice'
      AND started_at >= NOW() - INTERVAL '30 days';

    -- Advance if they have good recent performance and current level < 5
    IF recent_activities >= 5 AND avg_accuracy >= 70 AND current_level < 5 THEN
        UPDATE user_settings
        SET current_jlpt_level = current_level + 1,
            jlpt_level_assessed_at = NOW()
        WHERE user_id = p_user_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

#### Analytics Functions
```sql
-- Get user's study time breakdown
CREATE OR REPLACE FUNCTION get_user_study_analytics(
    p_user_id BIGINT,
    p_days INT DEFAULT 30
) RETURNS TABLE (
    activity_type TEXT,
    content_type TEXT,
    total_sessions INT,
    total_time_minutes INT,
    total_items INT,
    avg_accuracy NUMERIC,
    last_activity TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        la.activity_type,
        la.content_type,
        COUNT(*)::INT as total_sessions,
        SUM(la.total_time_seconds / 60)::INT as total_time_minutes,
        SUM(la.item_count)::INT as total_items,
        ROUND(AVG(la.correct_count::NUMERIC / NULLIF(la.item_count, 0)) * 100, 1) as avg_accuracy,
        MAX(la.completed_at) as last_activity
    FROM learning_activities la
    WHERE la.user_id = p_user_id
      AND la.completed_at >= NOW() - INTERVAL '1 day' * p_days
      AND la.completed_at IS NOT NULL
    GROUP BY la.activity_type, la.content_type
    ORDER BY total_time_minutes DESC;
END;
$$ LANGUAGE plpgsql;

-- Get daily study streaks
CREATE OR REPLACE FUNCTION get_study_streak(p_user_id BIGINT)
RETURNS INT AS $$
DECLARE
    streak_days INT := 0;
    check_date DATE := CURRENT_DATE;
BEGIN
    WHILE EXISTS (
        SELECT 1 FROM learning_activities
        WHERE user_id = p_user_id
          AND DATE(completed_at) = check_date
          AND total_time_seconds >= 300  -- At least 5 minutes
    ) LOOP
        streak_days := streak_days + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;

    RETURN streak_days;
END;
$$ LANGUAGE plpgsql;
```

### 1.3 Data Migration Scripts

#### Migrate Enhanced Study Sessions
```sql
-- Migrate completed flashcard sessions
INSERT INTO learning_activities (
    user_id, activity_type, content_type,
    item_count, correct_count, total_time_seconds,
    started_at, completed_at, config
)
SELECT
    user_id,
    CASE session_type
        WHEN 'vocabulary_review' THEN 'flashcards'
        WHEN 'kanji_study' THEN 'kanji_study'
        ELSE 'unknown'
    END,
    CASE session_type
        WHEN 'vocabulary_review' THEN 'word'
        WHEN 'kanji_study' THEN 'kanji'
        ELSE 'unknown'
    END,
    COALESCE(total_items, 0),
    COALESCE(total_correct, 0),
    EXTRACT(EPOCH FROM (COALESCE(ended_at, started_at) - started_at))::INT,
    started_at,
    ended_at,
    notes::JSONB
FROM enhanced_study_sessions
WHERE ended_at IS NOT NULL;
```

#### Migrate JLPT Attempts to Activities
```sql
-- Group JLPT attempts into activity sessions
INSERT INTO learning_activities (
    user_id, activity_type, content_type,
    jlpt_level, item_count, correct_count, total_time_seconds,
    started_at, completed_at
)
SELECT
    user_id,
    'jlpt_practice',
    'jlpt_question',
    q.jlpt,
    COUNT(*)::INT,
    SUM(CASE WHEN ja.is_correct THEN 1 ELSE 0 END)::INT,
    SUM(COALESCE(ja.time_spent_seconds, 30))::INT,
    MIN(ja.completed_at),
    MAX(ja.completed_at)
FROM jlpt_question_attempts ja
JOIN jlpt_questions q ON ja.question_id = q.id
WHERE ja.completed_at IS NOT NULL
GROUP BY user_id, q.jlpt, DATE(ja.completed_at);
```

### 1.4 Tables to Drop (After Migration)
```sql
-- Drop old session tables (after data migration)
DROP TABLE IF EXISTS enhanced_study_sessions;
DROP TABLE IF EXISTS study_sessions;
DROP TABLE IF EXISTS review_items;

-- Remove redundant word.correct_count (use SRS progress instead)
ALTER TABLE words DROP COLUMN IF EXISTS correct_count;
```

## Phase 2: Backend Code Changes

### 2.1 Update FlashcardHandler

#### Replace createFlashcardSession
```go
// OLD: createFlashcardSession creates session in enhanced_study_sessions
func (h *FlashcardHandler) createFlashcardSession(session *FlashcardSession, seed int64) (int64, error)

// NEW: recordLearningActivity creates activity in learning_activities
func (h *FlashcardHandler) recordLearningActivity(userID int64, activityType, contentType string, config FlashcardConfig, itemCount int) (int64, error)
```

#### Replace endFlashcardSession
```go
// OLD: endFlashcardSession updates enhanced_study_sessions
func (h *FlashcardHandler) endFlashcardSession(sessionID int64, result *FlashcardResult) error

// NEW: completeLearningActivity updates learning_activities
func (h *FlashcardHandler) completeLearningActivity(activityID int64, correctCount, totalTimeSeconds int) error
```

#### Update SubmitFlashcardSession
```go
func (h *FlashcardHandler) SubmitFlashcardSession(c *fiber.Ctx) error {
    // ... existing validation ...

    // OLD: Get session from enhanced_study_sessions
    session, err := h.getFlashcardSession(submission.SessionID, userID)

    // NEW: Get activity from learning_activities
    activity, err := h.getLearningActivity(submission.SessionID, userID)

    // ... calculate results ...

    // Update SRS progress (unchanged)
    err = h.updateSRSProgress(userID, result)

    // NEW: Complete the activity
    err = h.completeLearningActivity(submission.SessionID, len(results), totalTimeSeconds)

    // NEW: Check for automatic progression
    if activity.ContentSource == ContentSourceUnit && activity.CourseID != nil {
        h.db.Raw("SELECT check_course_mastery(?, ?)", userID, *activity.CourseID)
    }
    if activity.ContentSource == ContentSourceJLPT {
        h.db.Raw("SELECT check_jlpt_level_advancement(?)", userID)
    }

    // ... return results ...
}
```

### 2.2 Update Dashboard Handlers

#### Replace LastStudySession with LearningActivity
```go
// OLD: LastStudySession struct
type LastStudySession struct {
    ID              int64     `json:"id"`
    ActivityID      int64     `json:"activity_id"`
    CreatedAt       time.Time `json:"created_at"`
    CompletedAt     *time.Time `json:"completed_at"`
    TotalItems      int64     `json:"total_items"`
    CorrectAnswers  int64     `json:"correct_answers"`
}

// NEW: LastLearningActivity struct
type LastLearningActivity struct {
    ID              int64     `json:"id"`
    ActivityType    string   `json:"activity_type"`
    ContentType     string   `json:"content_type"`
    StartedAt       time.Time `json:"started_at"`
    CompletedAt     *time.Time `json:"completed_at"`
    ItemCount       int       `json:"item_count"`
    CorrectCount    int       `json:"correct_count"`
    TotalTimeSeconds int      `json:"total_time_seconds"`
}
```

#### Update GetLastStudySession
```go
func (h *DashboardHandler) GetLastStudySession(c *fiber.Ctx) error {
    // OLD: Query study_sessions
    result := h.DB.GetDB().Table("study_sessions").Select(...)

    // NEW: Query learning_activities
    result := h.DB.GetDB().Table("learning_activities").
        Select("id, activity_type, content_type, started_at, completed_at, item_count, correct_count, total_time_seconds").
        Where("user_id = ? AND completed_at IS NOT NULL", userID).
        Order("completed_at DESC").
        Limit(1).
        Scan(&activity)
}
```

### 2.3 Update Study Session Handlers

#### Remove/Migrate StudySession CRUD
- Remove `GetGroupStudySessions` (not needed with activity-based tracking)
- Update any remaining study session references to use learning_activities

## Phase 3: Frontend Changes

### 3.1 Update Dashboard Components

#### Replace Session History with Activity History
```typescript
// OLD: StudySession type
interface StudySession {
  id: string;
  type: 'quiz' | 'flashcards' | 'free' | 'speech';
  name: string;
  description: string;
  created_at: string;
  completed_at?: string;
  progress: number;
}

// NEW: LearningActivity type
interface LearningActivity {
  id: number;
  activity_type: string;    // 'flashcards', 'jlpt_practice', etc.
  content_type: string;     // 'word', 'kanji', etc.
  started_at: string;
  completed_at?: string;
  item_count: number;
  correct_count: number;
  total_time_seconds: number;
}
```

#### Update Analytics Displays
```typescript
// OLD: Session-based analytics
const sessionStats = {
  total_sessions: 150,
  avg_accuracy: 85,
  study_streak: 7
}

// NEW: Activity-based analytics
const activityStats = {
  total_activities: 150,
  time_by_activity: {
    flashcards: 120,    // minutes
    jlpt_practice: 90,
    srs_review: 60
  },
  avg_accuracy: 85,
  study_streak: 7
}
```

### 3.2 Update API Calls

#### Replace Study Session APIs
```typescript
// Remove these API calls:
// - studySessionApi.getStudySessions()
// - studySessionApi.getStudySession()
// - studySessionApi.createStudySession()

// Add new activity APIs:
export const learningActivityApi = {
  getActivities: (page: number = 1, pageSize: number = 20) =>
    fetchData<{ items: LearningActivity[], total: number }>(
      `/api/learning-activities?page=${page}&pageSize=${pageSize}`
    ),

  getAnalytics: (days: number = 30) =>
    fetchData<ActivityAnalytics>(`/api/learning-activities/analytics?days=${days}`)
}
```

## Phase 4: Testing & Validation

### 4.1 Database Tests
```sql
-- Verify data migration
SELECT
    activity_type,
    content_type,
    COUNT(*) as activities,
    SUM(total_time_seconds)/60 as total_minutes,
    AVG(correct_count::numeric / item_count) * 100 as avg_accuracy
FROM learning_activities
GROUP BY activity_type, content_type;

-- Test progression functions
SELECT check_course_mastery(1, 1);  -- Test course mastery
SELECT check_jlpt_level_advancement(1);  -- Test JLPT advancement
SELECT * FROM get_user_study_analytics(1, 7);  -- Test analytics
```

### 4.2 Backend Tests
- Test flashcard submission creates learning activity
- Test SRS progress updates still work
- Test automatic progression triggers
- Test analytics endpoints return correct data

### 4.3 Frontend Tests
- Test dashboard shows activity history instead of sessions
- Test analytics display time breakdown by activity
- Test flashcard completion triggers progression checks

## Phase 5: Rollback Plan

### If Migration Fails
```sql
-- Restore old tables from backup
-- Revert backend code changes
-- Revert frontend API calls
-- Test old functionality works
```

## Migration Timeline

1. **Week 1**: Database schema changes + function creation
2. **Week 2**: Data migration scripts + backend updates
3. **Week 3**: Frontend updates + testing
4. **Week 4**: Production deployment + monitoring

## Success Criteria

✅ All flashcard submissions work  
✅ SRS progress tracking continues  
✅ Analytics show time by activity type  
✅ Automatic progression works  
✅ No session continuity issues  
✅ Future activities easily added  
✅ Performance meets requirements  

## Files to Create/Update

### Database Files
- `Database/learning_activities_schema.sql` - New table + functions
- `Database/migrate_to_activities.sql` - Data migration scripts
- `Database/drop_old_tables.sql` - Cleanup script

### Backend Files
- `lang-portal/internal/handlers/flashcard_handlers.go` - Update to use learning_activities
- `lang-portal/internal/handlers/dashboard_handlers.go` - Update analytics
- `lang-portal/internal/database/models/models.go` - Add LearningActivity model

### Frontend Files
- `lang-portal/frontend/types/api.ts` - Add LearningActivity types
- `lang-portal/frontend/services/api.ts` - Add activity APIs
- `lang-portal/frontend/components/dashboard/` - Update analytics displays

This migration simplifies the tracking system while maintaining all functionality and enabling future extensibility.</content>
<parameter name="filePath">/Users/ali/github/free-genai-bootcamp-2025/Database/MIGRATION_PLAN.md