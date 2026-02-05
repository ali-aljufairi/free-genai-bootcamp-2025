#!/usr/bin/env bash
# Print first free port starting from base. Usage: find-free-port.sh <base_port>
set -euo pipefail
base=${1:-8080}
port=$base
while lsof -i:"$port" >/dev/null 2>&1; do
    port=$((port + 1))
done
echo "$port"
