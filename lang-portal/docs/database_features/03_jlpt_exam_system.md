# JLPT Exam System Features

## Overview
Complete JLPT (Japanese Language Proficiency Test) exam preparation system with comprehensive question database, practice tests, and progress tracking.

## Core Tables
- `jlpt_questions` - Base table for all JLPT questions
- `jlpt_grammar_questions` - Grammar-specific questions
- `jlpt_listening_questions` - Audio-based questions
- `jlpt_reading_questions` - Text-based questions
- `jlpt_word_questions` - Vocabulary-based questions
- `jlpt_question_texts` - Multilingual text content

## Key Features

### 1. Question Management
```sql
-- Get questions by JLPT level
SELECT * FROM jlpt_questions WHERE level = $1 ORDER BY level_of_difficult;

-- Get questions by type
SELECT * FROM jlpt_questions WHERE tag = $1 AND kind = $2;

-- Get questions by difficulty
SELECT * FROM jlpt_questions 
WHERE level = $1 AND level_of_difficult BETWEEN $2 AND $3;

-- Get random questions for practice
SELECT * FROM jlpt_questions 
WHERE level = $1 AND tag = $2 
ORDER BY RANDOM() LIMIT $3;
```

### 2. Question Types

#### Grammar Questions
```sql
-- Get grammar questions with answers
SELECT q.*, gq.question_html, gq.answers, gq.correct_answer_index
FROM jlpt_questions q
JOIN jlpt_grammar_questions gq ON q.id = gq.question_id
WHERE q.tag = 'grammar' AND q.level = $1;
```

#### Listening Questions
```sql
-- Get listening questions with audio
SELECT q.*, lq.audio_url, lq.audio_duration, lq.transcript
FROM jlpt_questions q
JOIN jlpt_listening_questions lq ON q.id = lq.question_id
WHERE q.tag = 'listen' AND q.level = $1;
```

#### Reading Questions
```sql
-- Get reading questions with passages
SELECT q.*, rq.passage, rq.question_html
FROM jlpt_questions q
JOIN jlpt_reading_questions rq ON q.id = rq.question_id
WHERE q.tag = 'read' AND q.level = $1;
```

#### Word Questions
```sql
-- Get vocabulary questions
SELECT q.*, wq.question_html, wq.answers
FROM jlpt_questions q
JOIN jlpt_word_questions wq ON q.id = wq.question_id
WHERE q.tag = 'word' AND q.level = $1;
```

### 3. Practice Test Generation
```sql
-- Generate practice test by level and type
WITH grammar_questions AS (
    SELECT q.id FROM jlpt_questions q
    JOIN jlpt_grammar_questions gq ON q.id = gq.question_id
    WHERE q.level = $1 AND q.tag = 'grammar'
    ORDER BY RANDOM() LIMIT 10
),
listening_questions AS (
    SELECT q.id FROM jlpt_questions q
    JOIN jlpt_listening_questions lq ON q.id = lq.question_id
    WHERE q.level = $1 AND q.tag = 'listen'
    ORDER BY RANDOM() LIMIT 10
),
reading_questions AS (
    SELECT q.id FROM jlpt_questions q
    JOIN jlpt_reading_questions rq ON q.id = rq.question_id
    WHERE q.level = $1 AND q.tag = 'read'
    ORDER BY RANDOM() LIMIT 10
),
word_questions AS (
    SELECT q.id FROM jlpt_questions q
    JOIN jlpt_word_questions wq ON q.id = wq.question_id
    WHERE q.level = $1 AND q.tag = 'word'
    ORDER BY RANDOM() LIMIT 10
)
SELECT * FROM (
    SELECT id, 'grammar' as type FROM grammar_questions
    UNION ALL
    SELECT id, 'listening' as type FROM listening_questions
    UNION ALL
    SELECT id, 'reading' as type FROM reading_questions
    UNION ALL
    SELECT id, 'word' as type FROM word_questions
) test_questions;
```

### 4. Question Statistics
```sql
-- Get question distribution by level
SELECT level, COUNT(*) as total_questions,
       COUNT(CASE WHEN tag = 'grammar' THEN 1 END) as grammar,
       COUNT(CASE WHEN tag = 'listen' THEN 1 END) as listening,
       COUNT(CASE WHEN tag = 'read' THEN 1 END) as reading,
       COUNT(CASE WHEN tag = 'word' THEN 1 END) as vocabulary
FROM jlpt_questions
GROUP BY level ORDER BY level;

-- Get difficulty distribution
SELECT level, level_of_difficult, COUNT(*) as count
FROM jlpt_questions
GROUP BY level, level_of_difficult
ORDER BY level, level_of_difficult;
```

### 5. Multilingual Support
```sql
-- Get question texts in different languages
SELECT qt.language_code, qt.content
FROM jlpt_question_texts qt
WHERE qt.question_id = $1 AND qt.text_type = 'reading_passage';
```

## API Endpoints (Example)

### Practice Tests
```javascript
// GET /api/jlpt/practice/:level - Generate practice test
// GET /api/jlpt/questions/:id - Get specific question
// POST /api/jlpt/submit - Submit test answers
// GET /api/jlpt/results/:testId - Get test results
```

### Question Management
```javascript
// GET /api/jlpt/questions - List questions with filters
// GET /api/jlpt/questions/:id/audio - Get audio file
// GET /api/jlpt/questions/:id/explanation - Get explanation
// POST /api/jlpt/questions/search - Search questions
```

### Progress Tracking
```javascript
// GET /api/jlpt/progress/:userId - Get user progress
// GET /api/jlpt/weaknesses/:userId - Get weak areas
// GET /api/jlpt/recommendations/:userId - Get study recommendations
```

## Exam Preparation Features

### 1. Study Recommendations
```sql
-- Get recommended questions based on user performance
SELECT q.* FROM jlpt_questions q
WHERE q.level = $1 
  AND q.id NOT IN (
    SELECT question_id FROM user_question_attempts 
    WHERE user_id = $2 AND correct = true
  )
ORDER BY q.level_of_difficult LIMIT 20;
```

### 2. Weak Area Analysis
```sql
-- Find user's weak areas
SELECT q.tag, q.kind, COUNT(*) as incorrect_attempts
FROM user_question_attempts uqa
JOIN jlpt_questions q ON uqa.question_id = q.id
WHERE uqa.user_id = $1 AND uqa.correct = false
GROUP BY q.tag, q.kind
ORDER BY incorrect_attempts DESC;
```

### 3. Progress Tracking
```sql
-- Get user's JLPT progress by level
SELECT level, 
       COUNT(*) as total_questions,
       COUNT(CASE WHEN correct THEN 1 END) as correct_answers,
       ROUND(COUNT(CASE WHEN correct THEN 1 END)::numeric / COUNT(*) * 100, 2) as accuracy
FROM user_question_attempts uqa
JOIN jlpt_questions q ON uqa.question_id = q.id
WHERE uqa.user_id = $1
GROUP BY level ORDER BY level;
```

## Question Types and Features

### Grammar Questions
- Multiple choice questions
- Sentence completion
- Grammar pattern recognition
- Context-based grammar usage

### Listening Questions
- Audio file support
- Transcripts available
- Multiple choice answers
- Audio duration tracking

### Reading Questions
- Reading passages
- Information search questions
- Long passage comprehension
- Short passage analysis

### Word Questions
- Vocabulary in context
- Kanji reading questions
- Word formation
- Expression usage

## Advanced Features

### 1. Adaptive Testing
- Questions adjust based on user performance
- Difficulty progression
- Personalized question selection

### 2. Time Management
- Question timing tracking
- Section time limits
- Progress indicators

### 3. Detailed Analytics
- Question-by-question analysis
- Time spent per question
- Error pattern analysis
- Improvement tracking

### 4. Mock Exams
- Full-length practice tests
- Realistic exam conditions
- Comprehensive scoring
- Detailed feedback 