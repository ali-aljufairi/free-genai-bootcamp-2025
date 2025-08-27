# Sorami - Japanese Language Learning Platform

## 🚨 IMPORTANT: Production-Grade Application Guidelines

**ALWAYS CONSULT** with the project maintainer before making ANY changes. This is a **production application** (https://sorami.aljufairi.org/) serving real users.

**CRITICAL REQUIREMENTS:**

- Follow production-grade code practices and patterns
- Maintain code quality, security, and performance standards
- Test thoroughly before suggesting changes
- Respect existing architectural decisions and patterns
- **NEVER suggest quick fixes or temporary solutions**
- **ALWAYS understand the existing database schema before proposing changes**
- **NEVER create new tables without understanding the existing architecture**

## Architecture Overview

Sorami is a **production-grade microservices platform** for Japanese language learning with a central Go backend (`lang-portal`) and multiple Python AI services. Each service is independently deployable with Docker Compose.

### Core Components

- **lang-portal**: Central Go+Next.js web application with SQLite→PostgreSQL migration in progress
- **agent**: AI shopping/search assistant using LangGraph and Groq LLM
- **listening-comp**: JLPT audio comprehension using RAG
- **quiz-gen**: AI-powered quiz generation for language tests
- **vocab-importer**: Vocabulary extraction and management
- **writing-practice**: Handwriting OCR with AI feedback
- **Database**: Comprehensive PostgreSQL schema for Japanese learning (migration from SQLite ongoing)

## Technology Patterns

### Build Systems

- **Go services**: Use `make` commands (`make build`, `make run`, `make watch`, `make docker-run`)
- **Python services**: Use `uv` package manager with `pyproject.toml` configuration
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, and Radix UI

### Authentication & Security

- **Clerk JWT**: Universal authentication across ALL services - never bypass this
- **Production Security**: All services verify Bearer tokens with cached JWKS from Clerk
- **Go services**: Use `golang-jwt/jwt/v5` with middleware for JWT verification
- **Python services**: Shared `auth.py` pattern with `verify_bearer()` function
- **Environment Security**: Always use `.env` files, never hardcode secrets

### Database Migration Status 🚧

- **ONGOING MIGRATION**: SQLite → PostgreSQL for production scalability
- **Current State**: Mixed environment (SQLite for dev, PostgreSQL for production)
- **Critical**: Always check current migration status before database changes
- **Schema Location**: `Database/` directory contains comprehensive PostgreSQL schema
- **Database Design Philosophy**: The maintainer has put significant thought and effort into the database design with careful attention to:
- **Shared Data**: `words.db` SQLite file still used for cross-service vocabulary data

## Development Workflows

### Starting Services

```bash
# Go service (lang-portal)
make run              # Starts backend + frontend dev servers
make docker-run       # Full Docker Compose setup
# Note: Uses Air for hot reloading - no manual rebuilds needed

# Python services
uv run fastapi dev api.py     # FastAPI development
uv run streamlit run main.py  # Streamlit interface
```

### Key Service Endpoints

- Most Python services expose both **FastAPI APIs** and **Streamlit UIs**
- Services integrate with lang-portal via shared authentication
- Docker Compose configurations include health checks and service dependencies

## AI/LLM Integration Patterns

### Common Libraries

- **LangChain/LangGraph**: Agent frameworks (see `agent/graph.py`)
- **Groq API**: Primary LLM provider for most services
- **Pydantic models**: Data validation in `models/schemas.py` files

### Service Communication

- Services communicate via HTTP APIs with JWT authentication
- Shared data through SQLite (`words.db`) and PostgreSQL databases
- Integration points documented in individual service READMs

## Project-Specific Conventions

### Code Quality Standards

- **Production-Grade Only**: Follow enterprise-level coding patterns
- **Error Handling**: Comprehensive error handling with Sentry integration
- **Type Safety**: Use TypeScript for frontend, proper Go typing, Pydantic for Python
- **Code Reviews**: All changes require maintainer approval before implementation

### File Structure

- Python services follow: `main.py` (entry), `api.py` (FastAPI), `auth.py` (Clerk JWT)
- Go services: `cmd/api/` entry, `internal/` for private code, `handlers/` for HTTP
- Docker configs in `.docker/` or root-level `docker-compose.yml`
- Environment templates in `.env.example` files

### Database Schema

- Japanese-specific tables: `kanji`, `words`, `grammar_points`, `jlpt_questions`
- User progress tracking with spaced repetition algorithms
- Graph relationships for content connections (see `Database/README.md`)
- **Important**: Always examine existing table structures and relationships before proposing changes

### Deployment

- Kubernetes manifests in `k8s/` directory
- Container images use multi-stage builds with `uv` for Python
- Environment-specific configurations in Docker Compose

When working on this codebase, prioritize understanding the **service boundaries** and **shared authentication patterns**. Each service is designed to be independently deployable while maintaining data consistency through the central database schema.

## Problem-Solving Approach

### Before Making Changes

1. **Understand the existing architecture** - examine table structures, relationships, and patterns
2. **Ask for context** - information when working with database issues or obtain it yoursel
3. **Identify root causes** - don't jump to quick fixes without understanding the problem
4. **Respect existing design** - the database and code patterns are carefully designed

### When Debugging API Issues

1. **Check database connectivity** and table existence first
2. **Examine authentication flow** - Clerk JWT → user mapping → database operations
3. **Verify foreign key relationships** and constraints
4. **Use existing functions and patterns** rather than creating new ones

### Working with Database

- **Always request table structures** before proposing schema changes
- **Use existing progress tracking tables** rather than creating new ones
