#!/usr/bin/env bash
set -euo pipefail

# Runs real PostgreSQL permissions/RLS tests on an EMPTY, disposable database.
# No production connection strings, hosted databases, resets, or patient data.
if [[ "${HELPA_SECURITY_TEST_DATABASE:-}" != "1" ]]; then
  echo "Set HELPA_SECURITY_TEST_DATABASE=1 to acknowledge the disposable test database." >&2
  exit 1
fi
host="${PGHOST:-127.0.0.1}"
case "$host" in
  localhost|127.0.0.1|::1|/data/helpa-pg/socket) ;;
  *) echo "Refusing a non-local database host." >&2; exit 1 ;;
esac
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
psql_cmd=(psql -X --no-password -v ON_ERROR_STOP=1 -h "$host"
  -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" -d helpa_security_test)
tables="$("${psql_cmd[@]}" -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth') and c.relkind in ('r','v','m','p');")"
if [[ "$tables" != "0" ]]; then
  echo "Refusing to modify a non-empty database. Create a new disposable helpa_security_test database." >&2
  exit 1
fi

"${psql_cmd[@]}" -f scripts/tests/tenant-security/bootstrap.sql
"${psql_cmd[@]}" -f supabase/migrations/20260814000000_canonical_tenant_cutover.sql
"${psql_cmd[@]}" -f scripts/tests/tenant-security/compatibility.sql
"${psql_cmd[@]}" -f supabase/migrations/20260905000000_transactional_whatsapp_outbox.sql
"${psql_cmd[@]}" -f supabase/migrations/20260905140000_whatsapp_outbox_reconciliation.sql
"${psql_cmd[@]}" -f supabase/migrations/20260905170000_membership_backed_rls.sql
"${psql_cmd[@]}" -f scripts/tests/tenant-security/assertions.sql