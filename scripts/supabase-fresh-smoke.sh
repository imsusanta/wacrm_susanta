#!/usr/bin/env bash
# Fresh-apply smoke test for the committed Supabase migration chain.
#
# LOCAL ONLY. Fail-closed. This script must never reset a linked or remote
# database. Review this file before running it.
#
# Usage:
#   HELPA_ALLOW_LOCAL_DB_RESET=1 npm run supabase:fresh
#   HELPA_ALLOW_LOCAL_DB_RESET=1 npm run supabase:fresh:keep
#
# Inspected CLI (2.116.0):
#   supabase db reset --help  → --local | --linked | --db-url | --project-ref
#   supabase stop --help      → --project-id | --all | --no-backup
#   supabase start --help     → no --project-id; project_id comes from config.toml
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SMOKE_PROJECT_ID="${HELPA_SMOKE_PROJECT_ID:-helpa-fresh-smoke}"
KEEP_STACK="${1:-}"
SMOKE_ROOT=""

fail_closed() {
  echo "✗ $*" >&2
  exit 2
}

for arg in "$@"; do
  case "$arg" in
    keep | '') ;;
    --linked | --db-url | --project-ref | --all)
      fail_closed "refusing unsafe argument: $arg"
      ;;
    --db-url=* | --project-ref=*)
      fail_closed "refusing unsafe argument: $arg"
      ;;
    *)
      fail_closed "unknown argument: $arg (only 'keep' is allowed)"
      ;;
  esac
done

if [ "${HELPA_ALLOW_LOCAL_DB_RESET:-}" != "1" ]; then
  fail_closed "refusing to reset: set HELPA_ALLOW_LOCAL_DB_RESET=1 to opt in to a local-only reset of project '${SMOKE_PROJECT_ID}'."
fi

if [ "$SMOKE_PROJECT_ID" = "wacrm" ] || [ "$SMOKE_PROJECT_ID" = "" ]; then
  fail_closed "refusing to use the shared local project_id '${SMOKE_PROJECT_ID:-<empty>}'. Set HELPA_SMOKE_PROJECT_ID to an isolated id (default helpa-fresh-smoke)."
fi

is_local_url() {
  local value="$1"
  [[ "$value" =~ ^[a-zA-Z0-9+.-]+://(localhost|127\.0\.0\.1|\[::1\])([:/]|$) ]]
}

for var in DATABASE_URL SUPABASE_DB_URL SUPABASE_URL NEXT_PUBLIC_SUPABASE_URL; do
  value="${!var:-}"
  if [ -n "$value" ] && ! is_local_url "$value"; then
    fail_closed "refusing to reset: ${var} is set to a non-local URL."
  fi
done

if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ supabase CLI not found. Install: brew install supabase/tap/supabase" >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker is not running. Start Docker, then re-run." >&2
  exit 1
fi

port_in_use() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | grep -qE ":${port}[[:space:]]"
  else
    python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket()
try:
    s.bind(("0.0.0.0", port))
except OSError:
    sys.exit(0)
finally:
    s.close()
sys.exit(1)
PY
  fi
}

# Isolated start still uses the committed host ports. If another local stack
# already holds them, refuse instead of stopping that unrelated project.
for port in 54321 54322; do
  if port_in_use "$port"; then
    fail_closed "refusing to start: host port ${port} is already in use. Isolated smoke will not stop another Supabase project (for example wacrm). Free the port yourself, or run this on a machine without an existing local stack."
  fi
done

# Isolated workdir so start/reset use project_id=helpa-fresh-smoke and never
# supabase stop --all / the developer's default `wacrm` stack.
SMOKE_ROOT="$(mktemp -d /tmp/helpa-fresh-smoke.XXXXXX)"
cleanup_workdir() {
  if [ -n "${SMOKE_ROOT:-}" ] && [ -d "$SMOKE_ROOT" ]; then
    rm -rf "$SMOKE_ROOT"
  fi
}
trap cleanup_workdir EXIT

mkdir -p "$SMOKE_ROOT/supabase"
# Copy config and supporting files; keep migrations as a real copy so the
# isolated project cannot write back into the repo.
cp -a "$REPO_ROOT/supabase/." "$SMOKE_ROOT/supabase/"
rm -rf "$SMOKE_ROOT/supabase/.temp" "$SMOKE_ROOT/supabase/.branches"

python3 - "$SMOKE_ROOT/supabase/config.toml" "$SMOKE_PROJECT_ID" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
project_id = sys.argv[2]
text = path.read_text()
updated, count = re.subn(
    r'^project_id\s*=\s*".*"',
    f'project_id = "{project_id}"',
    text,
    count=1,
    flags=re.M,
)
if count != 1:
    raise SystemExit("could not isolate project_id in the smoke config.toml")
path.write_text(updated)
PY

echo "== Fresh-apply smoke test (local only) =="
echo "    project_id: ${SMOKE_PROJECT_ID}"
echo "    workdir:    ${SMOKE_ROOT}"
echo "    reset:      supabase db reset --local --yes --no-seed"
echo "[1/4] Stopping leftover isolated smoke stack only (not --all)..."
supabase stop --project-id "$SMOKE_PROJECT_ID" --no-backup >/dev/null 2>&1 || true

echo "[2/4] Starting isolated local Supabase (Postgres + Auth)..."
# Optional containers are excluded so a non-essential health flake does not
# look like a migration failure. Core db/auth must still come up.
supabase --workdir "$SMOKE_ROOT" start -x edge_runtime,imgproxy,vector,pooler --ignore-health-check

echo "[3/4] Resetting the LOCAL database with committed migrations..."
# Fail-closed: --local only. Never --linked, --db-url, or --project-ref.
supabase --workdir "$SMOKE_ROOT" db reset --local --yes --no-seed

echo "[4/4] Running static guards against the live-applied schema..."
npm run supabase:validate
npm run supabase:invariants

echo ""
echo "✅ Fresh apply succeeded: all $(find "$REPO_ROOT/supabase/migrations" -name '*.sql' | wc -l | tr -d ' ') migrations applied in order, schema passes validate + invariants."

if [ "$KEEP_STACK" = "keep" ]; then
  echo "   (isolated stack left running — stop with: supabase stop --project-id ${SMOKE_PROJECT_ID})"
  trap - EXIT
else
  echo "[teardown] stopping isolated project ${SMOKE_PROJECT_ID} only..."
  supabase stop --project-id "$SMOKE_PROJECT_ID" --no-backup >/dev/null 2>&1 || true
fi
