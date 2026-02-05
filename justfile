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

# Find a free port starting from base (for use in scripts)
[private]
find-free-port base:
    bash "{{ justfile_directory() }}/scripts/find-free-port.sh" {{base}}
