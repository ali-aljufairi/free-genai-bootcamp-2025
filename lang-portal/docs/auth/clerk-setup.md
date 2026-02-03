# Clerk Authentication Setup Guide

This guide covers the complete setup for Clerk authentication in the Sorami language learning platform.

## Architecture Overview

```
[Browser] → [Next.js API Proxy] → [Go Backend]
     ↓              ↓                    ↓
Bearer Token    Bearer Token      JWT Verification
(no cookies)    (stripped)        + User Mapping
```

**Note**: Uses Bearer tokens only (no cookies) to prevent HTTP 431 errors. See [Authentication Flow](./authentication-flow.md) for details.

## Environment Variables

### Frontend (Next.js) Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend URL
GO_BACKEND_URL=http://localhost:8080

# Environment
NEXT_PUBLIC_APP_ENV=development
```

### Backend (Go) Environment Variables

Create a `.env` file in the root directory:

```bash
# Clerk JWT Configuration
CLERK_JWKS_URL=https://clerk.your-domain.com/.well-known/jwks.json
CLERK_ISSUER=https://clerk.your-domain.com
CLERK_AUDIENCE=your-audience-claim

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=sorami

# Environment
APP_ENV=development
ALLOW_DEV_FALLBACK_USER=0
```

## Local Dev (No Fallback)

For local development, **do not rely on the fallback user**. Instead, use a dedicated Clerk **development** app and real JWTs.

### Required Clerk Dev App Settings

1. **Create a separate Clerk app** for development.
2. **JWT Template** (Dashboard → JWT Templates):
   - **Template Name**: `sorami-backend`
   - **Subject**: `{{user.id}}`
   - **Issuer**: `https://clerk.your-dev-domain.com`
   - **Audience**: `your-audience-claim`
   - **Expiration**: `1 hour`
3. **Allowed Origins**: add `http://localhost:3000`

### Example Backend Env (Dev)

```bash
CLERK_ISSUER=https://clerk.your-dev-domain.com
CLERK_JWKS_URL=https://clerk.your-dev-domain.com/.well-known/jwks.json
CLERK_AUDIENCE=your-audience-claim
CLERK_SECRET_KEY=sk_test_...
ALLOW_DEV_FALLBACK_USER=0
```

## Clerk Dashboard Configuration

### 1. Create a Clerk Application

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Note your **Publishable Key** and **Secret Key**

### 2. Configure JWT Templates

In your Clerk dashboard:

1. Go to **JWT Templates**
2. Create a new template with these settings:
   - **Template Name**: `sorami-backend`
   - **Subject**: `{{user.id}}`
   - **Issuer**: `https://clerk.your-domain.com`
   - **Audience**: `your-audience-claim`
   - **Expiration**: `1 hour`

### 3. Configure Allowed Origins

In your Clerk dashboard:

1. Go to **Settings** → **Domains**
2. Add your development domain: `http://localhost:3000`
3. Add your production domain: `https://your-domain.com`

## Database Setup

### User Table Schema

Ensure your PostgreSQL database has a `users` table with a `clerk_id` column:

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT,
    username TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
```

## Security Best Practices

### 1. JWT Validation

The Go backend validates JWTs with:
- **Signature verification** using JWKS
- **Issuer validation** (if configured)
- **Audience validation** (if configured)
- **Expiration checking**

### 2. Environment Security

- Never commit `.env` files to version control
- Use different keys for development and production
- Rotate keys regularly
- Use environment-specific configurations

### 3. Error Handling

The system provides structured error responses:

```json
{
  "error": "invalid token issuer",
  "code": "INVALID_ISSUER",
  "success": false
}
```

## Development vs Production

### Development Mode

- Dev fallback user (user_id=1) is enabled
- Less strict JWT validation
- Detailed logging for debugging

### Production Mode

- Strict JWT validation
- No dev fallbacks
- Minimal logging
- All environment variables required

## Testing Authentication

### 1. Test Frontend Authentication

```bash
# Start the frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` and verify:
- Sign-in/sign-up works
- Protected routes redirect to sign-in
- User session persists

### 2. Test Backend Authentication

```bash
# Start the backend
make run
```

Test with curl:

```bash
# Get a token from Clerk (replace with actual token)
TOKEN="your-clerk-jwt-token"

# Test flashcards endpoint (via Next.js proxy)
curl -X POST http://localhost:3000/api/langportal/flashcards/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"flashcard_type": "word", "card_count": 5}'
```

### 3. Test Error Cases

```bash
# Test without token (should return 401)
curl -X POST http://localhost:3000/api/langportal/flashcards/start \
  -H "Content-Type: application/json" \
  -d '{"flashcard_type": "word", "card_count": 5}'

# Test with invalid token (should return 401)
curl -X POST http://localhost:3000/api/langportal/flashcards/start \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"flashcard_type": "word", "card_count": 5}'
```

## Troubleshooting

### Common Issues

1. **"Clerk authentication not configured"**
   - Check environment variables
   - Verify Clerk keys are correct
   - Ensure JWKS URL is accessible

2. **"No internal user mapping found"**
   - User exists in Clerk but not in your database
   - Create user record in database with matching `clerk_id`

3. **"Invalid token issuer/audience"**
   - Check JWT template configuration in Clerk dashboard
   - Verify environment variables match Clerk settings

4. **"JWKS refresh error"**
   - Network connectivity issues
   - Clerk service temporarily unavailable
   - Check firewall/proxy settings

### Debug Mode

Enable debug logging by setting:

```bash
export DEBUG=clerk:*
```

## Performance Considerations

### JWKS Caching

The Go backend caches JWKS keys with:
- **5-minute refresh rate limit**
- **10-second timeout** for refresh requests
- **Automatic background refresh**

### Database Optimization

- Index on `clerk_id` column for fast user lookups
- Consider caching user mappings for high-traffic scenarios

## Monitoring

### Logs to Monitor

1. **Authentication failures**
2. **JWKS refresh errors**
3. **User mapping failures**
4. **Token validation errors**

### Metrics to Track

1. **Authentication success rate**
2. **JWT validation latency**
3. **User mapping hit rate**
4. **Error rates by type**

## Migration from Development to Production

1. **Update environment variables**
2. **Disable dev fallbacks**
3. **Enable strict JWT validation**
4. **Update allowed origins in Clerk**
5. **Test with production keys**
6. **Monitor logs for issues**




