# Tenant security regression gates

## Scope and dependency

This follow-up is based on security PR #253, commit
`8497b8d46c09d4c0abe4f9d1a3a31ee5da1e9c39`. It does not duplicate that PR's
outbox authorization, payload-hash, or membership-policy changes. Land those
changes first, or stack this patch on that branch.

This is regression coverage, not a 9/10 certification, penetration test, or
evidence that the complete deployed system is secure.

## Checks

- `node --test scripts/tests/rls-invariants.test.mjs` tests the static validator
  with valid and deliberately invalid migrations.
- `node scripts/check-rls-invariants.mjs` checks the repository's public-table
  migration invariants. UPDATE policies are now actually counted. Policy
  replacement cannot inherit checks from a prior definition; a later
  `DISABLE ROW LEVEL SECURITY` is rejected.
- `bash scripts/test-tenant-security.sh` executes real PostgreSQL ACL, RLS,
  role-downgrade, revocation, and outbox-idempotency checks using two synthetic
  tenants and positive controls.
- `.github/workflows/tenant-security.yml` runs these gates with disposable
  PostgreSQL 15 in CI. No Supabase or WhatsApp credentials are needed.

## Local database test

Install PostgreSQL 15+ including the `pgcrypto` extension. Create an **empty,
disposable** database named `helpa_security_test` in a local test cluster.
Then run:

```bash
HELPA_SECURITY_TEST_DATABASE=1 \
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres \
bash scripts/test-tenant-security.sh
```

Use standard PostgreSQL password handling for your local cluster if needed.
The runner refuses remote hosts and non-empty databases. It never resets a
database. For another run, manually recreate only this disposable test
database. Do not point the test at any production or staging cluster.

## What the database harness does and does not prove

It applies the exact canonical tenant, transactional outbox, outbox
reconciliation, and membership-backed RLS migrations to PostgreSQL, with
minimal synthetic auth helpers and compatibility columns. It tests actual
role permissions and policies, not mocked query builders.

It does **not** apply the complete historical migration chain. In particular,
the minimal fixture uses canonical `account_members` rows, not the historical
profile-backed compatibility view. It does not test Supabase JWT validation,
the HTTP authorization layer, all application tables, simultaneous database
sessions, or a real WhatsApp provider.

The static migration checker is deliberately bounded and not a PostgreSQL
parser. Dynamic SQL, managed schemas such as `storage`, and full live schema
state require separate database inspection/tests. Do not interpret a green
static check as proof of complete tenant isolation.

## Before considering a 9+ security assessment

1. Review and merge the underlying security fixes and this follow-up.
2. Apply the complete migration chain to an isolated Supabase environment;
   investigate compatibility-view and schema-history failures rather than
   skipping them.
3. Run authenticated two-tenant HTTP and database tests for patient records,
   documents, exports, inbox, billing, and administrative routes.
4. Verify membership revocation with real sessions and all active policies,
   including compatibility views and stale JWT metadata.
5. Inspect effective deployed function grants, RLS policies, secret handling,
   rate limits, audit retention, backup/restore, and dependency findings.
6. Obtain an independent security assessment and retest high-severity fixes.