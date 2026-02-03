# Sorami Language Learning Platform - Development Makefile

.PHONY: help dev dev-backend dev-frontend build clean test
.PHONY: docker-up docker-down db-reset db-migrate db-migrate-up db-migrate-down db-migrate-status
.PHONY: db-seed db-seed-ndjson db-seed-kanji db-seed-words db-seed-grammar db-seed-jlpt db-seed-graph db-seed-courses db-seed-study
.PHONY: db-setup db-status db-validate

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
	@echo "Database - Docker:"
	@echo "  make docker-up        - Start PostgreSQL database container"
	@echo "  make docker-down      - Stop PostgreSQL database container"
	@echo "  make db-reset         - Reset database (stop, remove volumes, restart)"
	@echo ""
	@echo "Database - Migrations:"
	@echo "  make db-migrate        - Run all pending migrations (alias for db-migrate-up)"
	@echo "  make db-migrate-up    - Run all pending migrations"
	@echo "  make db-migrate-down   - Rollback last migration"
	@echo "  make db-migrate-status - Show migration status"
	@echo ""
	@echo "Database - Seeding:"
	@echo "  make db-seed           - Seed database with NDJSON (recommended)"
	@echo "Database - Full Setup:"
	@echo "  make db-setup          - Complete setup: reset + migrate + seed (NDJSON)"
	@echo "  make db-status         - Show database status (migrations + row counts)"
	@echo "  make db-validate       - Validate database schema and seeded data"
	@echo ""
	@echo "Quick Start:"
	@echo "  make db-setup          - Full database setup from scratch"
	@echo "  make dev               - Start development servers"

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
	@echo "Checking for existing processes on port 3000..."
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No existing process found on port 3000"
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

# Helper function to load .env file
load-env:
	@if [ -f .env ]; then \
		export $$(grep -v '^#' .env | xargs); \
	fi

# Database management - Docker
docker-up: load-env
	@echo "Starting PostgreSQL database..."
	@if command -v docker >/dev/null 2>&1; then \
		if [ -f Database/docker-compose.yml ]; then \
			if [ -f .env ]; then \
				export $$(grep -v '^#' .env | xargs) && \
				cd Database && docker compose --env-file ../.env up -d; \
			else \
				cd Database && docker compose up -d; \
			fi; \
			echo "Waiting for database to be ready..."; \
			sleep 5; \
			echo "Database started!"; \
		else \
			echo "Error: Database/docker-compose.yml not found"; \
			exit 1; \
		fi \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

docker-down: load-env
	@echo "Stopping PostgreSQL database..."
	@if command -v docker >/dev/null 2>&1; then \
		if [ -f Database/docker-compose.yml ]; then \
			if [ -f .env ]; then \
				export $$(grep -v '^#' .env | xargs) && \
				cd Database && docker compose --env-file ../.env down; \
			else \
				cd Database && docker compose down; \
			fi; \
		else \
			echo "Error: Database/docker-compose.yml not found"; \
			exit 1; \
		fi \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

db-reset: load-env
	@echo "Resetting database (removing volumes)..."
	@if command -v docker >/dev/null 2>&1; then \
		if [ -f Database/docker-compose.yml ]; then \
			if [ -f .env ]; then \
				export $$(grep -v '^#' .env | xargs) && \
				cd Database && docker compose --env-file ../.env down -v && \
				docker compose --env-file ../.env up -d; \
			else \
				cd Database && docker compose down -v && \
				docker compose up -d; \
			fi; \
			echo "Waiting for database to be ready..."; \
			sleep 8; \
			echo "Database reset complete!"; \
		else \
			echo "Error: Database/docker-compose.yml not found"; \
			exit 1; \
		fi \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

# Database migrations
db-migrate: db-migrate-up

db-migrate-up:
	@echo "Running database migrations..."
	@if command -v go >/dev/null 2>&1; then \
		go run cmd/migrate/main.go up; \
	else \
		echo "Go not found."; \
		exit 1; \
	fi

db-migrate-down:
	@echo "Rolling back last migration..."
	@if command -v go >/dev/null 2>&1; then \
		go run cmd/migrate/main.go down; \
	else \
		echo "Go not found."; \
		exit 1; \
	fi

db-migrate-status:
	@echo "Migration status:"
	@if command -v go >/dev/null 2>&1; then \
		go run cmd/migrate/main.go status; \
	else \
		echo "Go not found."; \
		exit 1; \
	fi

# Database seeding
db-seed: db-seed-ndjson

db-seed-ndjson:
	@echo "Seeding database with NDJSON files..."
	@if command -v go >/dev/null 2>&1; then \
		if [ -z "$$SEED_BUNDLE_PATH" ]; then \
			echo "SEED_BUNDLE_PATH is required (path to data/cleaned_json/db)"; \
			exit 1; \
		fi; \
		go run ./cmd/seed -path "$$SEED_BUNDLE_PATH"; \
	else \
		echo "Go not found."; \
		exit 1; \
	fi



# Full database setup
db-setup: db-reset
	@echo ""
	@echo "Running migrations..."
	@$(MAKE) db-migrate-up
	@echo ""
	@echo "Seeding database with NDJSON..."
	@$(MAKE) db-seed-ndjson
	@echo ""
	@echo "Database setup complete!"
	@echo "Run 'make db-status' to verify."

# Database validation
db-validate:
	@echo "Validating database schema and data..."
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/validate; \
	else \
		echo "Go not found."; \
		exit 1; \
	fi

# Database status check
db-status:
	@echo "=== Database Status ==="
	@echo ""
	@echo "Migration Status:"
	@$(MAKE) db-migrate-status 2>/dev/null || echo "Could not check migration status"
	@echo ""
	@echo "Row Counts:"
	@if [ -f .env ]; then \
		. .env && \
		PGPASSWORD=$$(echo $$DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p') \
		psql -h $$(echo $$DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p') \
		     -p $$(echo $$DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p') \
		     -U $$(echo $$DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p') \
		     -d $$(echo $$DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p') \
		     -c "SELECT 'kanji' as table_name, COUNT(*) as count FROM kanji UNION ALL SELECT 'words', COUNT(*) FROM words UNION ALL SELECT 'grammar_points', COUNT(*) FROM grammar_points UNION ALL SELECT 'jlpt_questions', COUNT(*) FROM jlpt_questions UNION ALL SELECT 'item_relations', COUNT(*) FROM item_relations UNION ALL SELECT 'courses', COUNT(*) FROM courses UNION ALL SELECT 'units', COUNT(*) FROM units ORDER BY table_name;" 2>/dev/null || echo "Could not query database"; \
	else \
		echo "No .env file found. Using default connection."; \
		PGPASSWORD='TempSorami!2025' psql -h localhost -p 5432 -U sorami_user -d sorami \
		     -c "SELECT 'kanji' as table_name, COUNT(*) as count FROM kanji UNION ALL SELECT 'words', COUNT(*) FROM words UNION ALL SELECT 'grammar_points', COUNT(*) FROM grammar_points UNION ALL SELECT 'jlpt_questions', COUNT(*) FROM jlpt_questions UNION ALL SELECT 'item_relations', COUNT(*) FROM item_relations UNION ALL SELECT 'courses', COUNT(*) FROM courses UNION ALL SELECT 'units', COUNT(*) FROM units ORDER BY table_name;" 2>/dev/null || echo "Could not query database"; \
	fi
