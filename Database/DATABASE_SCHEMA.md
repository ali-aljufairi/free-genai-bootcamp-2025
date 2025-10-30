# Sorami Language Learning Platform - Database Schema Documentation

## Overview

The Sorami language learning platform uses PostgreSQL 16+ with a comprehensive schema designed to support Japanese language learning, including JLPT exam preparation, kanji study, vocabulary building, and grammar practice. The database handles 507MB of JSON data efficiently while preserving existing functionality.

## Key Features

- **Complete JLPT Question Support**: Type-specific tables for grammar, listening, reading, and vocabulary questions
- **Enhanced Kanji Data**: Stroke SVG information and comprehensive metadata
- **Hierarchical Unit Organization**: Using PostgreSQL's `ltree` extension
- **Full-Text Search**: Using `pg_trgm` extension for efficient text search
- **Data Integrity**: Comprehensive constraints and validation
- **Performance Optimized**: Strategic indexing for fast queries

## Table Categories

### 1. User Management & Authentication
### 2. Core Content (Kanji, Words, Grammar)
### 3. JLPT Questions & Exam Preparation
### 4. Course Structure & Organization
### 5. Study Progress & Spaced Repetition
### 6. Interactive Features (Chat, Shadowing, Stroke Order)
### 7. Content Relationships & Grouping

---

## 1. User Management & Authentication

### `users`
**Purpose**: Core user accounts linked to Clerk authentication
```sql
- id: BIGSERIAL PRIMARY KEY
- clerk_id: UUID NOT NULL UNIQUE (Clerk authentication ID)
- email: TEXT NOT NULL
- display_name: TEXT
- stripe_customer_id: TEXT UNIQUE (Stripe billing integration)
- created_at: TIMESTAMPTZ DEFAULT now()
```

### `roles`
**Purpose**: System roles for RBAC (Role-Based Access Control)
```sql
- id: SERIAL PRIMARY KEY
- role_name: role_enum ('admin', 'teacher', 'student')
```

### `user_roles`
**Purpose**: Many-to-many relationship between users and roles
```sql
- user_id: BIGINT REFERENCES users(id)
- role_id: INT REFERENCES roles(id)
- PRIMARY KEY (user_id, role_id)
```

### `user_settings`
**Purpose**: User preferences and study settings
```sql
- user_id: BIGINT PRIMARY KEY REFERENCES users(id)
- hide_english: BOOLEAN DEFAULT FALSE
- srs_reset_at: TIMESTAMPTZ
- ui_language: TEXT DEFAULT 'en'
- timezone: TEXT DEFAULT 'UTC'
- daily_review_target: INT DEFAULT 20
```

### `subscriptions`
**Purpose**: Stripe subscription management
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: BIGINT REFERENCES users(id)
- stripe_subscription_id: TEXT UNIQUE
- status: TEXT (active, past_due, canceled, etc.)
- current_period_end: TIMESTAMPTZ
- created_at: TIMESTAMPTZ DEFAULT now()
```

---

## 2. Core Content Tables

### `kanji`
**Purpose**: Japanese kanji characters with comprehensive metadata
```sql
- id: SERIAL PRIMARY KEY
- character: TEXT UNIQUE NOT NULL (single kanji character)
- heisig_en: TEXT (Heisig English keyword)
- meanings: TEXT[] (array of meanings)
- detail: TEXT (detailed description)
- unicode: TEXT UNIQUE NOT NULL
- onyomi: TEXT (Chinese readings)
- kunyomi: TEXT (Japanese readings)
- jlpt: INT (JLPT level 0-5, NULL if not in JLPT)
- frequency: INT (frequency ranking)
- components: TEXT (component breakdown)
- stroke_count: INT
- strokes_svg: TEXT (SVG stroke order data)
```

**Current Data**: 12,328 kanji imported

### `words`
**Purpose**: Japanese vocabulary words with readings and meanings
```sql
- id: SERIAL PRIMARY KEY
- kana: TEXT NOT NULL (hiragana/katakana reading)
- kanji: TEXT (kanji writing if applicable)
- romaji: TEXT NOT NULL (romanized reading)
- english: TEXT NOT NULL (English meaning)
- part_of_speech: pos_enum NOT NULL
- jlpt: INT (JLPT level 1-5)
- level: INT DEFAULT 5
- correct_count: INT DEFAULT 0
- audio_path: TEXT (future audio file path)
- embedding: VECTOR(384) (future AI embeddings)
- raw_data: JSONB (complete original JSON)
```

**Current Data**: 9,362 words imported

### `grammar_points`
**Purpose**: Japanese grammar patterns and structures
```sql
- id: SERIAL PRIMARY KEY
- key: TEXT NOT NULL (unique grammar identifier)
- base_form: TEXT NOT NULL (base grammar form)
- level: TEXT NOT NULL ('N5', 'N4', 'N3', 'N2', 'N1')
- structure: TEXT (grammar structure pattern)
- created_at: TIMESTAMPTZ DEFAULT now()
```

**Current Data**: 909 grammar points imported

### `grammar_readings`
**Purpose**: Furigana readings for grammar points
```sql
- id: SERIAL PRIMARY KEY
- grammar_id: INTEGER REFERENCES grammar_points(id)
- kanji: TEXT NOT NULL
- reading: TEXT NOT NULL
- position: INTEGER NOT NULL
- UNIQUE (grammar_id, kanji, position)
```

**Current Data**: 20,644 grammar readings imported

### `grammar_examples`
**Purpose**: Example sentences for grammar points
```sql
- id: SERIAL PRIMARY KEY
- grammar_id: INTEGER REFERENCES grammar_points(id)
- japanese: TEXT NOT NULL
- english: TEXT NOT NULL
```

### `grammar_details`
**Purpose**: Detailed explanations for grammar points
```sql
- id: SERIAL PRIMARY KEY
- grammar_id: INTEGER REFERENCES grammar_points(id)
- meaning: TEXT
- notes: TEXT
- caution: TEXT
- fun_fact: TEXT
- UNIQUE (grammar_id)
```

### `grammar_relations`
**Purpose**: Relationships between grammar points
```sql
- id: SERIAL PRIMARY KEY
- grammar_id: INTEGER REFERENCES grammar_points(id)
- related_grammar_id: INTEGER REFERENCES grammar_points(id)
- relation_type: TEXT ('synonym', 'similar', 'opposite', 'related')
- UNIQUE (grammar_id, related_grammar_id, relation_type)
```

### `sentences`
**Purpose**: Example sentences for study and practice
```sql
- id: SERIAL PRIMARY KEY
- japanese: TEXT NOT NULL
- english: TEXT
- source: TEXT
- embedding: VECTOR(384) (future AI embeddings)
```

**Current Data**: 22,966 sentences imported

---

## 3. JLPT Questions & Exam Preparation

### `jlpt_questions`
**Purpose**: Base table for all JLPT exam questions
```sql
- id: BIGSERIAL PRIMARY KEY
- original_id: INT NOT NULL UNIQUE (original JSON question ID)
- title: TEXT NOT NULL (question title/instructions)
- title_trans: TEXT (translated title)
- level: INT NOT NULL (JLPT level 1-5)
- level_of_difficult: INT (difficulty level)
- tag: TEXT ('grammar', 'listen', 'read', 'word')
- score: INT (question score)
- kind: TEXT NOT NULL (question type string)
- correct_answers: INT[] (array of correct answer indices)
- check_explain: INT (explanation flag)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- raw_data: JSONB NOT NULL (complete original JSON)
```

**Current Data**: 19,284 questions imported

### `jlpt_grammar_questions`
**Purpose**: Grammar-specific JLPT questions
```sql
- id: BIGSERIAL PRIMARY KEY
- question_id: BIGINT UNIQUE REFERENCES jlpt_questions(id)
- question_type: grammar_question_type_enum
- question_html: TEXT (HTML question content)
- question_text: TEXT (plain text question)
- image_url: TEXT
- answers: JSONB NOT NULL (answer options)
- correct_answer_index: INT NOT NULL
- explanation: TEXT
- explanations: JSONB (multilingual explanations)
```

**Current Data**: 7,137 grammar questions imported

### `jlpt_listening_questions`
**Purpose**: Audio-based JLPT questions
```sql
- id: BIGSERIAL PRIMARY KEY
- question_id: BIGINT UNIQUE REFERENCES jlpt_questions(id)
- question_type: listening_question_type_enum
- question_html: TEXT
- question_text: TEXT
- audio_url: TEXT
- audio_duration: NUMERIC(8,3) (seconds)
- image_url: TEXT
- transcript: TEXT (audio transcript)
- answers: JSONB NOT NULL
- correct_answer_index: INT NOT NULL
- explanation: TEXT
- explanations: JSONB
```

**Current Data**: 3,926 listening questions imported

### `jlpt_reading_questions`
**Purpose**: Text-based JLPT questions
```sql
- id: BIGSERIAL PRIMARY KEY
- question_id: BIGINT UNIQUE REFERENCES jlpt_questions(id)
- question_type: reading_question_type_enum
- question_html: TEXT
- question_text: TEXT
- passage: TEXT (reading passage)
- image_url: TEXT
- answers: JSONB NOT NULL
- correct_answer_index: INT NOT NULL
- explanation: TEXT
- explanations: JSONB
```

**Current Data**: 1,618 reading questions imported

### `jlpt_word_questions`
**Purpose**: Vocabulary-based JLPT questions
```sql
- id: BIGSERIAL PRIMARY KEY
- question_id: BIGINT UNIQUE REFERENCES jlpt_questions(id)
- question_type: word_question_type_enum
- question_html: TEXT
- question_text: TEXT
- image_url: TEXT
- answers: JSONB NOT NULL
- correct_answer_index: INT NOT NULL
- explanation: TEXT
- explanations: JSONB
```

**Current Data**: 6,603 word questions imported

### `jlpt_question_texts`
**Purpose**: Multilingual text content for questions
```sql
- id: BIGSERIAL PRIMARY KEY
- question_id: BIGINT REFERENCES jlpt_questions(id)
- language_code: TEXT NOT NULL (ISO language code)
- text_type: TEXT NOT NULL (reading_passage, general_text, etc.)
- content: TEXT NOT NULL
- UNIQUE (question_id, language_code, text_type)
```

---

## 4. Course Structure & Organization

### `courses`
**Purpose**: Course/book sets for organized learning
```sql
- id: SERIAL PRIMARY KEY
- name: TEXT NOT NULL (course name + level)
- description: TEXT
- level: TEXT (course level)
- total_words: INT (total vocabulary in course)
- version: INT (course version)
```

**Current Data**: 11 courses imported

### `units`
**Purpose**: Hierarchical unit organization within courses
```sql
- id: SERIAL PRIMARY KEY
- course_id: INT REFERENCES courses(id)
- path: LTREE NOT NULL (hierarchical path)
- title: TEXT NOT NULL (unit title)
- description: TEXT
- total_words: INT (vocabulary in unit)
```

**Current Data**: 523 units imported

### `unit_items`
**Purpose**: Content items within units (words, kanji, grammar, sentences)
```sql
- unit_id: INT REFERENCES units(id)
- item_type: unit_item_enum ('word', 'kanji', 'grammar', 'sentence')
- item_id: INT NOT NULL
- position: INT
- PRIMARY KEY (unit_id, item_type, item_id)
```

**Current Data**: 14,452 unit-item relationships imported

### `groups`
**Purpose**: Global content grouping system with user ownership support
```sql
- id: SERIAL PRIMARY KEY
- name: TEXT UNIQUE NOT NULL
- description: TEXT
- user_id: INTEGER REFERENCES users(id) ON DELETE CASCADE (NULL for system groups)
- created_at: TIMESTAMP DEFAULT NOW()
```

**Notes**:
- System-generated groups have `user_id = NULL`
- User-created groups have `user_id` set to the owner's ID
- Groups are system-generated if `user_id IS NULL`

### `word_groups`
**Purpose**: Many-to-many relationship between words and groups
```sql
- word_id: INT REFERENCES words(id)
- group_id: INT REFERENCES groups(id)
- PRIMARY KEY (word_id, group_id)
```

### `kanji_groups`
**Purpose**: Many-to-many relationship between kanji and groups
```sql
- kanji_id: INT REFERENCES kanji(id)
- group_id: INT REFERENCES groups(id)
- PRIMARY KEY (kanji_id, group_id)
```

### `study_groups`
**Purpose**: User-created study groups
```sql
- id: SERIAL PRIMARY KEY
- owner_id: BIGINT REFERENCES users(id)
- name: TEXT NOT NULL
- description: TEXT
- is_public: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMPTZ DEFAULT now()
```

### `study_group_words`
**Purpose**: Words within user study groups
```sql
- group_id: INT REFERENCES study_groups(id)
- word_id: INT REFERENCES words(id)
- position: INT
- PRIMARY KEY (group_id, word_id)
```

### `word_tags`
**Purpose**: Tagging system for words
```sql
- word_id: INT REFERENCES words(id)
- tag: TEXT NOT NULL
- PRIMARY KEY (word_id, tag)
```

---

## 5. Study Progress & Spaced Repetition

### `study_activities`
**Purpose**: Available study activity types
```sql
- id: SERIAL PRIMARY KEY
- name: TEXT NOT NULL
- activity_type: activity_enum
- created_at: TIMESTAMPTZ DEFAULT now()
```

### `study_sessions`
**Purpose**: User study sessions
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: BIGINT REFERENCES users(id)
- activity_id: INT REFERENCES study_activities(id)
- unit_id: INT REFERENCES units(id)
- created_at: TIMESTAMPTZ DEFAULT now()
```

### `review_items`
**Purpose**: Individual items reviewed in study sessions
```sql
- session_id: BIGINT REFERENCES study_sessions(id)
- item_type: review_item_enum ('word', 'kanji', 'grammar', 'sentence')
- item_id: INT NOT NULL
- correct: BOOLEAN
- created_at: TIMESTAMPTZ DEFAULT now()
- PRIMARY KEY (session_id, item_type, item_id)
```

### `progress`
**Purpose**: Spaced repetition progress tracking
```sql
- user_id: BIGINT REFERENCES users(id)
- item_type: review_item_enum NOT NULL
- item_id: INT NOT NULL
- seen_cnt: INT DEFAULT 0 (total attempts)
- correct_cnt: INT DEFAULT 0 (total correct)
- incorrect_cnt: INT GENERATED ALWAYS AS (seen_cnt - correct_cnt) STORED
- last_seen: TIMESTAMPTZ
- next_due: TIMESTAMPTZ
- PRIMARY KEY (user_id, item_type, item_id)
```

---

## 6. Interactive Features

### `shadow_attempts`
**Purpose**: Speech shadowing practice attempts
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: BIGINT REFERENCES users(id)
- sentence_id: INT REFERENCES sentences(id)
- audio_path: TEXT
- accuracy: NUMERIC(5,2)
- created_at: TIMESTAMPTZ DEFAULT now()
```

### `kanji_traces`
**Purpose**: Kanji stroke order practice attempts
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: BIGINT REFERENCES users(id)
- kanji_id: INT REFERENCES kanji(id)
- trace_svg: TEXT (user's stroke trace)
- accuracy: NUMERIC(5,2)
- created_at: TIMESTAMPTZ DEFAULT now()
```

### `chat_sessions`
**Purpose**: AI chat conversation sessions
```sql
- id: BIGSERIAL PRIMARY KEY
- user_id: BIGINT REFERENCES users(id)
- started_at: TIMESTAMPTZ DEFAULT now()
- context: TEXT
```

### `chat_messages`
**Purpose**: Individual messages within chat sessions
```sql
- id: BIGSERIAL PRIMARY KEY
- session_id: BIGINT REFERENCES chat_sessions(id)
- sender: TEXT NOT NULL ('user', 'assistant')
- message: TEXT NOT NULL
- created_at: TIMESTAMPTZ DEFAULT now()
```

---

## 7. Content Relationships & Utilities

### `item_relations`
**Purpose**: Graph-like relationships between content items
```sql
- id: BIGSERIAL PRIMARY KEY
- from_type: TEXT NOT NULL
- from_id: INT NOT NULL
- rel_type: relation_enum NOT NULL
- to_type: TEXT NOT NULL
- to_id: INT NOT NULL
- position: INT
- UNIQUE (from_type, from_id, rel_type, to_type, to_id)
```

### `json_import`
**Purpose**: Temporary table for JSON import operations
```sql
- id: SERIAL PRIMARY KEY
- data: JSONB NOT NULL
- created_at: TIMESTAMPTZ DEFAULT now()
```

---

## Data Import Summary

### Successfully Imported Content:
- **Kanji**: 12,328 characters with stroke datak
- **Words**: 9,362 vocabulary items
- **Grammar Points**: 909 grammar patterns
- **Grammar Readings**: 20,644 furigana readings
- **Example Sentences**: 22,966 sentences
- **JLPT Questions**: 19,284 total questions
  - Grammar: 7,137 questions
  - Listening: 3,926 questions
  - Reading: 1,618 questions
  - Vocabulary: 6,603 questions
- **Course Structure**: 11 courses, 523 units, 14,452 unit-item relationships

### JLPT Level Distribution:
- **N1**: 2,933 questions
- **N2**: 5,237 questions
- **N3**: 3,949 questions
- **N4**: 3,704 questions
- **N5**: 3,461 questions

---

## Key Relationships

1. **Users → Study Sessions → Review Items**: Tracks user learning progress
2. **Courses → Units → Unit Items**: Hierarchical course organization
3. **JLPT Questions → Type-Specific Tables**: Polymorphic question structure
4. **Grammar Points → Grammar Readings/Examples/Details**: Comprehensive grammar data
5. **Words/Kanji → Groups**: Flexible content organization
6. **Progress Table**: Spaced repetition algorithm data

---

## Performance Optimizations

- **GIN Indexes**: Full-text search on words (kana, romaji, english)
- **GiST Index**: Hierarchical unit paths using ltree
- **Strategic Indexes**: JLPT levels, question types, user progress
- **JSONB Indexes**: Efficient JSON operations during import
- **Composite Indexes**: Optimized for common query patterns

---

## Future Enhancements

- **Vector Embeddings**: AI-powered content recommendations
- **Audio Integration**: Speech recognition and pronunciation feedback
- **Advanced Analytics**: Learning pattern analysis and insights
- **Social Features**: Study groups and collaborative learning
- **Mobile Optimization**: Offline study capabilities 