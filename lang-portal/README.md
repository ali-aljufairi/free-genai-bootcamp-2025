# Sorami - Japanese Language Learning Platform

A production-grade microservices platform for Japanese language learning, featuring a central Go backend, Next.js frontend, and multiple AI-powered services.

## Architecture Overview

Sorami consists of multiple independently deployable services:
- **lang-portal**: Central Go+Next.js web application (current service)
- **agent**: AI shopping/search assistant using LangGraph and Groq LLM
- **listening-comp**: JLPT audio comprehension using RAG
- **quiz-gen**: AI-powered quiz generation for language tests
- **vocab-importer**: Vocabulary extraction and management
- **writing-practice**: Handwriting OCR with AI feedback

## Quick Start

### Prerequisites
- Go 1.21+
- Node.js 22+ with bun
- Docker & Docker Compose
- [just](https://github.com/casey/just) (recommended): `brew install just` or `cargo install just`
- tmux (optional, for running backend and frontend in one window)

### Environment and secrets (from repo root)

Run once from the **repository root** to populate all `.env` files:

```bash
cd free-genai-bootcamp-2025
just secrets-template   # creates ~/.secrets/sorami/.env.template
# Copy to ~/.secrets/sorami/.env and add your Clerk keys, DB password, API keys
just init               # generates lang-portal/.env, frontend/.env, agent/.env, etc.; resolves port conflicts
just doctor             # check go, bun, docker
```

If you don't use `~/.secrets/sorami/.env`, `just init` falls back to copying each `.env.example` to `.env`; edit those manually.

### Development setup (from lang-portal)

1. **Start PostgreSQL:**
   ```bash
   cd lang-portal
   just docker-up
   ```

2. **Database setup (migrate + seed):**
   ```bash
   just db-setup
   ```
   Requires `SEED_BUNDLE_PATH` in `.env` (or in `~/.secrets/sorami/.env` before running `just init`).

3. **Start dev servers** (use two terminals):
   ```bash
   just dev-backend   # Go backend with Air
   just dev-frontend # Next.js with bun
   ```

### Alternative: Make

The `Makefile` is still available: `make dev`, `make dev-backend`, `make dev-frontend`, `make db-setup`, etc.

## Available commands (just)

Run `just` or `just --list` in `lang-portal/` to see all recipes.

### Development
```bash
just dev-backend      # Backend with Air hot reloading (uses PORT from .env)
just dev-frontend     # Frontend with bun dev
```

### Database
```bash
just docker-up       # Start PostgreSQL container
just docker-down     # Stop PostgreSQL container
just db-reset        # Reset DB (remove volumes, restart)
just db-migrate-up   # Run migrations
just db-seed-ndjson  # Seed from NDJSON (needs SEED_BUNDLE_PATH)
just db-setup        # db-reset + migrate + seed
just db-status       # Migration status + row counts
just db-validate     # Validate schema and data
```

### Build & test
```bash
just build           # Build Go binary
just test            # Run Go tests
just clean           # Remove build artifacts
```

## Development Workflow

### System Components
- **Backend/Frontend**: Run via `just dev-backend` and `just dev-frontend` (or `make dev` in tmux).
- **justfile / Makefile**: Orchestrate backend, database, and local commands.
- **AI services**: Run independently (e.g. `cd ../agent && uv run fastapi dev api.py`).

### Recommended setup
1. From repo root: `just init` (and optionally `just doctor`).
2. From `lang-portal/`: `just docker-up`, `just db-setup`, then `just dev-backend` and `just dev-frontend` in two terminals.
3. Start other AI services in separate terminals as needed.

### Production Deployment
- Services deploy independently with Docker Compose
- Kubernetes manifests available in `k8s/` directory
- Database schema managed in `Database/` directory

## Project Structure

```
lang-portal/
├── .air.toml              # Air hot reload configuration
├── cmd/api/               # API server entry point
├── internal/              # Private application code
│   ├── database/          # Database layer (PostgreSQL)
│   ├── handlers/          # HTTP request handlers
│   ├── server/            # Server implementation
│   └── services/          # Business logic services
├── frontend/              # Next.js 15 frontend application
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── lib/               # Utility libraries (api-proxy, etc.)
│   └── services/          # API service clients
├── docs/                  # Documentation
│   ├── auth/             # Authentication documentation
│   ├── api/              # API documentation
│   ├── architecture/     # Architecture docs
│   ├── development/      # Development guides
│   └── guides/           # Feature guides
├── docker-compose.yml     # Local development services
├── justfile               # Development commands (just)
├── Makefile               # Development orchestration (legacy)
└── go.mod                 # Go dependencies
```

### Technology Stack
- **Backend**: Go with Fiber framework, PostgreSQL database
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI
- **Authentication**: Clerk JWT with Bearer token flow (prevents 431 errors)
- **API Proxy**: Next.js API routes that strip cookies and forward compact tokens
- **Development**: Air (Go hot reload), bun (frontend), tmux (multi-service dev)
- **Database**: PostgreSQL with comprehensive JLPT schema (kanji, words, groups)
- **AI Services**: Independent Python microservices (LangChain, Groq, etc.)

## Getting Started (Detailed)

### 1. Environment setup
From the **repo root**:
```bash
git clone https://github.com/Ali-Aljufairi/free-genai-bootcamp-2025.git
cd free-genai-bootcamp-2025

just secrets-template   # create ~/.secrets/sorami/.env.template
# Copy to ~/.secrets/sorami/.env and fill in Clerk, DB, API keys
just init               # generate all service .env files (port-safe)
just doctor             # optional: check dependencies
```

Or without a secrets file: copy each `.env.example` to `.env` and edit (e.g. `lang-portal/.env`, `lang-portal/frontend/.env`).

### 2. Database setup (from lang-portal)
```bash
cd lang-portal
just docker-up
just db-setup   # reset + migrate + seed (requires SEED_BUNDLE_PATH in .env)
```

### 3. Development servers
```bash
just dev-backend    # terminal 1
just dev-frontend   # terminal 2
```

### 4. AI services (optional)
```bash
cd ../agent && uv run fastapi dev api.py
cd ../quiz-gen && uv run fastapi dev api.py
# etc.
```

## Development Guidelines

### Code Quality
- **Production-Grade**: Follow enterprise-level patterns and security
- **Authentication**: Never bypass Clerk JWT verification
- **Database**: Validate against schema in `Database/` before changes
- **UI Design**: Single glass-card layout per screen with internal sections
- **Testing**: Playwright E2E tests with mobile-first focus

### Architecture Patterns
- **Microservices**: Each AI service is independently deployable
- **Shared Auth**: Clerk JWT across all services
- **Database Migration**: Ongoing SQLite → PostgreSQL transition
- **Mobile-First**: Responsive design with touch-friendly interactions

## Contributing

1. **Always coordinate** with maintainer before changes
2. **Document decisions** in PR descriptions
3. **Test thoroughly** before deployment
4. **Follow mobile-first** design principles
5. **Maintain compatibility** with existing microservice contracts

For a full list of commands run `just --list` in `lang-portal/`. The `Makefile` remains available for the same targets (e.g. `make dev-backend`, `make db-setup`).