-- +goose Up
-- +goose StatementBegin
/*
 * Daily Mission Lab foundation:
 * - Per-user lab/variant preferences
 * - Per-user mission task definitions
 * - Event stream for mission analytics and weak-signal activity completion
 */

CREATE TABLE daily_mission_configs (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    active_variant TEXT NOT NULL DEFAULT 'mission' CHECK (active_variant IN ('mission', 'planner', 'analytics')),
    motivation_mode TEXT NOT NULL DEFAULT 'consistency_small_wins',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_mission_tasks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_key TEXT NOT NULL CHECK (
        activity_key IN (
            'kanji',
            'vocabulary_review',
            'speaking_conversation',
            'grammar',
            'reading',
            'word_builder',
            'writing',
            'learning_resources',
            'speech',
            'companion',
            'chat'
        )
    ),
    target_mode TEXT NOT NULL DEFAULT 'sessions' CHECK (target_mode IN ('sessions', 'items')),
    target_value INT NOT NULL DEFAULT 1 CHECK (target_value BETWEEN 1 AND 200),
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, activity_key)
);

CREATE TABLE daily_mission_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_key TEXT NOT NULL CHECK (
        activity_key IN (
            'kanji',
            'vocabulary_review',
            'speaking_conversation',
            'grammar',
            'reading',
            'word_builder',
            'writing',
            'learning_resources',
            'speech',
            'companion',
            'chat',
            'dashboard_lab'
        )
    ),
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'variant_opened',
            'task_started',
            'task_completed',
            'mission_completed',
            'return_next_day',
            'activity_logged'
        )
    ),
    value INT NOT NULL DEFAULT 1 CHECK (value >= 0),
    session_ref TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_mission_tasks_user_active ON daily_mission_tasks(user_id, is_active, display_order);
CREATE INDEX idx_daily_mission_events_user_time ON daily_mission_events(user_id, occurred_at DESC);
CREATE INDEX idx_daily_mission_events_user_type_time ON daily_mission_events(user_id, event_type, occurred_at DESC);
CREATE INDEX idx_daily_mission_events_user_activity_time ON daily_mission_events(user_id, activity_key, occurred_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS daily_mission_events CASCADE;
DROP TABLE IF EXISTS daily_mission_tasks CASCADE;
DROP TABLE IF EXISTS daily_mission_configs CASCADE;
-- +goose StatementEnd
