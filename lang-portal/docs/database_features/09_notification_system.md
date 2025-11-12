# Notification System Features

## Overview
Comprehensive notification system for user engagement, study reminders, progress updates, and personalized communication.

## Core Tables
- `notifications` - User notifications
- `notification_templates` - Notification message templates
- `notification_preferences` - User notification settings
- `notification_channels` - Available notification channels
- `notification_events` - System events that trigger notifications

## Key Features

### 1. Notification Management
```sql
-- Get user notifications
SELECT id, title, message, notification_type, is_read, created_at,
       channel, priority_level
FROM notifications 
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2;

-- Get unread notifications count
SELECT COUNT(*) as unread_count
FROM notifications 
WHERE user_id = $1 AND is_read = false;

-- Mark notifications as read
UPDATE notifications 
SET is_read = true, read_at = NOW()
WHERE user_id = $1 AND id = ANY($2::int[]);

-- Get notifications by type
SELECT * FROM notifications 
WHERE user_id = $1 AND notification_type = $2
ORDER BY created_at DESC;
```

### 2. Notification Templates
```sql
-- Get notification template
SELECT title_template, message_template, channel, priority_level
FROM notification_templates 
WHERE event_type = $1 AND is_active = true;

-- Create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
    p_user_id BIGINT,
    p_event_type TEXT,
    p_data JSONB
) RETURNS INT AS $$
DECLARE
    template_record RECORD;
    notification_id INT;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM notification_templates 
    WHERE event_type = p_event_type AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found for event type: %', p_event_type;
    END IF;
    
    -- Create notification
    INSERT INTO notifications (
        user_id, title, message, notification_type, 
        channel, priority_level, data
    ) VALUES (
        p_user_id,
        template_record.title_template,
        template_record.message_template,
        p_event_type,
        template_record.channel,
        template_record.priority_level,
        p_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;
```

### 3. Study Reminders
```sql
-- Get users with due reviews
SELECT u.id, u.email, u.display_name,
       COUNT(p.item_id) as due_items_count
FROM users u
JOIN progress p ON u.id = p.user_id
WHERE p.next_due <= NOW()
  AND p.seen_cnt < 10  -- Prevent overwhelming
GROUP BY u.id, u.email, u.display_name
HAVING COUNT(p.item_id) >= 5;  -- Only notify if significant amount due

-- Get personalized study reminders
SELECT 
    u.id,
    u.email,
    u.display_name,
    COUNT(p.item_id) as due_items,
    MAX(p.next_due) as oldest_due,
    us.daily_review_target
FROM users u
JOIN progress p ON u.id = p.user_id
JOIN user_settings us ON u.id = us.user_id
WHERE p.next_due <= NOW()
  AND us.notification_preferences ? 'study_reminders'
GROUP BY u.id, u.email, u.display_name, us.daily_review_target
HAVING COUNT(p.item_id) >= us.daily_review_target;
```

### 4. Progress Notifications
```sql
-- Get achievement notifications
CREATE OR REPLACE FUNCTION check_and_notify_achievements(p_user_id BIGINT)
RETURNS VOID AS $$
DECLARE
    achievement_count INT;
    streak_count INT;
BEGIN
    -- Check for mastery achievements
    SELECT COUNT(*) INTO achievement_count
    FROM progress 
    WHERE user_id = p_user_id AND correct_cnt >= 5;
    
    IF achievement_count >= 100 THEN
        PERFORM create_notification_from_template(
            p_user_id,
            'mastery_achievement',
            jsonb_build_object('mastered_items', achievement_count)
        );
    END IF;
    
    -- Check for study streak
    WITH daily_study AS (
        SELECT DATE(created_at) as study_date
        FROM study_sessions 
        WHERE user_id = p_user_id
        GROUP BY DATE(created_at)
    ),
    streak_calc AS (
        SELECT study_date,
               ROW_NUMBER() OVER (ORDER BY study_date DESC) as rn,
               study_date - ROW_NUMBER() OVER (ORDER BY study_date DESC) * INTERVAL '1 day' as grp
        FROM daily_study
    )
    SELECT COUNT(*) INTO streak_count
    FROM streak_calc 
    WHERE grp = (SELECT grp FROM streak_calc WHERE rn = 1);
    
    IF streak_count >= 7 THEN
        PERFORM create_notification_from_template(
            p_user_id,
            'study_streak',
            jsonb_build_object('streak_days', streak_count)
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 5. Notification Preferences
```sql
-- Get user notification preferences
SELECT 
    np.notification_type,
    np.enabled,
    np.channel,
    np.frequency
FROM notification_preferences np
WHERE np.user_id = $1;

-- Update notification preferences
INSERT INTO notification_preferences (user_id, notification_type, enabled, channel, frequency)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, notification_type) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    channel = EXCLUDED.channel,
    frequency = EXCLUDED.frequency;

-- Get users who should receive notifications
SELECT u.id, u.email, u.display_name
FROM users u
JOIN notification_preferences np ON u.id = np.user_id
WHERE np.notification_type = $1 
  AND np.enabled = true
  AND np.channel = $2;
```

## API Endpoints (Example)

### Notification Management
```javascript
// GET /api/notifications - Get user notifications
// GET /api/notifications/unread - Get unread count
// PUT /api/notifications/:id/read - Mark as read
// DELETE /api/notifications/:id - Delete notification
```

### Preferences
```javascript
// GET /api/notifications/preferences - Get preferences
// PUT /api/notifications/preferences - Update preferences
// POST /api/notifications/test - Send test notification
```

### System Notifications
```javascript
// POST /api/notifications/broadcast - Send to all users
// POST /api/notifications/targeted - Send to specific users
// GET /api/notifications/templates - Get available templates
```

## Advanced Notification Features

### 1. Smart Scheduling
```sql
-- Get optimal notification timing based on user activity
CREATE OR REPLACE FUNCTION get_optimal_notification_time(p_user_id BIGINT)
RETURNS TIME AS $$
DECLARE
    most_active_hour INT;
BEGIN
    -- Find user's most active hour
    SELECT EXTRACT(HOUR FROM created_at)::int INTO most_active_hour
    FROM study_sessions 
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Return optimal time (1 hour before most active time)
    RETURN (most_active_hour - 1)::text || ':00:00'::time;
END;
$$ LANGUAGE plpgsql;
```

### 2. Notification Batching
```sql
-- Batch similar notifications
CREATE OR REPLACE FUNCTION batch_notifications(p_user_id BIGINT)
RETURNS VOID AS $$
BEGIN
    -- Batch study reminders
    WITH due_items AS (
        SELECT COUNT(*) as count, MIN(next_due) as earliest_due
        FROM progress 
        WHERE user_id = p_user_id AND next_due <= NOW()
    )
    INSERT INTO notifications (user_id, title, message, notification_type, priority_level)
    SELECT 
        p_user_id,
        'Study Reminder',
        'You have ' || di.count || ' items due for review',
        'study_reminder',
        CASE WHEN di.count > 20 THEN 'high' ELSE 'medium' END
    FROM due_items di
    WHERE di.count > 0;
END;
$$ LANGUAGE plpgsql;
```

### 3. Personalized Content
```sql
-- Create personalized notification content
CREATE OR REPLACE FUNCTION create_personalized_notification(
    p_user_id BIGINT,
    p_template_type TEXT
) RETURNS TEXT AS $$
DECLARE
    user_stats RECORD;
    personalized_message TEXT;
BEGIN
    -- Get user statistics
    SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN seen_cnt > 0 THEN 1 END) as studied_items,
        COUNT(CASE WHEN correct_cnt >= 3 THEN 1 END) as mastered_items
    INTO user_stats
    FROM progress 
    WHERE user_id = p_user_id;
    
    -- Create personalized message
    CASE p_template_type
        WHEN 'daily_motivation' THEN
            personalized_message := format(
                'Great progress! You''ve studied %s items and mastered %s. Keep up the excellent work!',
                user_stats.studied_items,
                user_stats.mastered_items
            );
        WHEN 'weekly_summary' THEN
            personalized_message := format(
                'This week you studied %s new items and now have %s mastered items in total.',
                user_stats.studied_items,
                user_stats.mastered_items
            );
        ELSE
            personalized_message := 'Keep up the great work with your Japanese studies!';
    END CASE;
    
    RETURN personalized_message;
END;
$$ LANGUAGE plpgsql;
```

### 4. Notification Analytics
```sql
-- Get notification engagement metrics
SELECT 
    notification_type,
    COUNT(*) as sent_count,
    COUNT(CASE WHEN is_read THEN 1 END) as read_count,
    ROUND(COUNT(CASE WHEN is_read THEN 1 END)::numeric / COUNT(*) * 100, 2) as read_rate,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_read_time_seconds
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY notification_type
ORDER BY sent_count DESC;

-- Get user engagement by notification type
SELECT 
    u.id,
    u.display_name,
    np.notification_type,
    COUNT(n.id) as received_count,
    COUNT(CASE WHEN n.is_read THEN 1 END) as read_count,
    ROUND(COUNT(CASE WHEN n.is_read THEN 1 END)::numeric / COUNT(n.id) * 100, 2) as engagement_rate
FROM users u
JOIN notification_preferences np ON u.id = np.user_id
LEFT JOIN notifications n ON u.id = n.user_id AND np.notification_type = n.notification_type
WHERE np.enabled = true
GROUP BY u.id, u.display_name, np.notification_type
ORDER BY engagement_rate DESC;
```

## Notification Types

### 1. Study Reminders
- **Daily Review Reminders**: Items due for review
- **Study Streak Alerts**: Consecutive study days
- **Goal Achievement**: Reaching study targets
- **Inactivity Alerts**: Reminders after no activity

### 2. Progress Notifications
- **Achievement Unlocks**: Mastering content
- **Level Up**: Progressing to new JLPT levels
- **Milestone Reached**: Reaching study milestones
- **Performance Insights**: Weekly/monthly summaries

### 3. Content Notifications
- **New Content Available**: New lessons or units
- **Recommended Content**: Personalized suggestions
- **Related Content**: Connected items to study
- **Challenge Updates**: New challenges or competitions

### 4. System Notifications
- **Account Updates**: Profile changes, settings
- **Feature Announcements**: New features or updates
- **Maintenance Alerts**: System maintenance notifications
- **Security Alerts**: Login attempts, account security

## Notification Channels

### 1. In-App Notifications
- Real-time notifications
- Notification center
- Toast messages
- Badge counts

### 2. Email Notifications
- Daily/weekly summaries
- Important achievements
- Account updates
- Marketing communications

### 3. Push Notifications
- Study reminders
- Achievement alerts
- Real-time updates
- Personalized content

### 4. SMS Notifications
- Critical reminders
- Account security
- Emergency notifications

## Performance Optimization

### 1. Notification Indexes
```sql
-- Indexes for notification queries
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id, notification_type);
```

### 2. Notification Queuing
- Asynchronous notification processing
- Rate limiting for notifications
- Priority-based queuing
- Batch processing for efficiency

### 3. Delivery Optimization
- Smart timing based on user activity
- Channel preference optimization
- Frequency capping
- A/B testing for engagement 