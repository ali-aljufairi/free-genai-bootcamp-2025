# Sorami - Japanese Language Learning Platform

## 🚨 IMPORTANT: Production-Grade Application Guidelines

- Follow production-grade code practices and patterns
- Maintain code quality, security, and performance standards
- Respect existing architectural decisions and patterns
- **NEVER suggest quick fixes or temporary solutions**
- **ALWAYS understand the existing database schema before proposing changes**
- **NEVER create new tables without understanding the existing architecture**
- **NEVER create unified components without explicit request** - each service has specific needs
- **ALWAYS follow the established UI design language** - use single glass-card pattern with internal organization
- **NEVER create multiple glass cards** - organize content within ONE container with proper sections

## Architecture Overview

Sorami is a **production-grade microservices platform** for Japanese language learning with a central Go backend (`lang-portal`) and multiple Python AI services. Each service is independently deployable with Docker Compose.

### Core Components

- **lang-portal**: Central Go+Next.js web application with PostgreSQL (migration complete)
- **agent**: AI shopping/search assistant using LangGraph and Groq LLM
- **listening-comp**: JLPT audio comprehension using RAG
- **quiz-gen**: AI-powered quiz generation for language tests
- **vocab-importer**: Vocabulary extraction and management
- **writing-practice**: Handwriting OCR with AI feedback
- **Database**: Comprehensive PostgreSQL schema for Japanese learning (SQLite migration complete)


### UI/UX Design Patterns 🎨

- **Single Glass-Card Pattern**: Use ONE `glass-card` container per component/screen, not multiple cards
- **Internal Section Organization**: Structure content with internal dividers, headers, and organized sections WITHIN the single card
- **Existing Design Language**: ALWAYS follow the established design patterns - never create custom designs without consultation
- **Component Modification Philosophy**: Fix existing components rather than creating new unified components
- **Visual Hierarchy**: Use proper typography, spacing, and section headers with icons for clear organization
- **Consistency**: Match existing UI patterns, color schemes, and component structures throughout the platform

### Authentication & Security

- **Clerk JWT**: Universal authentication across ALL services - never bypass this
- **Production Security**: All services verify Bearer tokens with cached JWKS from Clerk
- **Go services**: Use `golang-jwt/jwt/v5` with middleware for JWT verification
- **Python services**: Shared `auth.py` pattern with `verify_bearer()` function
- **Environment Security**: Always use `.env` files, never hardcode secrets






### Key Service Endpoints

- Most Python services expose both **FastAPI APIs** and **Streamlit UIs**
- Services integrate with lang-portal via shared authentication
- Docker Compose configurations include health checks and service dependencies

### Code Quality Standards

- **Production-Grade Only**: Follow enterprise-level coding patterns
- **Error Handling**: Comprehensive error handling with Sentry integration
- **Type Safety**: Use TypeScript for frontend, proper Go typing, Pydantic for Python

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

### Working with UI Components

1. **Always examine existing component patterns** before proposing changes
2. **Use single glass-card containers** - never create multiple cards for one screen
3. **Organize content with internal sections** using borders, headers, and proper spacing
4. **Follow established design patterns** - don't create custom designs without consultation
5. **Fix existing components** rather than creating new unified solutions

### Working with Database

- Database are found in lang-portal/internal/database/migrations 
- You never edit migration you just add new one 
