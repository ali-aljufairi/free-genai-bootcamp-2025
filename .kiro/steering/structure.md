# Project Structure

## Repository Organization

The Sorami repository follows a multi-project monorepo structure with each service as an independent module:

```
sorami/
├── lang-portal/           # Central web application (Go + Next.js)
├── agent/                 # AI search and comparison agent (Python)
├── ASL/                   # American Sign Language recognition (Python)
├── listening-comp/        # Audio comprehension tools (Python)
├── quiz-gen/              # Quiz generation service (Python)
├── vocab-importer/        # Vocabulary management (Python)
├── writing-practice/      # Handwriting practice (Python)
├── speach/                # Speech analysis (Python)
├── sentence-constructor/  # Grammar tools (Documentation)
├── video-translation/     # Video translation service (Python)
├── genai-architecting/    # Architecture documentation
└── k8s/                   # Kubernetes deployment configs
└── Database/              #contains all Database schema and database features
└── .kiro/                 #information about the about Task and what needed to be done and projectcatuese
```

## Service Architecture Patterns

### Go Services (lang-portal)
```
lang-portal/
├── cmd/api/              # Application entry point
├── internal/             # Private application code
│   ├── config/          # Configuration management
│   ├── database/        # Database layer and models
│   ├── handlers/        # HTTP request handlers
│   ├── server/          # Server setup and routing
│   └── services/        # Business logic
├── frontend/            # Next.js frontend application
├── docs/                # API and project documentation
├── Makefile            # Build automation
├── go.mod              # Go dependencies
└── docker-compose.yml  # Container orchestration
```

### Python Services (Standard Pattern)
```
service-name/
├── .docker/            # Docker configurations
├── .venv/              # Virtual environment (ignored)
├── main.py             # Application entry point
├── api.py              # FastAPI server (if applicable)
├── pyproject.toml      # Python dependencies and config
├── docker-compose.yml  # Container setup
├── .env.example        # Environment template
└── README.md           # Service documentation
```

### Frontend Structure (Next.js)
```
frontend/
├── app/                # Next.js app router
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard pages
│   ├── study/         # Study session pages
│   └── vocabulary/    # Vocabulary management
├── components/         # Reusable UI components
│   ├── ui/           # Base UI components
│   ├── study/        # Study-specific components
│   └── vocabulary/   # Vocabulary components
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── services/          # API client services
├── types/             # TypeScript type definitions
└── styles/            # Global styles and animations
```

## Configuration Patterns

### Environment Variables
- `.env.example` files provide templates
- Service-specific environment configuration
- Docker Compose environment injection

### Database Patterns
- **SQLite**: Primary database for most services (`words.db`)
- **Migrations**: Go-based migration system in lang-portal
- **Seeding**: Automated data seeding for development

### Docker Patterns
- **Multi-stage builds**: Separate build and runtime stages
- **Service isolation**: Each service has independent containers
- **Volume mounting**: Persistent data and development sync
- **Network configuration**: Service-to-service communication

## Development Workflow

### File Naming Conventions
- **Go**: Snake_case for files, PascalCase for exported functions
- **Python**: Snake_case for files and functions
- **TypeScript**: kebab-case for files, camelCase for functions
- **Components**: PascalCase for React components

### API Patterns
- **RESTful endpoints**: Standard HTTP methods and status codes
- **JSON responses**: Consistent response formatting
- **Error handling**: Structured error responses
- **Authentication**: Clerk-based user management

### Testing Structure
- **Go**: `*_test.go` files alongside source code
- **Python**: Test files in same directory or `tests/` folder
- **Frontend**: Component and integration tests

## Deployment Structure
- **Kubernetes manifests**: Service-specific deployment configs
- **Docker registries**: GitHub Container Registry for images
- **Environment separation**: Development, staging, production configs