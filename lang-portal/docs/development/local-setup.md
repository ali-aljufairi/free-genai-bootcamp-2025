# Local Development Setup (Production-Like Auth + Seed)

This guide sets up **lang-portal** locally with real Clerk JWTs and seeded content data.

## Prerequisites

- Go 1.21+
- Docker + Docker Compose
- A dedicated **Clerk development app**
- Local seed bundle at a known path

## Environment Files

### Backend (`lang-portal/.env`)

Required variables:

```dotenv
APP_ENV=local
PORT=8080

DB_HOST=localhost
DB_PORT=5432
DB_USER=sorami_user
DB_PASSWORD=your_password
DB_NAME=sorami
# Optional: DATABASE_URL=postgres://sorami_user:your_password@localhost:5432/sorami

CLERK_ISSUER=https://clerk.your-dev-domain.com
CLERK_JWKS_URL=https://clerk.your-dev-domain.com/.well-known/jwks.json
CLERK_AUDIENCE=your-audience-claim
CLERK_SECRET_KEY=sk_test_...

ALLOW_DEV_FALLBACK_USER=0
SEED_BUNDLE_PATH=/Users/ali/github/free-genai-bootcamp-2025/lang-portal/data/cleaned_json/db
```

### Frontend (`lang-portal/frontend/.env`)

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
GO_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# Option A: managed PostHog reverse proxy on your own domain
NEXT_PUBLIC_POSTHOG_HOST=https://events.example.com
NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com

# Option B: same-domain proxy path handled by Next.js rewrites
# NEXT_PUBLIC_POSTHOG_HOST=/x9k4
# NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com
# POSTHOG_PROXY_PATH=/x9k4
# POSTHOG_PROXY_TARGET=https://us.i.posthog.com
# POSTHOG_PROXY_ASSETS_HOST=https://us-assets.i.posthog.com

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## Clerk Dev App Checklist

1. Create a **dedicated dev app** in Clerk.
2. Add JWT template `sorami-backend` with:

```text
Issuer: https://clerk.your-dev-domain.com
Audience: your-audience-claim
Subject: {{user.id}}
Expiration: 1 hour
```

3. Add `http://localhost:3000` to **Allowed Origins**.

## Database Setup

Run in `lang-portal/`:

```bash
make db-reset
make db-migrate-up
make db-seed
make db-validate
```

Notes:

- `make db-seed` reads NDJSON from `SEED_BUNDLE_PATH`.
- User-specific seed data is skipped by default.

## Start Development Servers

```bash
make dev
```

If you are not in a tmux session, run these separately:

```bash
make dev-backend
make dev-frontend
```

## Verification

1. Open `http://localhost:3000` and sign in with the **dev Clerk app**.
2. Call a protected endpoint without a token and confirm `401`.
3. Call the same endpoint with a valid token and confirm `200`.
4. Visit `/study` and `/vocabulary` to confirm content loads.
