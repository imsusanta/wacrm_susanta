#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${HELPA_FULL_MIGRATION_APPROVED:-}" != "1" ]]; then
  echo "Set HELPA_FULL_MIGRATION_APPROVED=1 to create and destroy an isolated LOCAL test stack." >&2
  exit 1
fi
command -v supabase >/dev/null
command -v docker >/dev/null
command -v node >/dev/null
docker info >/dev/null
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
scratch="$(mktemp -d "${TMPDIR:-/tmp}/helpa-full-migrations-XXXXXXXX")"
project="helpa-verify-$(date +%s)-${RANDOM}"
mkdir -p "$scratch/supabase" "$scratch/evidence"

cleanup() {
  status=$?
  trap - EXIT
  # Only the unique scratch project is stopped; no linked-project commands,
  # shared repository project resets, or remote-first fallbacks are used.
  supabase stop --no-backup --workdir "$scratch" >>"$scratch/evidence/teardown.private.log" 2>&1 || true
  printf 'Verification exit code: %s\nPrivate evidence directory: %s\n' "$status" "$scratch/evidence"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

node - "$root" "$scratch" "$project" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [root, scratch, project] = process.argv.slice(2);
const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
if (!/^project_id\s*=/m.test(config)) throw new Error('Project ID missing');
fs.writeFileSync(path.join(scratch, 'supabase/config.toml'),
  config.replace(/^project_id\s*=.*$/m, `project_id = "${project}"`)
    .replace(/^sql_paths\s*=.*$/m, 'sql_paths = []'));
const source = path.join(root, 'supabase/migrations');
const destination = path.join(scratch, 'supabase/migrations');
fs.cpSync(source, destination, { recursive: true });
const migrations = fs.readdirSync(destination).filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
if (!migrations.length) throw new Error('No migrations');
const manifest = migrations.map((name) => ({
  name,
  sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(destination, name))).digest('hex'),
}));
fs.writeFileSync(path.join(scratch, 'evidence/migration-manifest.json'), JSON.stringify(manifest, null, 2));
JS

supabase --version > "$scratch/evidence/cli-version.txt"
# Raw CLI logs are private: even a local successful start can print test keys.
# The full source migration set stays in place. Nothing is skipped or repaired.
supabase start --workdir "$scratch" \
  --exclude studio,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,mailpit \
  > "$scratch/evidence/start.private.log" 2>&1
supabase db reset --local --no-seed --workdir "$scratch" \
  > "$scratch/evidence/migrations.private.log" 2>&1
echo "All committed migrations applied successfully to an isolated local Supabase database."
echo "This does not verify a legacy upgrade baseline, deployed permissions, or authenticated HTTP behavior."