-- +goose Up
-- +goose StatementBegin
/* 2. USERS, RBAC, BILLING ------------------------------------------- */
-- Users table integrated with Clerk authentication
-- clerk_id stores Clerk user IDs (format: user_xxxxxxxxxxxxx)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name role_enum UNIQUE NOT NULL
);

INSERT INTO
    roles (role_name)
VALUES ('admin'),
    ('teacher'),
    ('student');

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    role_id INT REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_settings ( -- UPDATED
    user_id BIGINT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    hide_english BOOLEAN DEFAULT FALSE,
    srs_reset_at TIMESTAMPTZ,
    ui_language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    daily_review_target INT DEFAULT 20, -- # of reviews the user aims for
    current_jlpt_level INT DEFAULT 5, -- User's current JLPT level (1-5)
    jlpt_level_assessed_at TIMESTAMPTZ, -- When the level was last assessed
    jlpt_level_assessment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add constraint for valid JLPT levels
ALTER TABLE user_settings
ADD CONSTRAINT check_jlpt_level CHECK (
    current_jlpt_level BETWEEN 1 AND 5
);

CREATE TABLE subscriptions ( -- NEW
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT, -- active, past_due, canceled …
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- +goose StatementEnd

-- +goose Down
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
