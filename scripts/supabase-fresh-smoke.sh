#!/usr/bin/env bash
# Destructive LOCAL-ONLY migration smoke test. Never targets a linked project.
# Applying migrations proves the local reset succeeds; the subsequent Node
# scripts are STATIC checks of committed files, not live RLS behavior tests.
#
# Requires Supabase CLI and Docker. This deletes this project's local DB data.
# Explicit acknowledgement is mandatory, including in CI:
#   HELPA_ALLOW_LOCAL_DB_RESET=1 npm run supabase:fresh
#   HELPA_ALLOW_LOCAL_DB_RESET=1 npm run supabase:fresh:keep
set -euo pipefail

KEEP_STACK="${1:-}"
if [[ "$#" -gt 1 || ( -n "$KEEP_STACK" && "$KEEP_STACK" != "keep" ) ]]; then
  echo "Usage: HELPA_ALLOW_LOCAL_DB_RESET=1 bash scripts/supabase-fresh-smoke.sh [keep]" >&2
  exit 64
fi
if [[ "${HELPA_ALLOW_LOCAL_DB_RESET:-}" != "1" ]]; then
  echo "Refusing to delete local database data without HELPA_ALLOW_LOCAL_DB_RESET=1." >&2
  exit 1
fi
if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found; install it before running this local smoke test." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running; start it before running this local smoke test." >&2
  exit 1
fi

cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$KEEP_STACK" != "keep" || "$status" -ne 0 ]]; then
    echo "[teardown] Stopping the local stack..."
    supabase stop --no-backup >/dev/null 2>&1 || true
  else
    echo "Local stack left running; use 'supabase stop' when done."
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "== LOCAL-ONLY fresh-apply smoke test =="
echo "[1/4] Removing this project's existing local stack and data..."
supabase stop --no-backup >/dev/null 2>&1 || true

echo "[2/4] Starting local Supabase..."
supabase start

echo "[3/4] Applying migrations to the LOCAL database..."
# Do not use a linked-project flag, remote URL, or a remote-first fallback.
supabase db reset --local

echo "[4/4] Running static guards on committed migration files..."
npm run supabase:validate
npm run supabase:invariants

echo "Local migration reset and static guards succeeded."
echo "Live cross-tenant, RLS, payment, and concurrency tests are still separate release gates."
