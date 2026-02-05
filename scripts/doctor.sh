#!/usr/bin/env bash
# Check development dependencies
set -euo pipefail

echo "Checking dependencies..."
deps=(go bun docker)
optional=(air psql)
missing=()
for dep in "${deps[@]}"; do
    if ! command -v "$dep" &>/dev/null; then
        missing+=("$dep")
    fi
done
if [ ${#missing[@]} -gt 0 ]; then
    echo "Missing required: ${missing[*]}"
    exit 1
fi
for dep in "${optional[@]}"; do
    if command -v "$dep" &>/dev/null; then
        echo "  $dep: ok"
    else
        echo "  $dep: not found (optional)"
    fi
done
echo "Required dependencies: ok"
