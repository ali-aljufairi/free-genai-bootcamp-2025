# Sorami - Project-wide command runner
# See https://github.com/casey/just

set shell := ["bash", "-uc"]

# Default: list available recipes
default:
    @just --list

# === SETUP ===

# First-time setup: populate .env from ~/.secrets/sorami/.env or fall back to .env.example
init:
    bash "{{ justfile_directory() }}/scripts/init-env.sh" "{{ justfile_directory() }}"

# Generate ~/.secrets/sorami/.env.template with all variables
secrets-template:
    bash "{{ justfile_directory() }}/scripts/secrets-template.sh"

# Check all dependencies are installed
doctor:
    bash "{{ justfile_directory() }}/scripts/doctor.sh"

# One-command local setup for agent work
agent:
    @echo "Initializing environment..."
    @just init
    @echo ""
    @echo "Starting database..."
    @cd "{{ justfile_directory() }}/lang-portal" && just docker-up
    @echo ""
    @echo "Running migrations..."
    @cd "{{ justfile_directory() }}/lang-portal" && just db-migrate-up
    @echo ""
    @SEED_PATH="{{ justfile_directory() }}/lang-portal/data/cleaned_json/db"; \
      if [ -d "$$SEED_PATH" ]; then \
          echo "Seeding database..."; \
          cd "{{ justfile_directory() }}/lang-portal" && just db-seed; \
      else \
          echo "Seed data not found at $$SEED_PATH; skipping db-seed."; \
      fi
    @echo ""
    @echo "Starting backend and frontend in tmux..."
    @if ! command -v tmux >/dev/null 2>&1; then \
        echo "tmux not found. Install tmux or tell me to use another method."; \
        exit 1; \
    fi
    @if [ -n "$$TMUX" ]; then \
        tmux rename-window "sorami-agent"; \
        tmux split-window -h "cd '{{ justfile_directory() }}/lang-portal' && just dev-backend"; \
        tmux split-window -v "cd '{{ justfile_directory() }}/lang-portal' && just dev-frontend"; \
        tmux select-layout tiled; \
    else \
        tmux new-session -d -s sorami-agent -n sorami-agent "cd '{{ justfile_directory() }}/lang-portal' && just dev-backend"; \
        tmux split-window -v "cd '{{ justfile_directory() }}/lang-portal' && just dev-frontend"; \
        tmux select-layout tiled; \
        tmux attach -t sorami-agent; \
    fi

# Find a free port starting from base (for use in scripts)
[private]
find-free-port base:
    bash "{{ justfile_directory() }}/scripts/find-free-port.sh" {{base}}
