#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-}"
NEW_PORT="${2:-}"

if [ -z "$ENV_FILE" ] || [ -z "$NEW_PORT" ]; then
  echo "Usage: update-db-port.sh <env_file> <new_port>" >&2
  exit 1
fi

python3 - "$ENV_FILE" "$NEW_PORT" <<'PY'
import sys
from urllib.parse import urlsplit, urlunsplit

env_path = sys.argv[1]
new_port = sys.argv[2]

with open(env_path, "r", encoding="utf-8") as f:
    lines = f.read().splitlines()


def update_database_url(value: str, port: str) -> str:
    original = value
    quote = ""
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        quote = value[0]
        value = value[1:-1]

    split = urlsplit(value)
    if split.scheme not in ("postgres", "postgresql") or not split.netloc:
        return original

    netloc = split.netloc
    userinfo = ""
    hostport = netloc
    if "@" in netloc:
        userinfo, hostport = netloc.rsplit("@", 1)
        userinfo = f"{userinfo}@"

    if hostport.startswith("["):
        end = hostport.find("]")
        if end == -1:
            return original
        host = hostport[: end + 1]
        new_hostport = f"{host}:{port}"
    else:
        host = hostport.split(":", 1)[0]
        if not host:
            return original
        new_hostport = f"{host}:{port}"

    new_netloc = f"{userinfo}{new_hostport}"
    updated = urlunsplit(
        (split.scheme, new_netloc, split.path, split.query, split.fragment)
    )
    return f"{quote}{updated}{quote}" if quote else updated


out = []
db_port_updated = False

for line in lines:
    if line.startswith("DB_PORT="):
        out.append(f"DB_PORT={new_port}")
        db_port_updated = True
        continue
    if line.startswith("DATABASE_URL="):
        value = line.split("=", 1)[1]
        out.append(f"DATABASE_URL={update_database_url(value, new_port)}")
        continue
    out.append(line)

if not db_port_updated:
    out.append(f"DB_PORT={new_port}")

with open(env_path, "w", encoding="utf-8") as f:
    f.write("\n".join(out) + "\n")
PY
