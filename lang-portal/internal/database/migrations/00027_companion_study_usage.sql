-- +goose Up
-- +goose StatementBegin
/* Companion Study Usage Tracking ------------------------------------------- */
-- Tracks monthly usage of companion study sessions for subscription limits

CREATE TABLE companion_study_usage (
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    month_year TEXT NOT NULL, -- Format: "2006-01" (YYYY-MM)
    session_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, month_year)
);

CREATE INDEX idx_companion_study_usage_user_month ON companion_study_usage (user_id, month_year);

CREATE INDEX idx_companion_study_usage_month_year ON companion_study_usage (month_year);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS companion_study_usage CASCADE;
-- +goose StatementEnd