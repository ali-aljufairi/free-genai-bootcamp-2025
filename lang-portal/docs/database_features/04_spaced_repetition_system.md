# Spaced Repetition System (SRS) Features

## Overview
Advanced spaced repetition system for optimal learning retention with progress tracking, study sessions, and adaptive scheduling.

## Core Tables
- `progress` - Main SRS progress tracking
- `study_sessions` - User study sessions
- `review_items` - Individual review attempts
- `study_activities` - Available study activity types
- `user_settings` - SRS configuration settings

## Key Features

### 1. Progress Tracking
```sql
-- Get user's progress for all items
SELECT item_type, item_id, seen_cnt, correct_cnt, incorrect_cnt,
       last_seen, next_due
FROM progress 
WHERE user_id = $1;

-- Get items due for review
SELECT p.*, 
       CASE p.item_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
         WHEN 'sentence' THEN s.japanese
       END as item_content
FROM progress p
LEFT JOIN words w ON p.item_type = 'word' AND p.item_id = w.id
LEFT JOIN kanji k ON p.item_type = 'kanji' AND p.item_id = k.id
LEFT JOIN grammar_points gp ON p.item_type = 'grammar' AND p.item_id = gp.id
LEFT JOIN sentences s ON p.item_type = 'sentence' AND p.item_id = s.id
WHERE p.user_id = $1 AND p.next_due <= NOW()
ORDER BY p.next_due;
```

### 2. SRS Algorithm Implementation
```sql
-- Update progress after review
CREATE OR REPLACE FUNCTION update_srs_progress(
    p_user_id BIGINT,
    p_item_type review_item_enum,
    p_item_id INT,
    p_correct BOOLEAN
) RETURNS VOID AS $$
DECLARE
    current_interval INTERVAL;
    new_interval INTERVAL;
    next_review TIMESTAMPTZ;
BEGIN
    -- Get current progress
    SELECT next_due - last_seen INTO current_interval
    FROM progress 
    WHERE user_id = p_user_id AND item_type = p_item_type AND item_id = p_item_id;
    
    -- Calculate new interval based on SRS algorithm
    IF p_correct THEN
        -- Correct answer: increase interval
        IF current_interval IS NULL THEN
            new_interval := INTERVAL '1 day';
        ELSIF current_interval < INTERVAL '1 day' THEN
            new_interval := INTERVAL '1 day';
        ELSIF current_interval < INTERVAL '1 week' THEN
            new_interval := current_interval * 2;
        ELSE
            new_interval := current_interval * 1.5;
        END IF;
    ELSE
        -- Incorrect answer: reset to 1 day
        new_interval := INTERVAL '1 day';
    END IF;
    
    -- Update progress
    INSERT INTO progress (user_id, item_type, item_id, seen_cnt, correct_cnt, last_seen, next_due)
    VALUES (p_user_id, p_item_type, p_item_id, 1, 
            CASE WHEN p_correct THEN 1 ELSE 0 END, 
            NOW(), NOW() + new_interval)
    ON CONFLICT (user_id, item_type, item_id) DO UPDATE SET
        seen_cnt = progress.seen_cnt + 1,
        correct_cnt = progress.correct_cnt + CASE WHEN p_correct THEN 1 ELSE 0 END,
        last_seen = NOW(),
        next_due = NOW() + new_interval;
END;
$$ LANGUAGE plpgsql;
```

### 3. Study Session Management
```sql
-- Create new study session
INSERT INTO study_sessions (user_id, activity_id, unit_id)
VALUES ($1, $2, $3) RETURNING id;

-- Record review item
INSERT INTO review_items (session_id, item_type, item_id, correct)
VALUES ($1, $2, $3, $4);

-- Get session statistics
SELECT 
    COUNT(*) as total_reviews,
    COUNT(CASE WHEN correct THEN 1 END) as correct_answers,
    ROUND(COUNT(CASE WHEN correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy
FROM review_items ri
JOIN study_sessions ss ON ri.session_id = ss.id
WHERE ss.user_id = $1 AND ss.created_at >= $2;
```

### 4. Daily Review Management
```sql
-- Get daily review items
SELECT p.*, 
       CASE p.item_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
         WHEN 'sentence' THEN s.japanese
       END as item_content,
       CASE p.item_type 
         WHEN 'word' THEN w.kana
         WHEN 'kanji' THEN k.meanings[1]
         WHEN 'grammar' THEN gp.structure
         WHEN 'sentence' THEN s.english
       END as item_hint
FROM progress p
LEFT JOIN words w ON p.item_type = 'word' AND p.item_id = w.id
LEFT JOIN kanji k ON p.item_type = 'kanji' AND p.item_id = k.id
LEFT JOIN grammar_points gp ON p.item_type = 'grammar' AND p.item_id = gp.id
LEFT JOIN sentences s ON p.item_type = 'sentence' AND p.item_id = s.id
WHERE p.user_id = $1 
  AND p.next_due <= NOW()
  AND p.seen_cnt < 10  -- Limit to prevent overwhelming
ORDER BY p.next_due
LIMIT $2;  -- Daily target from user_settings
```

### 5. Learning Statistics
```sql
-- Get comprehensive learning stats
SELECT 
    item_type,
    COUNT(*) as total_items,
    COUNT(CASE WHEN seen_cnt > 0 THEN 1 END) as studied_items,
    COUNT(CASE WHEN correct_cnt >= 3 THEN 1 END) as mastered_items,
    ROUND(AVG(correct_cnt::numeric / NULLIF(seen_cnt, 0)) * 100, 2) as avg_accuracy,
    COUNT(CASE WHEN next_due <= NOW() THEN 1 END) as due_items
FROM progress 
WHERE user_id = $1
GROUP BY item_type;

-- Get learning streak
WITH daily_study AS (
    SELECT DATE(created_at) as study_date
    FROM study_sessions 
    WHERE user_id = $1
    GROUP BY DATE(created_at)
),
streak_calc AS (
    SELECT study_date,
           ROW_NUMBER() OVER (ORDER BY study_date DESC) as rn,
           study_date - ROW_NUMBER() OVER (ORDER BY study_date DESC) * INTERVAL '1 day' as grp
    FROM daily_study
)
SELECT COUNT(*) as current_streak
FROM streak_calc 
WHERE grp = (SELECT grp FROM streak_calc WHERE rn = 1);
```

## API Endpoints (Example)

### Study Sessions
```javascript
// POST /api/study/session/start - Start new session
// POST /api/study/review - Submit review answer
// GET /api/study/session/:id - Get session details
// GET /api/study/daily - Get daily review items
```

### Progress Tracking
```javascript
// GET /api/progress/overview - Get learning overview
// GET /api/progress/items - Get specific item progress
// GET /api/progress/stats - Get detailed statistics
// GET /api/progress/streak - Get learning streak
```

### SRS Management
```javascript
// GET /api/srs/due - Get items due for review
// POST /api/srs/update - Update item progress
// GET /api/srs/schedule - Get review schedule
// POST /api/srs/reset - Reset SRS progress
```

## Advanced SRS Features

### 1. Adaptive Intervals
```sql
-- Custom interval calculation based on user performance
CREATE OR REPLACE FUNCTION calculate_next_interval(
    p_user_id BIGINT,
    p_item_type review_item_enum,
    p_item_id INT,
    p_correct BOOLEAN
) RETURNS INTERVAL AS $$
DECLARE
    user_accuracy NUMERIC;
    base_interval INTERVAL;
    adjusted_interval INTERVAL;
BEGIN
    -- Get user's overall accuracy for this item type
    SELECT AVG(correct_cnt::numeric / NULLIF(seen_cnt, 0)) INTO user_accuracy
    FROM progress 
    WHERE user_id = p_user_id AND item_type = p_item_type;
    
    -- Base interval calculation
    IF p_correct THEN
        base_interval := INTERVAL '1 day' * POWER(2, 
            (SELECT COALESCE(MAX(seen_cnt), 0) FROM progress 
             WHERE user_id = p_user_id AND item_type = p_item_type AND item_id = p_item_id)
        );
    ELSE
        base_interval := INTERVAL '1 day';
    END IF;
    
    -- Adjust based on user accuracy
    IF user_accuracy > 0.9 THEN
        adjusted_interval := base_interval * 1.2;
    ELSIF user_accuracy < 0.7 THEN
        adjusted_interval := base_interval * 0.8;
    ELSE
        adjusted_interval := base_interval;
    END IF;
    
    RETURN adjusted_interval;
END;
$$ LANGUAGE plpgsql;
```

### 2. Difficulty Adjustment
```sql
-- Adjust intervals based on item difficulty
UPDATE progress 
SET next_due = last_seen + 
    CASE 
        WHEN item_type = 'kanji' AND item_id IN (
            SELECT id FROM kanji WHERE stroke_count > 10
        ) THEN INTERVAL '2 days'
        WHEN item_type = 'word' AND item_id IN (
            SELECT id FROM words WHERE jlpt = 1
        ) THEN INTERVAL '3 days'
        ELSE INTERVAL '1 day'
    END
WHERE user_id = $1 AND next_due <= NOW();
```

### 3. Learning Analytics
```sql
-- Get learning velocity (items learned per day)
SELECT 
    DATE(created_at) as study_date,
    COUNT(DISTINCT ri.item_id) as new_items_learned,
    COUNT(*) as total_reviews
FROM study_sessions ss
JOIN review_items ri ON ss.id = ri.session_id
WHERE ss.user_id = $1 
  AND ri.correct = true
  AND ri.item_id NOT IN (
    SELECT item_id FROM review_items ri2
    JOIN study_sessions ss2 ON ri2.session_id = ss2.id
    WHERE ss2.user_id = $1 AND ss2.created_at < ss.created_at
  )
GROUP BY DATE(created_at)
ORDER BY study_date;
```

## SRS Configuration

### User Settings Impact
- `daily_review_target`: Maximum items per day
- `srs_reset_at`: When to reset SRS progress
- `hide_english`: Study mode preferences

### Algorithm Parameters
- Initial interval: 1 day
- Correct answer multiplier: 2x (up to 1 week), then 1.5x
- Incorrect answer: Reset to 1 day
- Maximum interval: 6 months
- Minimum interval: 1 day

### Performance Optimization
- Indexes on (user_id, next_due) for quick due item queries
- Partitioning by user_id for large datasets
- Caching of frequently accessed progress data 