# User JLPT Level System

## Overview
Comprehensive system for tracking and managing user's current JLPT level, including automatic assessment, level progression, and personalized content recommendations.

## Current Gap Analysis

### What We Have:
- Content JLPT levels (kanji, words, grammar)
- User progress tracking on individual items
- JLPT question performance tracking
- Performance analytics by level

### What We Need:
- User's current JLPT level field
- Level progression history
- Automatic level assessment
- Level-based content filtering

## Recommended Implementation

### 1. Add JLPT Level to User Settings
```sql
-- Add current JLPT level to user_settings
ALTER TABLE user_settings ADD COLUMN current_jlpt_level INT DEFAULT 5;
ALTER TABLE user_settings ADD COLUMN jlpt_level_assessed_at TIMESTAMPTZ;
ALTER TABLE user_settings ADD COLUMN jlpt_level_assessment_method TEXT;

-- Add constraint for valid JLPT levels
ALTER TABLE user_settings ADD CONSTRAINT check_jlpt_level 
    CHECK (current_jlpt_level BETWEEN 1 AND 5);
```

### 2. Create JLPT Level History Table
```sql
-- Track level progression over time
CREATE TABLE user_jlpt_level_history (
    id: BIGSERIAL PRIMARY KEY,
    user_id: BIGINT REFERENCES users(id),
    jlpt_level: INT NOT NULL CHECK (jlpt_level BETWEEN 1 AND 5),
    assessment_method: TEXT NOT NULL, -- 'manual', 'automatic', 'exam'
    assessment_date: TIMESTAMPTZ DEFAULT NOW(),
    confidence_score: NUMERIC(3,2), -- 0.00 to 1.00
    notes: TEXT
);

-- Index for efficient queries
CREATE INDEX idx_user_jlpt_history_user_date ON user_jlpt_level_history(user_id, assessment_date);
```

### 3. Automatic Level Assessment Function
```sql
-- Automatically assess user's JLPT level based on performance
CREATE OR REPLACE FUNCTION assess_user_jlpt_level(p_user_id BIGINT)
RETURNS TABLE(
    assessed_level INT,
    confidence_score NUMERIC,
    assessment_method TEXT,
    details JSONB
) AS $$
DECLARE
    user_performance RECORD;
    level_requirements JSONB;
    assessed_level INT;
    confidence_score NUMERIC;
    assessment_details JSONB;
BEGIN
    -- Get user's performance by JLPT level
    SELECT 
        jsonb_object_agg(
            level::text, 
            jsonb_build_object(
                'total_questions', COUNT(*),
                'correct_answers', COUNT(CASE WHEN correct THEN 1 END),
                'accuracy', ROUND(COUNT(CASE WHEN correct THEN 1 END)::numeric / COUNT(*) * 100, 2)
            )
        ) as performance_by_level,
        jsonb_object_agg(
            level::text,
            COUNT(CASE WHEN correct THEN 1 END)::numeric / COUNT(*)
        ) as accuracy_by_level
    INTO user_performance
    FROM user_question_attempts uqa
    JOIN jlpt_questions q ON uqa.question_id = q.id
    WHERE uqa.user_id = p_user_id
    GROUP BY level;
    
    -- Define level requirements (can be customized)
    level_requirements := '{
        "5": {"min_accuracy": 0.6, "min_questions": 50},
        "4": {"min_accuracy": 0.7, "min_questions": 100},
        "3": {"min_accuracy": 0.75, "min_questions": 150},
        "2": {"min_accuracy": 0.8, "min_questions": 200},
        "1": {"min_accuracy": 0.85, "min_questions": 250}
    }'::jsonb;
    
    -- Assess level based on performance
    FOR i IN 1..5 LOOP
        IF user_performance.accuracy_by_level ? i::text THEN
            IF (user_performance.accuracy_by_level ->> i::text)::numeric >= 
               (level_requirements ->> i::text)::jsonb ->> 'min_accuracy' THEN
                assessed_level := i;
                confidence_score := (user_performance.accuracy_by_level ->> i::text)::numeric;
                EXIT;
            END IF;
        END IF;
    END LOOP;
    
    -- If no level met, default to N5
    IF assessed_level IS NULL THEN
        assessed_level := 5;
        confidence_score := 0.5;
    END IF;
    
    -- Build assessment details
    assessment_details := jsonb_build_object(
        'performance_by_level', user_performance.performance_by_level,
        'level_requirements', level_requirements,
        'assessment_criteria', 'accuracy_threshold'
    );
    
    RETURN QUERY SELECT 
        assessed_level,
        confidence_score,
        'automatic'::TEXT,
        assessment_details;
END;
$$ LANGUAGE plpgsql;
```

### 4. Update User Level Function
```sql
-- Update user's JLPT level and log history
CREATE OR REPLACE FUNCTION update_user_jlpt_level(
    p_user_id BIGINT,
    p_new_level INT,
    p_assessment_method TEXT DEFAULT 'manual',
    p_confidence_score NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_level INT;
    assessment_result RECORD;
BEGIN
    -- Get current level
    SELECT current_jlpt_level INTO current_level
    FROM user_settings 
    WHERE user_id = p_user_id;
    
    -- If automatic assessment, run assessment
    IF p_assessment_method = 'automatic' THEN
        SELECT * INTO assessment_result
        FROM assess_user_jlpt_level(p_user_id);
        
        p_new_level := assessment_result.assessed_level;
        p_confidence_score := assessment_result.confidence_score;
    END IF;
    
    -- Update user settings
    UPDATE user_settings SET
        current_jlpt_level = p_new_level,
        jlpt_level_assessed_at = NOW(),
        jlpt_level_assessment_method = p_assessment_method
    WHERE user_id = p_user_id;
    
    -- Log level change in history
    INSERT INTO user_jlpt_level_history (
        user_id, jlpt_level, assessment_method, 
        confidence_score, notes
    ) VALUES (
        p_user_id, p_new_level, p_assessment_method,
        p_confidence_score, p_notes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints

### Level Management
```javascript
// GET /api/users/:id/jlpt-level - Get current JLPT level
// PUT /api/users/:id/jlpt-level - Update JLPT level
// POST /api/users/:id/jlpt-level/assess - Auto-assess level
// GET /api/users/:id/jlpt-level/history - Get level history
```

### Level-Based Content
```javascript
// GET /api/content/kanji?jlpt_level=3 - Get kanji for N3
// GET /api/content/words?jlpt_level=3 - Get words for N3
// GET /api/jlpt/practice?level=3 - Get N3 practice questions
```

## Usage Examples

### 1. Get User's Current Level
```sql
-- Get user's current JLPT level
SELECT u.display_name, us.current_jlpt_level, us.jlpt_level_assessed_at
FROM users u
JOIN user_settings us ON u.id = us.user_id
WHERE u.id = $1;
```

### 2. Auto-Assess User Level
```sql
-- Automatically assess and update user's JLPT level
SELECT update_user_jlpt_level($1, NULL, 'automatic');
```

### 3. Get Level-Appropriate Content
```sql
-- Get kanji appropriate for user's level
SELECT k.* FROM kanji k
JOIN user_settings us ON us.user_id = $1
WHERE k.jlpt <= us.current_jlpt_level
ORDER BY k.frequency;
```

### 4. Track Level Progression
```sql
-- Get user's level progression over time
SELECT 
    jlpt_level,
    assessment_date,
    assessment_method,
    confidence_score
FROM user_jlpt_level_history
WHERE user_id = $1
ORDER BY assessment_date DESC;
```

## Business Logic

### Level Assessment Criteria
1. **N5 (Beginner)**: 60% accuracy on N5 questions
2. **N4 (Elementary)**: 70% accuracy on N4 questions
3. **N3 (Intermediate)**: 75% accuracy on N3 questions
4. **N2 (Pre-Advanced)**: 80% accuracy on N2 questions
5. **N1 (Advanced)**: 85% accuracy on N1 questions

### Content Filtering
- **Current Level**: Show content at user's level
- **Review Content**: Show content from previous levels
- **Challenge Content**: Show content from next level
- **Progressive Learning**: Gradually increase difficulty

### Level Progression Triggers
- **Automatic**: Based on performance thresholds
- **Manual**: User self-assessment
- **Exam Results**: Official JLPT scores
- **Teacher Assessment**: Instructor evaluation

## Benefits

### For Users:
- **Personalized Content**: See appropriate difficulty level
- **Clear Progress**: Understand current level and goals
- **Motivation**: Visual progression tracking
- **Efficient Learning**: Focus on relevant content

### For System:
- **Better Recommendations**: Level-appropriate suggestions
- **Improved Analytics**: Level-based performance tracking
- **Content Optimization**: Level-specific content delivery
- **User Engagement**: Clear learning milestones

## Implementation Steps

1. **Add Database Fields**: Update `user_settings` table
2. **Create History Table**: Track level progression
3. **Implement Assessment**: Automatic level calculation
4. **Update Content Queries**: Filter by user level
5. **Add API Endpoints**: Level management endpoints
6. **Update UI**: Show current level and progression
7. **Test and Validate**: Ensure accurate assessments

This system provides a complete JLPT level tracking solution that enhances the learning experience and enables better content personalization. 