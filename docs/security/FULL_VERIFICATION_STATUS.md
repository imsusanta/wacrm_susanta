# Full security verification — execution status

## Reviewed candidate

- Repository: `imsusanta/helpa`
- Candidate: `14ffa8314b813122b2b8714ef48f8e579fac63f1` on PR #253's hardening branch.
- Scope: migration replay, authenticated two-tenant HTTP verification preparation,
  deployed-permissions audit preparation, and independent-review handoff.
- No production database, customer data, payments, or external review contract
  was accessed or changed.

## Release gates

| Gate | Actual status | Evidence / next action |
| --- | --- | --- |
| Complete migration history, fresh Supabase baseline | **FAILED** | The second migration fails with SQLSTATE `42703`: `profiles.id` does not exist. |
| Complete migration history, existing legacy baseline | **NOT RUN** | Requires an authoritative schema-only pre-cutover baseline and its applied migration versions. |
| Authenticated two-tenant HTTP tests | **BLOCKED / RUNNER PREPARED** | A coherent migrated schema and three synthetic real-auth identities are prerequisites. No passing E2E result is claimed. |
| Deployed permission inventory | **BLOCKED / QUERY PREPARED** | Requires a project-scoped read-only Supabase connection or a reviewed metadata-only audit export. |
| Independent security assessment | **NOT PERFORMED** | Requires a separately authorized independent assessor and signed findings/retest evidence. |

## Full-history execution evidence

The 56 migration files were copied byte-for-byte into a new local Supabase
project with a distinct project ID. No repository migration was edited, moved
out of the migration set, or skipped. No schema snapshot was substituted.

- Supabase CLI: `2.116.0`, downloaded from the official release with SHA-256 verification.
- Local database image: `public.ecr.aws/supabase/postgres:17.6.1.165`.
- Engine: real local Supabase Auth / REST / database stack, not a query-builder mock.
- Command: `supabase db reset --local --no-seed` against the isolated project.
- Exit code: `1`.

```text
Applying migration 20260814000000_canonical_tenant_cutover.sql...
Applying migration 20260815100000_account_members_view.sql...
ERROR: column "id" does not exist (SQLSTATE 42703)
At statement: 0
CREATE OR REPLACE VIEW public.account_members AS
SELECT
  id,
  ^
```

The first migration creates a `profiles` table without `id`, `account_id`,
`account_role`, or `role`, and creates `account_members` as a table.
The next migration assumes those profile columns exist and attempts to create
a view with the `account_members` name. The initial failure is reproducible;
fixing only the first missing column is not proof that the rest of the
migration chain is valid.

The existing local setup script explicitly describes the migration directory
as an overlay requiring a legacy database and uses a snapshot instead. That
bootstrap is not evidence of a successful complete migration replay.

### Required migration decision

Choose and document the supported starting states:

1. Fresh Supabase installation: supply a reviewed baseline and an ordered
   migration path that succeeds from empty.
2. Existing legacy installation: provide a **schema-only** snapshot and
   migration-version inventory from the actual pre-cutover state.

Preserve applied migration history and data semantics. Do not suppress SQL
errors, blindly replace membership tables with views, or silently discard
revocation state merely to turn a CI check green.

## Prepared tools

### Complete migration replay

```bash
HELPA_FULL_MIGRATION_APPROVED=1 \
bash scripts/security/verify-complete-migrations.sh
```

Requires Docker, Supabase CLI, Node, and free local Supabase ports. Creates a
unique temporary project; never links to or resets a remote project. It copies
all migration files, writes a SHA-256 manifest, and keeps raw CLI logs private
because local keys may be printed. This runner is syntax/guard checked; the
full-history failure above was captured with the equivalent isolated CLI run.

### Authenticated two-tenant HTTP verification

The runner uses real Supabase password authentication and SSR cookies. It
requires successful application identity/tenant checks, same-tenant positive
controls, and a separate synthetic platform-admin positive control.

It covers patient search, patient exports, appointment PDF access, billing
list isolation, and platform-admin access restrictions. It does **not** claim
complete CRUD, storage signed-link, role-revocation, or concurrent-session
coverage. Those remain additional release gates.

Provision fixture records only after a coherent schema is established. Store
the fixture JSON **outside the repository**, mode `0600`, with:

- `syntheticOnly: true`
- `appOrigin`, `supabaseOrigin`, `publishableKey` (publishable/anon key, not service role)
- `tenants`: exactly two objects containing `userId`, `accountId`, `contactId`,
  `patientId`, `appointmentId`, `billId`, `searchTerm`, `email`, and `password`
- `platformAdmin`: a third synthetic identity with `userId`, `email`, and `password`

Both tenant identities must be health-workspace owners/admins, not platform
super-admins. Fixtures must contain distinct known records and unique search
terms. Export requests create audit events. No billing mutation, payment,
patient deletion, or real WhatsApp send is performed.

```bash
HELPA_SYNTHETIC_TESTS_APPROVED=1 \
HELPA_TWO_TENANT_FIXTURE_FILE=/secure/path/synthetic-fixtures.json \
node scripts/security/authenticated-two-tenant.mjs
```

Remote staging additionally requires exact
`HELPA_APPROVED_STAGING_APP_ORIGIN` and
`HELPA_APPROVED_STAGING_SUPABASE_ORIGIN` allowlists. Do not approve production
origins or provide real patient fixtures. Reports contain test labels/results,
not tokens, emails, response bodies, or patient fields.

### Deployed permissions

Run `scripts/security/deployed-permissions.sql` through a project-scoped
read-only Supabase connection. It inventories relations, RLS, view options,
policy expressions, effective function EXECUTE privileges, and sensitive
column grants. It selects no application rows or function bodies.

The SQL was syntax-executed against the local partial test database only.
That is **not a deployed-environment assessment**.

Review the inventory against the approved release and inspect compatibility
views, persisted memberships, stale JWT handling, anonymous grants, and
privileged RPC exposure. Record the deployed application commit and database
migration versions. Do not attach raw credentials or customer data.

## Independent assessment handoff

Use this execution status to qualify the existing external-review package.
Historical claims of complete table coverage or remediated boundaries must
be independently reverified; they are not attestation.

Before sharing access or commissioning work, the owner must approve:

- Assessor/firm identity, qualifications, and independence.
- Target staging and production scope, permitted tests, and testing window.
- Synthetic fixture policy; no access to customer data by default.
- Read-only deployment inspection and any separately approved active testing.
- Commercial terms, confidentiality, and reporting/disclosure arrangements.

Provide the approved source commit, migration manifest, schema-only baseline,
sanitized findings, permission inventory, and authentic E2E results. Require a
written findings report, remediation retest, and dated sign-off. The implementer
must not sign its own work as an independent reviewer.

**No 9+ security rating, compliance certification, full verification, or external
sign-off is claimed by this package.**