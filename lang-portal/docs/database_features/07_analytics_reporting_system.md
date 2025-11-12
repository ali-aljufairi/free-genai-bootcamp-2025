# Analytics & Reporting System Features

## Overview
Comprehensive analytics and reporting system for tracking learning progress, user behavior, content performance, and generating insights for personalized learning experiences.

## Core Tables
- `progress` - Learning progress data
- `study_sessions` - Study session tracking
- `user_question_attempts` - JLPT question performance
- `user_activities` - User behavior tracking
- `analytics_events` - Custom analytics events

## Key Features

### 1. Learning Progress Analytics
```sql
-- Get comprehensive learning overview
SELECT 
    item_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN seen_cnt > 0 THEN 1 END) as studied_items,
    COUNT(CASE WHEN correct_cnt >= 3 THEN 1 END) as mastered_items,
    ROUND(AVG(correct_cnt::numeric / NULLIF(seen_cnt, 0)) * 100, 2) as avg_accuracy,
    ROUND(COUNT(CASE WHEN seen_cnt > 0 THEN 1 END)::numeric / COUNT(*) * 100, 2) as study_coverage
FROM progress 
WHERE user_id = $1
GROUP BY item_type
ORDER BY total_items DESC;

-- Get learning velocity (items learned per day)
SELECT 
    DATE(last_seen) as study_date,
    COUNT(DISTINCT item_id) as items_reviewed,
    COUNT(CASE WHEN correct_cnt > 0 THEN 1 END) as items_correct,
    ROUND(COUNT(CASE WHEN correct_cnt > 0 THEN 1 END)::numeric / COUNT(*) * 100, 2) as daily_accuracy
FROM progress 
WHERE user_id = $1 AND last_seen >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_seen)
ORDER BY study_date;
```

### 2. Study Session Analytics
```sql
-- Get study session statistics
SELECT 
    DATE(created_at) as session_date,
    COUNT(*) as total_sessions,
    SUM(duration_minutes) as total_study_time,
    AVG(duration_minutes) as avg_session_length,
    COUNT(DISTINCT activity_id) as activities_used
FROM study_sessions 
WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY session_date;

-- Get activity performance
SELECT 
    sa.name as activity_name,
    COUNT(*) as sessions_count,
    AVG(ss.duration_minutes) as avg_duration,
    COUNT(DISTINCT ss.user_id) as unique_users
FROM study_sessions ss
JOIN study_activities sa ON ss.activity_id = sa.id
WHERE ss.created_at >= NOW() - INTERVAL '30 days'
GROUP BY sa.id, sa.name
ORDER BY sessions_count DESC;
```

### 3. JLPT Performance Analytics
```sql
-- Get JLPT performance by level
SELECT 
    q.level,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN uqa.correct THEN 1 END) as correct_answers,
    ROUND(COUNT(CASE WHEN uqa.correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy,
    AVG(EXTRACT(EPOCH FROM (uqa.answered_at - uqa.started_at))) as avg_response_time
FROM user_question_attempts uqa
JOIN jlpt_questions q ON uqa.question_id = q.id
WHERE uqa.user_id = $1
GROUP BY q.level
ORDER BY q.level;

-- Get weak areas analysis
SELECT 
    q.tag, q.kind, q.level,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN uqa.correct THEN 1 END) as correct_answers,
    ROUND(COUNT(CASE WHEN uqa.correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy
FROM user_question_attempts uqa
JOIN jlpt_questions q ON uqa.question_id = q.id
WHERE uqa.user_id = $1
GROUP BY q.tag, q.kind, q.level
HAVING COUNT(*) >= 5
ORDER BY accuracy ASC;
```

### 4. User Behavior Analytics
```sql
-- Get user engagement metrics
SELECT 
    DATE(created_at) as activity_date,
    COUNT(*) as total_activities,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT activity_type) as activity_types
FROM user_activities 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY activity_date;

-- Get user retention analysis
WITH user_cohorts AS (
    SELECT 
        user_id,
        DATE(MIN(created_at)) as first_activity,
        DATE(created_at) as activity_date
    FROM user_activities
    GROUP BY user_id, DATE(created_at)
),
cohort_retention AS (
    SELECT 
        first_activity,
        DATE_PART('day', activity_date - first_activity) as days_since_first,
        COUNT(DISTINCT user_id) as retained_users
    FROM user_cohorts
    GROUP BY first_activity, days_since_first
)
SELECT 
    first_activity,
    days_since_first,
    retained_users,
    ROUND(retained_users::numeric / 
        FIRST_VALUE(retained_users) OVER (PARTITION BY first_activity ORDER BY days_since_first) * 100, 2) as retention_rate
FROM cohort_retention
WHERE days_since_first <= 30
ORDER BY first_activity, days_since_first;
```

### 5. Content Performance Analytics
```sql
-- Get content difficulty analysis
SELECT 
    item_type,
    AVG(correct_cnt::numeric / NULLIF(seen_cnt, 0)) as avg_difficulty,
    STDDEV(correct_cnt::numeric / NULLIF(seen_cnt, 0)) as difficulty_variance,
    COUNT(*) as total_attempts
FROM progress 
WHERE seen_cnt >= 5
GROUP BY item_type;

-- Get most challenging content
SELECT 
    CASE p.item_type 
        WHEN 'word' THEN w.english
        WHEN 'kanji' THEN k.character
        WHEN 'grammar' THEN gp.key
    END as content,
    p.item_type,
    AVG(p.correct_cnt::numeric / NULLIF(p.seen_cnt, 0)) as difficulty_score,
    COUNT(*) as attempt_count
FROM progress p
LEFT JOIN words w ON p.item_type = 'word' AND p.item_id = w.id
LEFT JOIN kanji k ON p.item_type = 'kanji' AND p.item_id = k.id
LEFT JOIN grammar_points gp ON p.item_type = 'grammar' AND p.item_id = gp.id
WHERE p.seen_cnt >= 3
GROUP BY p.item_type, p.item_id, w.english, k.character, gp.key
ORDER BY difficulty_score ASC
LIMIT 20;
```

## API Endpoints (Example)

### Analytics Dashboard
```javascript
// GET /api/analytics/overview - Get learning overview
// GET /api/analytics/progress - Get detailed progress
// GET /api/analytics/sessions - Get session analytics
// GET /api/analytics/performance - Get performance metrics
```

### Reports
```javascript
// GET /api/reports/weekly - Get weekly report
// GET /api/reports/monthly - Get monthly report
// GET /api/reports/jlpt - Get JLPT performance report
// GET /api/reports/weaknesses - Get weak areas report
```

### Data Export
```javascript
// GET /api/analytics/export/progress - Export progress data
// GET /api/analytics/export/sessions - Export session data
// GET /api/analytics/export/performance - Export performance data
```

## Advanced Analytics Features

### 1. Predictive Analytics
```sql
-- Predict user's JLPT level readiness
CREATE OR REPLACE FUNCTION predict_jlpt_readiness(p_user_id BIGINT) 
RETURNS TABLE(level INT, readiness_score NUMERIC, estimated_months INT) AS $$
BEGIN
    RETURN QUERY
    WITH user_performance AS (
        SELECT 
            q.level,
            COUNT(*) as total_questions,
            COUNT(CASE WHEN uqa.correct THEN 1 END) as correct_answers,
            AVG(EXTRACT(EPOCH FROM (uqa.answered_at - uqa.started_at))) as avg_response_time
        FROM user_question_attempts uqa
        JOIN jlpt_questions q ON uqa.question_id = q.id
        WHERE uqa.user_id = p_user_id
        GROUP BY q.level
    ),
    level_requirements AS (
        SELECT 
            level,
            CASE level
                WHEN 5 THEN 0.6
                WHEN 4 THEN 0.7
                WHEN 3 THEN 0.75
                WHEN 2 THEN 0.8
                WHEN 1 THEN 0.85
            END as required_accuracy
        FROM (VALUES (1), (2), (3), (4), (5)) as levels(level)
    )
    SELECT 
        lr.level,
        ROUND(up.correct_answers::numeric / up.total_questions * 100, 2) as readiness_score,
        CASE 
            WHEN up.correct_answers::numeric / up.total_questions >= lr.required_accuracy THEN 0
            ELSE CEIL((lr.required_accuracy - up.correct_answers::numeric / up.total_questions) * 12)
        END as estimated_months
    FROM level_requirements lr
    LEFT JOIN user_performance up ON lr.level = up.level
    ORDER BY lr.level;
END;
$$ LANGUAGE plpgsql;
```

### 2. Learning Path Optimization
```sql
-- Analyze optimal learning sequences
WITH learning_sequences AS (
    SELECT 
        user_id,
        item_type,
        item_id,
        created_at,
        LAG(item_id) OVER (PARTITION BY user_id, item_type ORDER BY created_at) as prev_item
    FROM study_sessions ss
    JOIN review_items ri ON ss.id = ri.session_id
),
sequence_effectiveness AS (
    SELECT 
        item_type,
        prev_item,
        item_id,
        COUNT(*) as sequence_count,
        AVG(ri.correct::int) as success_rate
    FROM learning_sequences ls
    JOIN review_items ri ON ls.item_id = ri.item_id
    WHERE ls.prev_item IS NOT NULL
    GROUP BY item_type, prev_item, item_id
    HAVING COUNT(*) >= 5
)
SELECT * FROM sequence_effectiveness
WHERE success_rate > 0.8
ORDER BY success_rate DESC;
```

### 3. Content Recommendation Engine
```sql
-- Generate personalized content recommendations
CREATE OR REPLACE FUNCTION get_content_recommendations(p_user_id BIGINT, p_limit INT DEFAULT 10)
RETURNS TABLE(item_id INT, item_type review_item_enum, recommendation_score NUMERIC) AS $$
BEGIN
    RETURN QUERY
    WITH user_weaknesses AS (
        SELECT item_type, AVG(correct_cnt::numeric / seen_cnt) as avg_mastery
        FROM progress 
        WHERE user_id = p_user_id AND seen_cnt >= 3
        GROUP BY item_type
    ),
    content_scores AS (
        SELECT 
            p.item_id,
            p.item_type,
            CASE 
                WHEN p.seen_cnt = 0 THEN 1.0  -- New content
                WHEN p.correct_cnt::numeric / p.seen_cnt < 0.7 THEN 0.8  -- Weak content
                ELSE 0.3  -- Known content
            END as difficulty_score,
            CASE p.item_type
                WHEN 'word' THEN w.frequency
                WHEN 'kanji' THEN k.frequency
                ELSE 100
            END as frequency_score
        FROM progress p
        LEFT JOIN words w ON p.item_type = 'word' AND p.item_id = w.id
        LEFT JOIN kanji k ON p.item_type = 'kanji' AND p.item_id = k.id
        WHERE p.user_id = p_user_id
    )
    SELECT 
        cs.item_id,
        cs.item_type,
        (cs.difficulty_score * 0.6 + cs.frequency_score::numeric / 1000 * 0.4) as recommendation_score
    FROM content_scores cs
    ORDER BY recommendation_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### 4. Real-time Analytics
```sql
-- Get real-time learning metrics
SELECT 
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_sessions,
    AVG(duration_minutes) as avg_session_length
FROM study_sessions 
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- Get current study activity
SELECT 
    sa.name as activity_name,
    COUNT(*) as active_sessions
FROM study_sessions ss
JOIN study_activities sa ON ss.activity_id = sa.id
WHERE ss.created_at >= NOW() - INTERVAL '30 minutes'
GROUP BY sa.id, sa.name
ORDER BY active_sessions DESC;
```

## Reporting Features

### 1. Automated Reports
- Daily learning summaries
- Weekly progress reports
- Monthly performance reviews
- JLPT readiness assessments

### 2. Custom Dashboards
- Learning progress visualization
- Study session analytics
- Performance trend analysis
- Goal tracking and achievement

### 3. Data Export
- CSV/JSON export capabilities
- Scheduled report generation
- API access for external tools
- Real-time data streaming

## Performance Optimization

### 1. Analytics Indexes
```sql
-- Indexes for analytics queries
CREATE INDEX idx_progress_user_seen ON progress(user_id, last_seen);
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, created_at);
CREATE INDEX idx_user_question_attempts_user_level ON user_question_attempts(user_id, question_id);
CREATE INDEX idx_user_activities_user_date ON user_activities(user_id, created_at);
```

### 2. Materialized Views
```sql
-- Materialized view for daily analytics
CREATE MATERIALIZED VIEW daily_analytics AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_sessions,
    AVG(duration_minutes) as avg_session_length
FROM study_sessions 
GROUP BY DATE(created_at);
```

### 3. Caching Strategy
- Redis caching for frequently accessed metrics
- Aggregated data caching
- Real-time analytics caching
- Report result caching 