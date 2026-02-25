# Sorami - Japanese Language Learning Platform

- Follow production-grade code practices and patterns
- Maintain code quality, security, and performance standards
- Respect existing architectural decisions and patterns

### Core Components

- **lang-portal**: Central Go+Next.js web application with PostgreSQL 
- **agent**: AI shopping/search assistant using LangGraph and Groq LLM
- **writing-practice**: Handwriting OCR with AI feedback
- **Database**: Compre  hensive PostgreSQL schema for Japanese learning 



### Authentication & Security

- **Clerk JWT**: Universal authentication across ALL services - never bypass this
- **Production Security**: All services verify Bearer tokens with cached JWKS from Clerk
- **Go services**: Use `golang-jwt/jwt/v5` with middleware for JWT verification
- **Python services**: Shared `auth.py` pattern with `verify_bearer()` function


### Before Making Changes

1. **Understand the existing architecture** - examine table structures, relationships, and patterns
2. **Ask for context** - information when working with database issues or obtain it yoursel
3. **Identify root causes** - don't jump to quick fixes without understanding the problem
4. **Respect existing design** - the database and code patterns are carefully designed

### When Debugging API Issues

2. **Examine authentication flow** - Clerk JWT → user mapping → database operations

### Working with UI Components

1. **Always examine existing component patterns** before proposing changes
2. **Use single glass-card containers** - never create multiple cards for one screen
3. **Organize content with internal sections** using borders, headers, and proper spacing
4. **Follow established design patterns** - don't create custom designs without consultation
5. **Fix existing components** rather than creating new unified solutions

### Working with Database

- Database are found in lang-portal/internal/database/migrations 
- You never edit migration you just add new one 

## Cursor Cloud specific instructions

### Required tools (pre-installed in the VM)
- Go 1.24+ at `/usr/local/go/bin/go`
- bun at `~/.bun/bin/bun`
- Docker (dockerd must be started before use — see below)
- just (command runner) at `/usr/local/bin/just`
- uv (Python package manager) at `~/.local/bin/uv`
- air (Go hot reload) at `~/go/bin/air`

PATH is configured in `~/.bashrc`. If tools are not found, run: `source ~/.bashrc`

### Starting services

1. **Docker daemon** must be started first (it does not auto-start in the VM):
   ```bash
   sudo dockerd &>/tmp/dockerd.log &
   sleep 3
   sudo chmod 666 /var/run/docker.sock
   ```

2. **PostgreSQL**: From `lang-portal/`, run `just docker-up` (or `cd Database && docker compose --env-file ../.env up -d`). Wait ~5s for readiness.

3. **Migrations**: From `lang-portal/`, run `just db-migrate-up` (or `go run cmd/migrate/main.go up`).

4. **Dev fallback user**: The Go backend uses `ALLOW_DEV_FALLBACK_USER=1` to bypass Clerk auth in dev. A user with `id=1` must exist in the `users` table:
   ```sql
   INSERT INTO users (id, clerk_id, email, display_name)
   VALUES (1, 'dev-fallback-user', 'dev@sorami.test', 'Dev User')
   ON CONFLICT (id) DO NOTHING;
   ```

5. **Go backend**: From `lang-portal/`, run `air` (hot-reload on port 8080).

6. **Next.js frontend**: From `lang-portal/frontend/`, run `bun run dev -- --port 3000`.

### Key gotchas
- `.env` files are **not committed**. On fresh setup, copy from `.env.example` or use `just init` from repo root. The backend `.env` needs valid `DB_*` and `POSTGRES_*` values; the frontend `.env` needs `GO_BACKEND_URL=http://localhost:8080`.
- The Docker Postgres image builds from `Database/config/Dockerfile.postgres` (includes pgvector). First `docker-up` takes ~15s to build.
- **Seed data** (`data/cleaned_json/db/`) is not in the repository. It is hosted on Cloudflare R2 (bucket `sorami`, path `cleaned_json/db/`). To download, use `aws s3 sync` with the R2 endpoint and credentials from secrets (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`). Then run `just db-seed` from `lang-portal/`. Without seed data, the database works with empty tables but some tests (`TestComputeValidWords`) will fail.
- API routes are under `/api/langportal/...` (not `/api/...`). Health check is at `GET /health`.
- Frontend ESLint has pre-existing errors (React Compiler warnings, `set-state-in-effect`, etc.) — these are not regressions.
- `bun install` in `frontend/` may report "Blocked postinstalls" — this is normal; run `bun pm untrusted` if needed.
- Standard dev commands are documented in `lang-portal/README.md` and `lang-portal/justfile` (`just --list`).
