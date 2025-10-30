# Dashboard API Endpoints

**Base URL**: `/api/langportal/dashboard`

## GET /api/langportal/dashboard/last_study_session
Returns information about the most recent study session.

### Response
```json
{
  "id": 123,
  "group_id": 456,
  "created_at": "2025-02-08T17:20:23-05:00",
  "study_activity_id": 789,
  "group_name": "Basic Greetings"
}
```

## GET /api/langportal/dashboard/study_progress
Returns study progress statistics.
Please note that the frontend will determine progress bar based on total words studied and total available words.

### Response
```json
{
  "total_words_studied": 3,
  "total_available_words": 124
}
```

## GET /api/langportal/dashboard/quick-stats
Returns quick overview statistics.

### Response
```json
{
  "success_rate": 80.0,
  "total_study_sessions": 4,
  "total_active_groups": 3,
  "study_streak_days": 4
}
```