# ADR 004: Canonical `account_members` and local-only migration reset

## Status

Accepted (2026-09-07). Enforcement of the smoke-script safety rules is in
`scripts/supabase-fresh-smoke.sh` and
`src/tests/architecture/supabase-fresh-smoke.test.ts`.

## Context

Two committed migrations disagree about the shape of `public.account_members`:

1. `supabase/migrations/20260814000000_canonical_tenant_cutover.sql`
   creates **`account_members` as a TABLE** (`account_id`, `user_id`, `role`,
   `active`, timestamps) with RLS and helper functions
   (`is_active_account_member`, `has_account_role`).
2. `supabase/migrations/20260815100000_account_members_view.sql`
   runs `CREATE OR REPLACE VIEW public.account_members AS SELECT … FROM
   public.profiles`.

PostgreSQL cannot replace a table with a view. A fresh apply of the committed
migration chain therefore fails at the second file if the cutover table already
exists.

Later migrations treat membership as a **table**:

- `20260822120500_fix_account_members_security_invoker.sql` only alters a view
  when `pg_views` says one exists (no-op if the relation is a table).
- `20260825130000_auth_account_columns_and_triggers.sql` and
  `20260826140000_fix_handle_new_user_subscription_provisioning.sql`
  `INSERT INTO public.account_members (…)`.

`scripts/setup-local-supabase.sh` already documents a second, **non-canonical**
local path: it starts the stack with an empty migrations directory, applies
`scripts/supabase_schema_complete.sql` (which does not define
`account_members`), then applies the profiles-backed **view**. That path is a
developer convenience. It is not the production cutover schema and must not be
used as the source for generated TypeScript database types.

The previous smoke script was unsafe:

```bash
supabase stop --no-backup          # any default local project, deletes volumes
supabase db reset --linked … || supabase db reset
```

Supabase CLI 2.116.0 (`supabase db reset --help`) exposes `--linked`,
`--db-url`, `--project-ref`, and `--local`. `--linked` resets the **linked
remote project**. The `||` fallback meant a failed remote reset still continued
locally, but a successful `--linked` reset would wipe a remote database.

## Decision

1. **Canonical membership relation is the TABLE** created by
   `20260814000000_canonical_tenant_cutover.sql`. Application code and later
   migrations that insert into `account_members` depend on that table.
2. **Do not rewrite the historical view migration in this increment.** Editing
   an already-shipped filename changes Supabase migration checksums on linked
   projects. Repair belongs in a separately authorized forward migration after
   a local fresh-apply has been observed.
3. **`scripts/supabase-fresh-smoke.sh` is local-only and fail-closed:**
   - Refuse `--linked`, `--db-url`, `--project-ref`, and `stop --all`.
   - Require explicit `HELPA_ALLOW_LOCAL_DB_RESET=1`.
   - Use an isolated local project id (`helpa-fresh-smoke`) via `--workdir`
     plus `stop --project-id`. Do not stop unrelated stacks.
   - Reset only with `supabase db reset --local`.
4. **Generated database types (Phase 3) wait** until a local migration-chain
   apply of the canonical TABLE schema is verified. Do not generate types from
   the snapshot+view developer path or from a remote/linked project.

## Consequences

- **Positive:** Operators cannot reset a linked or remote database through the
  npm `supabase:fresh` entrypoints.
- **Positive:** The table-vs-view conflict is an explicit, tested fact instead
  of a silent fresh-apply failure.
- **Negative:** `npm run supabase:fresh` now exits non-zero unless the opt-in
  env var is set. That is intentional.
- **Negative:** Local verification of the full migration chain remains blocked
  until a forward repair for `20260815100000` is authorized and applied.
- **Negative:** `scripts/supabase_schema_complete.sql` plus the membership view
  remains a divergent local-dev schema. It must not be treated as production
  truth.

## Observed local environment (2026-09-07)

Read-only inspection of the already-running `wacrm` stack
(`docker exec supabase_db_wacrm psql`):

- `public.account_members` is a **view** over `profiles` (`relkind = v`).
- `supabase_migrations.schema_migrations` is absent. The committed migration
  chain was not applied (matches `scripts/setup-local-supabase.sh`, which
  empties `supabase/migrations` before `supabase start`).
- Isolated smoke (`HELPA_ALLOW_LOCAL_DB_RESET=1`, project id
  `helpa-fresh-smoke`) **did not** stop `wacrm`. It failed closed when binding
  `0.0.0.0:54322` because that port is already allocated. Exit code 1.
- Dummy CI `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` is refused
  (exit 2) before any Docker work.

**Phase 3 blocker:** do not generate `src/types/database.generated.ts` from this
local view-shaped schema or from a remote/linked project. Canonical types
require a verified local apply of the cutover **table** chain.
