-- +goose Up
-- +goose StatementBegin
/* 3. CORE CONTENT ---------------------------------------------------- */
CREATE TABLE kanji (
    id SERIAL PRIMARY KEY,
    character TEXT UNIQUE NOT NULL CHECK (char_length(character) = 1),
    heisig_en TEXT,
    meanings JSONB, -- Store as JSON array for better GORM compatibility
    detail TEXT,
    unicode TEXT UNIQUE NOT NULL,
    onyomi TEXT,
    kunyomi TEXT,
    jlpt INT,
    frequency INT,
    components TEXT,
    stroke_count INT,
    strokes_svg TEXT, -- From kanji_svg_strokes.json "strokes_svg"
    audio_path TEXT -- Audio URL from Jisho
);

CREATE TABLE words (
    id SERIAL PRIMARY KEY,
    kana TEXT, -- From javi_cleaned.json "phonetic" (can be NULL)
    kanji TEXT, -- From javi_cleaned.json "word"  
    romaji TEXT, -- From javi_cleaned.json "phonetic" (can be NULL - no actual romaji data available)
    english TEXT NOT NULL, -- From javi_cleaned.json "short_mean" (joined)
    part_of_speech pos_enum NOT NULL, -- From javi_cleaned.json "part_of_speech" (defaults to unclassified)
    jlpt INT, -- From javi_cleaned.json "level" (mapped N1-N5 to 1-5, 0 = no level)
    level INT DEFAULT 0, -- 0 = no level, 1-5 = JLPT N1-N5
    correct_count INT DEFAULT 0, -- Preserved from SQLite
    audio_path TEXT, -- Future use
    embedding VECTOR (384), -- Future use
    raw_data JSONB -- Complete original JSON for complex fields
);

-- Add constraint for valid JLPT levels (0-5, where 0 = no level)
ALTER TABLE words
ADD CONSTRAINT check_words_jlpt_level CHECK (
    jlpt IS NULL
    OR (
        jlpt >= 0
        AND jlpt <= 5
    )
);

CREATE INDEX idx_words_kana_gin ON words USING gin (kana gin_trgm_ops);

CREATE INDEX idx_words_romaji_gin ON words USING gin (romaji gin_trgm_ops);

CREATE INDEX idx_words_english_gin ON words USING gin (english gin_trgm_ops);

CREATE INDEX idx_words_kanji ON words (kanji);

CREATE TABLE grammar_points (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL,
    base_form TEXT NOT NULL,
    level TEXT NOT NULL CHECK (
        level IN ('N5', 'N4', 'N3', 'N2', 'N1')
    ),
    structure TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE grammar_readings (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    kanji TEXT NOT NULL,
    reading TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (grammar_id, kanji, position)
);

CREATE TABLE grammar_examples (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    japanese TEXT NOT NULL,
    english TEXT NOT NULL
);

CREATE TABLE grammar_details (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    meaning TEXT,
    notes TEXT,
    caution TEXT,
    fun_fact TEXT,
    UNIQUE (grammar_id)
);

CREATE TABLE grammar_relations (
    id SERIAL PRIMARY KEY,
    grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    related_grammar_id INTEGER REFERENCES grammar_points (id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (
        relation_type IN (
            'synonym',
            'similar',
            'opposite',
            'related'
        )
    ),
    UNIQUE (
        grammar_id,
        related_grammar_id,
        relation_type
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_grammar_points_level ON grammar_points (level);

CREATE INDEX idx_grammar_readings_grammar ON grammar_readings (grammar_id);

CREATE INDEX idx_grammar_examples_grammar ON grammar_examples (grammar_id);

CREATE INDEX idx_grammar_details_grammar ON grammar_details (grammar_id);

CREATE INDEX idx_grammar_relations_grammar ON grammar_relations (grammar_id);

CREATE INDEX idx_grammar_relations_related ON grammar_relations (related_grammar_id);

CREATE TABLE sentences (
    id SERIAL PRIMARY KEY,
    japanese TEXT NOT NULL,
    english TEXT,
    source TEXT,
    embedding VECTOR (384)
);

/* 4. CONTENT GROUPS (words & kanji) --------------------------------- */
CREATE TABLE groups ( -- NEW (global group catalogue)
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE word_groups ( -- NEW
    word_id INT REFERENCES words (id) ON DELETE CASCADE,
    group_id INT REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (word_id, group_id)
);

CREATE TABLE kanji_groups ( -- NEW
    kanji_id INT REFERENCES kanji (id) ON DELETE CASCADE,
    group_id INT REFERENCES groups (id) ON DELETE CASCADE,
    PRIMARY KEY (kanji_id, group_id)
);

CREATE TABLE word_tags (
    word_id INT REFERENCES words (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (word_id, tag)
);

CREATE INDEX idx_word_tags_tag ON word_tags (tag);

/* 5. GRAPH RELATIONS ------------------------------------------------- */
CREATE TABLE item_relations (
    id BIGSERIAL PRIMARY KEY,
    from_type TEXT NOT NULL,
    from_id INT NOT NULL,
    rel_type relation_enum NOT NULL,
    to_type TEXT NOT NULL,
    to_id INT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    UNIQUE (
        from_type,
        from_id,
        rel_type,
        to_type,
        to_id,
        position
    )
);

CREATE INDEX idx_rel_from ON item_relations (from_type, from_id);
CREATE INDEX idx_rel_to ON item_relations (to_type, to_id);

/* 6. COURSES, UNITS, TAGS, USER STUDY GROUPS ------------------------ */
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- From book_set.json "name" + "level"
    description TEXT, -- Generated from book_set.json metadata
    level TEXT, -- From book_set.json "level"
    total_words INT, -- From book_set.json "total_word"
    version INT -- From book_set.json "version"
);

CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses (id) ON DELETE CASCADE,
    path LTREE NOT NULL, -- Hierarchical path for unit organization
    title TEXT NOT NULL, -- From book_set_unit_all.json "name"
    description TEXT, -- Generated description
    total_words INT -- From book_set_unit_all.json "total_word"
);

CREATE INDEX idx_units_path_gist ON units USING gist (path);

CREATE TABLE unit_items (
    unit_id INT REFERENCES units (id) ON DELETE CASCADE,
    item_type unit_item_enum NOT NULL,
    item_id INT NOT NULL,
    position INT,
    PRIMARY KEY (unit_id, item_type, item_id)
);

CREATE TABLE study_groups (
    id SERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE study_group_words (
    group_id INT REFERENCES study_groups (id) ON DELETE CASCADE,
    word_id INT REFERENCES words (id) ON DELETE CASCADE,
    position INT,
    PRIMARY KEY (group_id, word_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS study_group_words CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
DROP TABLE IF EXISTS unit_items CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS item_relations CASCADE;
DROP TABLE IF EXISTS word_tags CASCADE;
DROP TABLE IF EXISTS kanji_groups CASCADE;
DROP TABLE IF EXISTS word_groups CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS sentences CASCADE;
DROP TABLE IF EXISTS grammar_relations CASCADE;
DROP TABLE IF EXISTS grammar_details CASCADE;
DROP TABLE IF EXISTS grammar_examples CASCADE;
DROP TABLE IF EXISTS grammar_readings CASCADE;
DROP TABLE IF EXISTS grammar_points CASCADE;
DROP TABLE IF EXISTS words CASCADE;
DROP TABLE IF EXISTS kanji CASCADE;
-- +goose StatementEnd
