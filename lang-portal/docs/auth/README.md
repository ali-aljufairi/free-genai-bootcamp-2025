# Authentication Documentation

This directory contains documentation for Sorami's authentication system.

## Documents

- **[Authentication Flow](./authentication-flow.md)** - Complete architecture overview of the Bearer token-based auth system
- **[Clerk Setup Guide](./clerk-setup.md)** - Step-by-step Clerk configuration and setup

## Quick Reference

### Frontend Auth Flow
1. Browser attaches compact Clerk Bearer token to requests
2. Next.js proxy strips cookies and forwards Bearer token
3. Go backend validates JWT and sets user context

### Key Files
- `frontend/services/api.ts` - Client-side fetch with `credentials: 'omit'`
- `frontend/lib/api-proxy.ts` - Next.js proxy that strips cookies
- `frontend/middleware.ts` - Excludes API routes from Clerk redirects
- `internal/server/auth_middleware.go` - Go JWT validation middleware

### Security
- ✅ Bearer tokens only (no cookies)
- ✅ Double validation (proxy + backend)
- ✅ Prevents 431 errors
- ✅ CSRF protection (no cookies)

