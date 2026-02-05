#!/usr/bin/env bash
# Create ~/.secrets/sorami/.env.template
set -euo pipefail

SECRETS_DIR="${SORAMI_SECRETS_DIR:-$HOME/.secrets/sorami}"
mkdir -p "$SECRETS_DIR"
cat > "$SECRETS_DIR/.env.template" << 'TEMPLATE'
# Sorami Master Secrets File
# Copy to ~/.secrets/sorami/.env and fill in your values
# Then run: just init

# === DATABASE ===
DB_HOST=localhost
DB_PORT=5432
DB_USER=sorami_user
DB_PASSWORD=your_secure_password
DB_NAME=sorami

# === CLERK AUTHENTICATION ===
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_AUDIENCE=your-audience
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# === API KEYS ===
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-...
YOUTUBE_API_KEY=AIza...

# === EMAIL (agent, vocab-importer) ===
GMAIL_USER=your@gmail.com
GMAIL_PASS=your_app_password

# === PORTS (auto-detected if in use) ===
PORT=8080
FRONTEND_PORT=3000

# === PATHS ===
SEED_BUNDLE_PATH=/path/to/data/cleaned_json/db

# === OPTIONAL ===
ALLOW_DEV_FALLBACK_USER=0
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
SENTRY_ORG=sorami
SENTRY_PROJECT=lang-portal-frontend
SENTRY_DSN=
API_HOST=localhost
API_PORT=5000
API_PROTOCOL=http
GRADIO_SERVER_PORT=8081
GRADIO_SERVER_NAME=0.0.0.0
GROUP_ID=1
VOCAB_IMPORT_UI_PORT=8501
VOCAB_IMPORT_API_PORT=8000
BLUEPRINT_DB_URL=./words.db
TEMPLATE
echo "Template created at $SECRETS_DIR/.env.template"
echo "Copy to $SECRETS_DIR/.env and fill in your values, then run: just init"
