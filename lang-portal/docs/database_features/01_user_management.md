# User Management Features

## Overview
Complete user account management system with authentication, roles, settings, and subscription tracking.

## Core Tables
- `users` - Main user accounts
- `roles` - System roles (admin, teacher, student)
- `user_roles` - Many-to-many user-role relationships
- `user_settings` - User preferences and study settings
- `subscriptions` - Stripe subscription management

## Key Features

### 1. User Authentication
```sql
-- Create new user
INSERT INTO users (clerk_id, email, display_name) 
VALUES ($1, $2, $3);

-- Get user by Clerk ID
SELECT * FROM users WHERE clerk_id = $1;

-- Update user profile
UPDATE users SET display_name = $1, email = $2 WHERE id = $3;
```

### 2. Role-Based Access Control
```sql
-- Assign role to user
INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2);

-- Get user roles
SELECT r.role_name 
FROM user_roles ur 
JOIN roles r ON ur.role_id = r.id 
WHERE ur.user_id = $1;

-- Check if user has specific role
SELECT EXISTS(
    SELECT 1 FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE ur.user_id = $1 AND r.role_name = $2
);
```

### 3. User Settings Management
```sql
-- Get user settings
SELECT * FROM user_settings WHERE user_id = $1;

-- Update study preferences
UPDATE user_settings SET 
    hide_english = $1,
    daily_review_target = $2,
    ui_language = $3,
    timezone = $4
WHERE user_id = $5;

-- Reset SRS progress
UPDATE user_settings SET srs_reset_at = NOW() WHERE user_id = $1;
```

### 4. Subscription Management
```sql
-- Create subscription
INSERT INTO subscriptions (user_id, stripe_subscription_id, status, current_period_end)
VALUES ($1, $2, $3, $4);

-- Check active subscription
SELECT * FROM subscriptions 
WHERE user_id = $1 AND status = 'active' AND current_period_end > NOW();

-- Update subscription status
UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2;
```

## API Endpoints (Example)

### User Profile
```javascript
// GET /api/users/profile
// POST /api/users/profile (update)
// GET /api/users/settings
// PUT /api/users/settings
```

### Authentication
```javascript
// POST /api/auth/login
// POST /api/auth/logout
// GET /api/auth/me
```

### Subscriptions
```javascript
// GET /api/subscriptions/status
// POST /api/subscriptions/create
// POST /api/subscriptions/cancel
```

## Business Logic

### User Registration Flow
1. User signs up via Clerk
2. Create user record in database
3. Assign default role (student)
4. Initialize user settings
5. Create free trial subscription

### Role Permissions
- **Admin**: Full system access, user management
- **Teacher**: Content creation, student progress viewing
- **Student**: Learning features, progress tracking

### Settings Impact
- `hide_english`: Controls UI display of English translations
- `daily_review_target`: Sets SRS algorithm parameters
- `ui_language`: Determines interface language
- `timezone`: Affects study session timing

## Security Considerations
- All user data encrypted at rest
- Role-based access control on all endpoints
- Subscription status validation for premium features
- Audit logging for user actions 