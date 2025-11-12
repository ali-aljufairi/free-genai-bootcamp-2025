# Course Curriculum System Features

## Overview
Comprehensive course and curriculum management system with hierarchical learning paths, unit organization, and progress tracking.

## Core Tables
- `courses` - Main course definitions
- `units` - Course units with hierarchical paths
- `lessons` - Individual lesson content
- `unit_items` - Items (words, kanji, grammar) in units
- `user_course_progress` - User progress through courses

## Key Features

### 1. Course Management
```sql
-- Get all available courses
SELECT id, title, description, level, total_units, estimated_hours
FROM courses 
WHERE is_active = true 
ORDER BY level, title;

-- Get course with unit structure
SELECT c.*, 
       COUNT(u.id) as unit_count,
       COUNT(ui.id) as item_count
FROM courses c
LEFT JOIN units u ON c.id = u.course_id
LEFT JOIN unit_items ui ON u.id = ui.unit_id
WHERE c.id = $1
GROUP BY c.id;
```

### 2. Unit Hierarchy Management
```sql
-- Get unit tree structure using ltree
SELECT id, title, path, level(path) as depth
FROM units 
WHERE course_id = $1 
ORDER BY path;

-- Get child units
SELECT * FROM units 
WHERE path <@ $1::ltree 
ORDER BY path;

-- Get parent units
SELECT * FROM units 
WHERE path @> $1::ltree 
ORDER BY path;

-- Get sibling units
SELECT * FROM units 
WHERE path ~ $1::ltree 
ORDER BY path;
```

### 3. Lesson Content Organization
```sql
-- Get lessons in unit
SELECT l.*, 
       COUNT(li.id) as item_count
FROM lessons l
LEFT JOIN lesson_items li ON l.id = li.lesson_id
WHERE l.unit_id = $1
GROUP BY l.id
ORDER BY l.order_index;

-- Get lesson with all content
SELECT l.*, 
       array_agg(DISTINCT li.item_type) as content_types,
       array_agg(DISTINCT li.item_id) as item_ids
FROM lessons l
LEFT JOIN lesson_items li ON l.id = li.lesson_id
WHERE l.id = $1
GROUP BY l.id;
```

### 4. Unit Item Management
```sql
-- Get all items in a unit
SELECT ui.*, 
       CASE ui.item_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
         WHEN 'sentence' THEN s.japanese
       END as item_content
FROM unit_items ui
LEFT JOIN words w ON ui.item_type = 'word' AND ui.item_id = w.id
LEFT JOIN kanji k ON ui.item_type = 'kanji' AND ui.item_id = k.id
LEFT JOIN grammar_points gp ON ui.item_type = 'grammar' AND ui.item_id = gp.id
LEFT JOIN sentences s ON ui.item_type = 'sentence' AND ui.item_id = s.id
WHERE ui.unit_id = $1
ORDER BY ui.order_index;
```

### 5. Learning Path Generation
```sql
-- Get recommended learning path
WITH user_progress AS (
    SELECT unit_id, completion_percentage
    FROM user_course_progress
    WHERE user_id = $1 AND course_id = $2
),
available_units AS (
    SELECT u.*
    FROM units u
    WHERE u.course_id = $2
      AND u.id NOT IN (SELECT unit_id FROM user_progress WHERE completion_percentage >= 80)
      AND u.path ~ '*.{1}'::lquery  -- Only leaf units
)
SELECT au.*, 
       level(au.path) as depth,
       up.completion_percentage
FROM available_units au
LEFT JOIN user_progress up ON au.id = up.unit_id
ORDER BY au.path;
```

## API Endpoints (Example)

### Course Management
```javascript
// GET /api/courses - List all courses
// GET /api/courses/:id - Get course details
// GET /api/courses/:id/units - Get course units
// POST /api/courses/:id/enroll - Enroll in course
```

### Unit Navigation
```javascript
// GET /api/units/:id - Get unit details
// GET /api/units/:id/children - Get child units
// GET /api/units/:id/items - Get unit items
// GET /api/units/:id/lessons - Get unit lessons
```

### Progress Tracking
```javascript
// GET /api/progress/course/:courseId - Get course progress
// POST /api/progress/unit/:unitId - Update unit progress
// GET /api/progress/next - Get next recommended unit
// GET /api/progress/overview - Get overall progress
```

## Advanced Features

### 1. Adaptive Learning Paths
```sql
-- Generate personalized learning path based on user performance
WITH user_weaknesses AS (
    SELECT item_type, COUNT(*) as weak_count
    FROM progress 
    WHERE user_id = $1 AND correct_cnt::numeric / seen_cnt < 0.7
    GROUP BY item_type
),
recommended_units AS (
    SELECT u.*, 
           COUNT(CASE WHEN ui.item_type IN (SELECT item_type FROM user_weaknesses) THEN 1 END) as focus_items
    FROM units u
    LEFT JOIN unit_items ui ON u.id = ui.unit_id
    WHERE u.course_id = $2
    GROUP BY u.id
)
SELECT * FROM recommended_units
ORDER BY focus_items DESC, path;
```

### 2. Prerequisite Checking
```sql
-- Check if user can access unit based on prerequisites
CREATE OR REPLACE FUNCTION can_access_unit(
    p_user_id BIGINT,
    p_unit_id INT
) RETURNS BOOLEAN AS $$
DECLARE
    unit_record RECORD;
    prerequisite_met BOOLEAN := true;
BEGIN
    -- Get unit and its prerequisites
    SELECT * INTO unit_record FROM units WHERE id = p_unit_id;
    
    -- Check if all parent units are completed
    IF unit_record.path ~ '*.{1}'::lquery THEN  -- Leaf unit
        SELECT EXISTS(
            SELECT 1 FROM user_course_progress ucp
            JOIN units u ON ucp.unit_id = u.id
            WHERE ucp.user_id = p_user_id 
              AND ucp.completion_percentage >= 80
              AND u.path @> unit_record.path
        ) INTO prerequisite_met;
    END IF;
    
    RETURN prerequisite_met;
END;
$$ LANGUAGE plpgsql;
```

### 3. Course Completion Tracking
```sql
-- Get course completion status
SELECT 
    c.title,
    COUNT(u.id) as total_units,
    COUNT(ucp.unit_id) as completed_units,
    ROUND(COUNT(ucp.unit_id)::numeric / COUNT(u.id) * 100, 2) as completion_percentage,
    CASE 
        WHEN COUNT(ucp.unit_id) = COUNT(u.id) THEN 'completed'
        WHEN COUNT(ucp.unit_id) > 0 THEN 'in_progress'
        ELSE 'not_started'
    END as status
FROM courses c
LEFT JOIN units u ON c.id = u.course_id
LEFT JOIN user_course_progress ucp ON u.id = ucp.unit_id AND ucp.user_id = $1
WHERE c.id = $2
GROUP BY c.id, c.title;
```

### 4. Learning Analytics
```sql
-- Get learning velocity by course
SELECT 
    c.title,
    DATE(ucp.completed_at) as completion_date,
    COUNT(DISTINCT ucp.unit_id) as units_completed,
    AVG(ucp.completion_percentage) as avg_performance
FROM user_course_progress ucp
JOIN units u ON ucp.unit_id = u.id
JOIN courses c ON u.course_id = c.id
WHERE ucp.user_id = $1 AND ucp.completed_at IS NOT NULL
GROUP BY c.id, c.title, DATE(ucp.completed_at)
ORDER BY completion_date;
```

## Curriculum Design Features

### 1. Content Sequencing
- **Prerequisites**: Units must be completed in order
- **Difficulty Progression**: Content increases in complexity
- **Spiral Learning**: Concepts revisited at higher levels
- **Flexible Paths**: Multiple routes through content

### 2. Assessment Integration
```sql
-- Get assessment items for unit
SELECT ui.*, 
       CASE ui.item_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
       END as item_content
FROM unit_items ui
LEFT JOIN words w ON ui.item_type = 'word' AND ui.item_id = w.id
LEFT JOIN kanji k ON ui.item_type = 'kanji' AND ui.item_id = k.id
LEFT JOIN grammar_points gp ON ui.item_type = 'grammar' AND ui.item_id = gp.id
WHERE ui.unit_id = $1 AND ui.is_assessment = true
ORDER BY ui.order_index;
```

### 3. Content Recommendations
```sql
-- Recommend content based on user progress
SELECT ui.*, 
       CASE ui.item_type 
         WHEN 'word' THEN w.english
         WHEN 'kanji' THEN k.character
         WHEN 'grammar' THEN gp.key
       END as item_content,
       p.correct_cnt::numeric / NULLIF(p.seen_cnt, 0) as mastery_level
FROM unit_items ui
LEFT JOIN words w ON ui.item_type = 'word' AND ui.item_id = w.id
LEFT JOIN kanji k ON ui.item_type = 'kanji' AND ui.item_id = k.id
LEFT JOIN grammar_points gp ON ui.item_type = 'grammar' AND ui.item_id = gp.id
LEFT JOIN progress p ON ui.item_type = p.item_type AND ui.item_id = p.item_id AND p.user_id = $1
WHERE ui.unit_id = $1
  AND (p.seen_cnt IS NULL OR p.correct_cnt::numeric / p.seen_cnt < 0.8)
ORDER BY ui.order_index;
```

## Performance Optimization

### 1. Caching Strategies
- Course structure caching
- User progress caching
- Unit content caching

### 2. Database Indexes
```sql
-- Indexes for efficient queries
CREATE INDEX idx_units_course_path ON units(course_id, path);
CREATE INDEX idx_unit_items_unit_order ON unit_items(unit_id, order_index);
CREATE INDEX idx_user_course_progress_user_course ON user_course_progress(user_id, course_id);
```

### 3. Query Optimization
- Use CTEs for complex path calculations
- Materialized views for frequently accessed data
- Partitioning by course_id for large datasets 