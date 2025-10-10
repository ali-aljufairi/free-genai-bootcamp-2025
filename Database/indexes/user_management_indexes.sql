-- Clerk-related indexes and constraints
-- Ensure clerk_id lookups are fast
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);

-- User Management Indexes for Sorami Language Portal
-- This script adds missing indexes for efficient user queries

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_jlpt_level ON user_settings (current_jlpt_level);

CREATE INDEX IF NOT EXISTS idx_user_settings_assessed_at ON user_settings (jlpt_level_assessed_at);

CREATE INDEX IF NOT EXISTS idx_user_settings_ui_language ON user_settings (ui_language);

CREATE INDEX IF NOT EXISTS idx_user_settings_timezone ON user_settings (timezone);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions (current_period_end);

CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions (created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_settings_jlpt_assessment ON user_settings (
    current_jlpt_level,
    jlpt_level_assessed_at
);