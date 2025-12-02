# Sorami Language Learning Platform - Development Makefile

.PHONY: help dev dev-backend dev-frontend build clean test docker-up docker-down db-reset

# Default target
help:
	@echo "Sorami Development Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start both backend (Air) and frontend (bun) in tmux panes"
	@echo "  make dev-backend      - Start backend with Air hot reloading"
	@echo "  make dev-frontend     - Start frontend with bun dev"
	@echo ""
	@echo "Building & Testing:"
	@echo "  make build            - Build the Go application"
	@echo "  make test             - Run Go tests"
	@echo "  make clean            - Clean build artifacts"
	@echo ""
	@echo "Database:" \
	@echo "  make docker-up        - Start PostgreSQL database container"
	@echo "  make docker-down      - Stop PostgreSQL database container"
	@echo "  make db-reset         - Reset database (stop, remove volumes, restart)"
	@echo "  make db-seed          - Import JLPT data into database"
	@echo ""
	@echo "Usage:"
	@echo "  1. Run 'make db-reset' to start fresh database"
	@echo "  2. Run 'make dev' to start both backend and frontend"
	@echo "  3. Or run 'make dev-backend' and 'make dev-frontend' in separate terminals"

# Development - Start both backend and frontend
dev:
	@echo "Starting development environment..."
	@if command -v tmux >/dev/null 2>&1; then \
		if [ -n "$$TMUX" ]; then \
			echo "Creating new split pane for backend..."; \
			tmux split-window -h 'make dev-backend'; \
			tmux split-window -v 'make dev-frontend'; \
		else \
			echo "tmux not found in current session. Please run in a tmux session or run 'make dev-backend' and 'make dev-frontend' separately."; \
			exit 1; \
		fi; \
	else \
		echo "tmux not found. Please run 'make dev-backend' and 'make dev-frontend' in separate terminals."; \
		exit 1; \
	fi

# Backend development with Air
dev-backend:
	@echo "Starting backend with Air..."
	@echo "Checking for existing processes on port 8080..."
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "No existing process found on port 8080"
	@if command -v air >/dev/null 2>&1; then \
		air; \
	else \
		echo "Air not found. Installing..."; \
		go install github.com/air-verse/air@latest; \
		air; \
	fi

# Frontend development with bun
dev-frontend:
	@echo "Starting frontend with bun..."
	@if command -v bun >/dev/null 2>&1; then \
		cd frontend && bun run dev; \
	else \
		echo "bun not found. Please install bun: https://bun.sh/"; \
		exit 1; \
	fi

# Build the application
build:
	@echo "Building Go application..."
	@CGO_ENABLED=1 go build -o main cmd/api/main.go

# Run tests
test:
	@echo "Running Go tests..."
	@go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -f main
	@rm -f build-errors.log
	@rm -f build-errors.tmp
	@rm -f dbtools

# Database management
docker-up:
	@echo "Starting PostgreSQL database..."
	@if command -v docker >/dev/null 2>&1; then \
		cd Database && docker compose up -d; \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

docker-down:
	@echo "Stopping PostgreSQL database..."
	@if command -v docker >/dev/null 2>&1; then \
		cd Database && docker compose down; \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

db-reset: docker-down
	@echo "Resetting database..."
	@if command -v docker >/dev/null 2>&1; then \
		cd Database && docker compose down -v && docker compose up -d; \
		echo "Database reset complete. Run migrations and seed if needed."; \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

# Database Migrations
.PHONY: migrate-up migrate-down migrate-status migrate-create migrate-reset

migrate-up:
	@echo "Running database migrations..."
	@go run cmd/migrate/main.go up

migrate-down:
	@echo "Rolling back last migration..."
	@go run cmd/migrate/main.go down

migrate-status:
	@echo "Checking migration status..."
	@go run cmd/migrate/main.go status

migrate-create:
	@read -p "Migration name: " name; \
	goose -dir internal/database/migrations create $$name sql

migrate-reset:
	@echo "WARNING: This will rollback ALL migrations!"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		go run cmd/migrate/main.go reset; \
	else \
		echo "Cancelled."; \
	fi

# Database Seeding
.PHONY: seed seed-kanji seed-words seed-jlpt seed-grammar seed-graph seed-ndjson

seed:
	@echo "Seeding database with all data..."
	@go run cmd/seed/main.go

seed-kanji:
	@echo "Seeding kanji data only..."
	@go run cmd/seed/main.go -only=kanji

seed-words:
	@echo "Seeding words data only..."
	@go run cmd/seed/main.go -only=words

seed-jlpt:
	@echo "Seeding JLPT questions only..."
	@go run cmd/seed/main.go -only=jlpt

seed-grammar:
	@echo "Seeding grammar data only..."
	@go run cmd/seed/main.go -only=grammar

seed-graph:
	@echo "Seeding graph relationships only..."
	@go run cmd/seed/main.go -only=graph

seed-ndjson:
	@echo "Seeding from NDJSON exports (fast mode)..."
	@go run cmd/seed/main.go -ndjson

# Full database setup (migrate + seed)
.PHONY: db-setup db-validate

db-setup: migrate-up seed
	@echo "Database setup complete!"
	@echo "Running validation..."
	@go run cmd/validate/main.go

db-validate:
	@echo "Validating database schema and data..."
	@go run cmd/validate/main.go
