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
	@echo "Database:"
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
		tmux new-session -d -s sorami-dev 'make dev-backend'; \
		tmux split-window -h 'make dev-frontend'; \
		tmux select-pane -t 0; \
		tmux attach-session -t sorami-dev; \
	else \
		echo "tmux not found. Please run 'make dev-backend' and 'make dev-frontend' in separate terminals."; \
		exit 1; \
	fi

# Backend development with Air
dev-backend:
	@echo "Starting backend with Air..."
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
		cd ../Database && docker compose up -d; \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

docker-down:
	@echo "Stopping PostgreSQL database..."
	@if command -v docker >/dev/null 2>&1; then \
		cd ../Database && docker compose down; \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

db-reset: docker-down
	@echo "Resetting database..."
	@if command -v docker >/dev/null 2>&1; then \
		cd ../Database && docker compose down -v && docker compose up -d; \
		echo "Database reset complete. Run import script if needed."; \
	else \
		echo "Docker not found."; \
		exit 1; \
	fi

# Import JLPT data into database
db-seed:
	@echo "Importing JLPT data into database..."
	@if command -v go >/dev/null 2>&1; then \
		cd ../Database/import-client && go run *.go; \
	else \
		echo "Go not found."; \
		exit 1; \
	fi
