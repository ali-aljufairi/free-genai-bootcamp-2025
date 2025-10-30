# Authentication Flow Architecture

## Overview

Sorami uses a **Bearer token-based authentication flow** that prevents 431 errors (Request Header Fields Too Large) by avoiding large cookie headers. The system uses Clerk for authentication with a compact token forwarding mechanism.

## Architecture Flow

```
[Browser Client]
    ↓ (credentials: 'omit' - no cookies)
    ↓ (Authorization: Bearer <Clerk token>)
[Next.js API Proxy] (/api/langportal/[...path]/route.ts)
    ↓ (strips cookies/large headers)
    ↓ (forwards compact Bearer token)
[Go Backend] (/api/langportal/*)
    ↓ (validates JWT)
    ↓ (sets user context)
[Go Handlers]
```

## Key Components

### 1. Frontend Client (`frontend/services/api.ts`)

**Purpose**: Prevents 431 errors by using `credentials: 'omit'` and attaching compact Bearer tokens.

**Implementation**:
```typescript
async function fetchData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Attach Clerk token if available (browser only)
  if (typeof window !== 'undefined') {
    try {
      const clerk: any = (window as any).Clerk;
      const session = clerk?.session;
      if (session && typeof session.getToken === 'function') {
        const token = await session.getToken();
        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch {}
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'omit',  // Prevent cookies (avoids 431)
    cache: 'no-store',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
}
```

**Key Features**:
- ✅ `credentials: 'omit'` prevents browser from sending cookies
- ✅ Attaches compact Clerk Bearer token when available
- ✅ No large headers sent to Next.js API

### 2. Next.js API Proxy (`frontend/app/api/langportal/[...path]/route.ts`)

**Purpose**: Forwards requests to Go backend with compact auth headers only.

**Implementation**:
```typescript
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const subPath = '/' + (params.path?.join('/') || '')
  return proxyToBackend(request, {
    backendPath: `/api/langportal${subPath}${request.nextUrl.search}`,
    method: 'GET',
  })
}
```

**Proxy Function** (`frontend/lib/api-proxy.ts`):
- Strips cookies and large headers (`x-nextjs-*`, `x-vercel-*`, `baggage`, `sentry-trace`)
- Only forwards: `Authorization`, `Content-Type`, essential headers
- Uses Clerk server SDK to get compact token if needed
- Returns 401 if no valid auth token

### 3. Middleware Exception (`frontend/middleware.ts`)

**Purpose**: Allows API routes to bypass Clerk cookie-based redirects.

**Implementation**:
```typescript
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/health',
  // Allow API proxy routes - they use Bearer tokens, not cookies
  '/api/langportal(.*)'
]);
```

**Why**: 
- Prevents 307 redirects to `/sign-in` when cookies aren't sent
- API routes authenticate via Bearer tokens, not cookies
- Middleware still protects pages (not API routes)

### 4. Go Backend Auth Middleware (`internal/server/auth_middleware.go`)

**Purpose**: Validates Clerk JWTs and sets user context.

**Implementation**:
- Extracts `Authorization: Bearer <token>` header
- Validates JWT signature using JWKS
- Validates issuer and audience (if configured)
- Maps Clerk user ID to internal user ID
- Sets `c.Locals("user_id")` and `c.Locals("clerk_user_id")`

**Security**:
- ✅ Only accepts Bearer tokens (no cookie parsing)
- ✅ JWT validation with JWKS rotation support
- ✅ Automatic user creation if missing
- ✅ Returns 401 with small headers on failure

## Security Model

### Why This Approach is Secure

1. **No Cookie Exposure**: Cookies never sent to backend, preventing CSRF
2. **Bearer Token Only**: Compact, signed JWT tokens with expiration
3. **Double Validation**: Both Next.js proxy and Go backend validate tokens
4. **No Public Access**: API routes require valid Clerk JWT tokens

### Attack Surface Analysis

**What attackers need**:
- Valid Clerk JWT token with unexpired signature
- Correct issuer and audience claims
- Valid user ID in Clerk

**What attackers cannot do**:
- ❌ Access APIs without valid token (401 Unauthorized)
- ❌ Use stolen cookies (cookies never sent)
- ❌ Replay expired tokens (JWT expiration checked)
- ❌ Bypass middleware (Bearer token required)

## Preventing 431 Errors

### Problem
Large Clerk cookies (session tokens, JWT) caused HTTP 431 errors when sent in headers.

### Solution
1. **Client-side**: `credentials: 'omit'` prevents cookie sending
2. **Proxy-side**: Strips any cookies that might slip through
3. **Token-based**: Uses compact Bearer tokens instead

### Header Size Comparison

**Before (with cookies)**:
```
Cookie: __clerk_db_jwt=... (large) + __session=... (large) + ...
Total: ~2000+ bytes
```

**After (Bearer token only)**:
```
Authorization: Bearer eyJhbGc... (compact JWT)
Total: ~300-500 bytes
```

## Environment Variables

### Frontend
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
GO_BACKEND_URL=http://localhost:8080
```

### Backend
```bash
CLERK_JWKS_URL=https://clerk.your-domain.com/.well-known/jwks.json
CLERK_ISSUER=https://clerk.your-domain.com
CLERK_AUDIENCE=your-audience-claim
```

## Development vs Production

### Development
- Dev fallback user (user_id=1) if token missing
- Detailed logging for debugging
- Less strict validation

### Production
- Strict JWT validation required
- No dev fallbacks
- Minimal logging
- All env vars required

## Testing

### Test Authenticated Request
```bash
# Get token from browser console: await Clerk.session.getToken()
TOKEN="eyJhbGc..."

curl -X GET http://localhost:3000/api/langportal/words \
  -H "Authorization: Bearer $TOKEN"
```

### Test Unauthenticated Request (should fail)
```bash
curl -X GET http://localhost:3000/api/langportal/words
# Returns: 401 Unauthorized
```

## Troubleshooting

### 431 Errors Still Occurring
- ✅ Check `credentials: 'omit'` is set in fetch
- ✅ Verify middleware excludes `/api/langportal(.*)`
- ✅ Check proxy strips cookies

### 401 Errors
- ✅ Verify Clerk token is attached to request
- ✅ Check backend JWKS URL is correct
- ✅ Validate issuer/audience match Clerk dashboard

### 307 Redirects to /sign-in
- ✅ Ensure middleware excludes API routes
- ✅ Check route matches `/api/langportal(.*)` pattern

## Related Documentation

- [Clerk Setup Guide](./clerk-setup.md) - Complete Clerk configuration
- [API Proxy Implementation](../../frontend/lib/api-proxy.ts) - Proxy code reference
- [Backend Auth Middleware](../../internal/server/auth_middleware.go) - Go middleware code

