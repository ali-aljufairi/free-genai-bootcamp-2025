# Sorami - Japan### Prerequisites
- Go 1.21+
- Node.js 18+ with bun
- Docker & Docker Compose
- tmux (recommended for development)anguage Learning Platform

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
- tmux (recommended for development)

### Development Setup

1. **Clone and setup:**
   ```bash
   git clone https://github.com/Ali-Aljufairi/free-genai-bootcamp-2025.git
   cd free-genai-bootcamp-2025/lang-portal
   ```

2. **Start PostgreSQL database:**
   ```bash
   make db-reset
   ```

3. **Import JLPT learning data:**
   ```bash
   make db-seed
   ```

4. **Start development environment:**
   ```bash
   make dev
   ```
   This starts both backend (Air) and frontend (bun) in tmux panes.

### Alternative Development Commands

- **Start both services in tmux:** `make dev`
- **Backend only:** `make dev-backend` (runs Air for hot reloading)
- **Frontend only:** `make dev-frontend` (runs bun dev server)
- **Database management:** `make docker-up`, `make docker-down`, `make db-reset`

## Available Make Commands

### Development
```bash
make dev              # Start both backend (Air) and frontend (bun) in tmux panes
make dev-backend      # Start backend with Air hot reloading
make dev-frontend     # Start frontend with bun dev
```

### Database
```bash
make docker-up        # Start PostgreSQL database container
make docker-down      # Stop PostgreSQL database container
make db-reset         # Reset database (stop, remove volumes, restart)
make db-seed          # Import JLPT data into database
```

### Building & Testing
```bash
make build            # Build the Go application
make test             # Run Go tests
make clean            # Clean build artifacts
```

## Development Workflow

### System Components Always Running
- **TypeScript/Frontend**: Always running via `make dev-frontend` or `make dev`
- **Makefile**: Handles all system orchestration (backend, database, services)
- **AI Agent Services**: Run independently alongside main development

### Recommended Development Setup
1. Start main development: `make dev` (backend + frontend in tmux)
2. Start AI services in separate terminals as needed:
   ```bash
   # In separate terminals
   cd ../agent && uv run fastapi dev api.py
   cd ../quiz-gen && uv run fastapi dev api.py
   # etc.
   ```

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
├── Makefile               # Development orchestration
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

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/Ali-Aljufairi/free-genai-bootcamp-2025.git
cd free-genai-bootcamp-2025/lang-portal

# Copy environment files
cp .env.example .env
# Edit .env with your Clerk keys and database settings
```

### 2. Database Setup
```bash
# Start fresh PostgreSQL database
make db-reset

# Import JLPT learning content (12K+ kanji, 20K+ words, 15K+ questions)
make db-seed
```

### 3. Development Environment
```bash
# Start both backend and frontend in tmux panes
make dev

# Or run individually in separate terminals:
make dev-backend    # Go backend with Air hot reload
make dev-frontend   # Next.js with bun dev server
```

### 4. AI Services (Optional)
Start individual AI services as needed:
```bash
# Agent service (shopping/search assistant)
cd ../agent && uv run fastapi dev api.py

# Quiz generation service
cd ../quiz-gen && uv run fastapi dev api.py

# Other services...
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

## Available Make Commands

### Development
```bash
make dev              # Start both backend (Air) and frontend (bun) in tmux panes
make dev-backend      # Start backend with Air hot reloading
make dev-frontend     # Start frontend with bun dev
```

### Database
```bash
make docker-up        # Start PostgreSQL database container
make docker-down      # Stop PostgreSQL database container
make db-reset         # Reset database (stop, remove volumes, restart)
make db-seed          # Import JLPT data into database
```

### Building & Testing
```bash
make build            # Build the Go application
make test             # Run Go tests
make clean            # Clean build artifacts
```