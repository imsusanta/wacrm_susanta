import fs from 'node:fs';
import path from 'node:path';

/**
 * Schema-invariant guard: every table that declares at least one RLS policy
 * must also ENABLE ROW LEVEL SECURITY, and every UPDATE policy must carry
 * both USING and WITH CHECK.
 *
 * Rationale: PR #209 found tables with reviewed, correct policies where the
 * table-level `ENABLE ROW LEVEL SECURITY` flag was missing — on Postgres,
 * policies on an RLS-disabled table are completely inert, so any
 * authenticated client could read/write cross-tenant rows. Policies are
 * also forbidden from being written as permissive catch-alls
 * (`USING (true)` / `WITH CHECK (true)`).
 *
 * This check is static (migration files are the schema source of truth) and
 * runs in CI via npm run supabase:invariants. It is a property test on the
 * schema, not a behavior test: the invariant "policies imply enforcement"
 * must hold for every migration, present and future.
 *
 * Known limitation (documented): policies applied through the dynamic
 * `_apply_optional_rls_policy()` helper (20260822123000_optimize_rls_performance)
 * target tables that may be created in later migrations, so they cannot be
 * resolved statically. The live database is the source of truth for those;
 * verify with:
 *   select relname from pg_class where relrowsecurity = false
 *     and relkind = 'r' and relnamespace = 'public'::regnamespace;
 */

const dir = path.join(process.cwd(), 'supabase', 'migrations');

if (!fs.existsSync(dir)) {
  throw new Error('MIGRATIONS_DIRECTORY_MISSING');
}

const files = fs
  .readdirSync(dir)
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();

if (files.length === 0) throw new Error('NO_MIGRATIONS_FOUND');

const problems = [];

// Track per-table RLS state across the concatenated migration history.
const rlsEnabled = new Map(); // table -> migration that enabled RLS
const tablesWithPolicies = new Map(); // table -> Set<migration>
const updatePolicies = new Map(); // "table|policy" -> { using, withCheck }

const CREATE_TABLE_RE =
  /create table(?: if not exists)?\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi;
const RLS_STATE_RE =
  /alter\s+table(?:\s+if\s+exists)?\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s+(enable|disable)\s+row\s+level\s+security/gi;
const CREATE_POLICY_RE =
  /create\s+policy\s+("[^"]+"|[a-z_][a-z0-9_]*)\s+on\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?(?=\s|[;(]|$)/gi;
const UPDATE_POLICY_RE =
  /create\s+policy\s+("[^"]+"|[a-z_][a-z0-9_]*)\s+on\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?(?=\s|[;(]|$)[^;]*?\bfor\s+update\b/gi;
const DROP_POLICY_RE =
  /drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[a-z_][a-z0-9_]*)\s+on\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?(?=\s|[;(]|$)/gi;
const HELPER_POLICY_RE =
  /_apply_optional_rls_policy\('public\.([a-z_][a-z0-9_]*)'\s*,\s*\$policy_sql\$\s*CREATE POLICY/gi;
const USING_RE = /\busing\s*\(/i;
const WITH_CHECK_RE = /\bwith\s+check\s*\(/i;

// Preserve SQL strings and identifiers, but do not let comments impersonate
// clauses or executable policies. Dynamic SQL still needs database-level tests.
function withoutComments(sql) {
  return sql.replace(
    /'(?:''|[^'])*'|"(?:\"\"|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\//g,
    (token) =>
      token.startsWith('--') || token.startsWith('/*')
        ? token.replace(/[^\n]/g, ' ')
        : token
  );
}

function policyKey(table, policy) {
  const name = policy.startsWith('"')
    ? policy.slice(1, -1)
    : policy.toLowerCase();
  return `${table.toLowerCase()}|${name}`;
}

for (const file of files) {
  const sql = withoutComments(fs.readFileSync(path.join(dir, file), 'utf8'));
  const rel = path.relative(process.cwd(), path.join(dir, file));

  for (const m of sql.matchAll(CREATE_TABLE_RE)) {
    const table = m[1].toLowerCase();
    if (!rlsEnabled.has(table)) rlsEnabled.set(table, null);
    if (!tablesWithPolicies.has(table))
      tablesWithPolicies.set(table, new Set());
  }

  for (const m of sql.matchAll(RLS_STATE_RE)) {
    rlsEnabled.set(
      m[1].toLowerCase(),
      m[2].toLowerCase() === 'enable' ? rel : null
    );
  }

  // Policies installed through the dynamic helper target tables that may not
  // exist at this point in the ordered history; static resolution is
  // impossible, so they are excluded from the flag invariant.
  const helperTables = new Set();
  for (const m of sql.matchAll(HELPER_POLICY_RE)) {
    helperTables.add(m[1].toLowerCase());
  }

  for (const m of sql.matchAll(CREATE_POLICY_RE)) {
    const [, , table] = m;
    const t = table.toLowerCase();
    if (helperTables.has(t)) continue;
    if (!rlsEnabled.has(t)) rlsEnabled.set(t, null);
    if (!tablesWithPolicies.has(t)) tablesWithPolicies.set(t, new Set());
    tablesWithPolicies.get(t).add(rel);
  }

  // For UPDATE policies, inspect the full statement for USING / WITH CHECK.
  const statements = sql.split(';');
  for (const stmt of statements) {
    for (const [, policy, table] of stmt.matchAll(DROP_POLICY_RE)) {
      updatePolicies.delete(policyKey(table, policy));
    }
    // String.match(/.../g) returns full matches, NOT capture groups.
    // matchAll retains the policy/table groups and checks every match.
    for (const [, policy, table] of stmt.matchAll(UPDATE_POLICY_RE)) {
      if (helperTables.has(table.toLowerCase())) continue;
      const clauses = stmt.replace(/'(?:''|[^'])*'/g, "''");
      updatePolicies.set(policyKey(table, policy), {
        using: USING_RE.test(clauses),
        withCheck: WITH_CHECK_RE.test(clauses),
      });
    }
  }

  // Permissive catch-alls stay forbidden (carried over from validate script).
  // The single known exception is system_settings' SELECT-only authenticated
  // read policy (20260826152728): no write path exists (service-role only by
  // design) and secrets are filtered at the API layer — surfaced as a
  // warning, not a gate failure.
  const permissiveMatches = sql.match(
    /\b(?:using|with\s+check)\s*\(\s*true\s*\)/gi
  );
  if (permissiveMatches) {
    const isKnownException =
      rel.endsWith('20260826152728_restore_system_ai_settings.sql') &&
      permissiveMatches.length === 1 &&
      /for\s+select/i.test(sql);
    if (isKnownException) {
      console.warn(
        `  ⚠ accepted exception: ${rel} uses a SELECT-only USING (true) policy (no write path, no secrets exposure)`
      );
    } else {
      problems.push(
        `${rel}: PERMISSIVE_RLS_POLICY_FORBIDDEN (USING/WITH CHECK (true))`
      );
    }
  }
}

// Invariant 1: the last explicit RLS state must be ENABLE, not DISABLE.
for (const [table, migrations] of tablesWithPolicies) {
  if (migrations.size === 0) continue;
  if (!rlsEnabled.get(table)) {
    problems.push(
      `RLS_FLAG_MISSING: table "${table}" has policies in ${[...migrations].join(', ')} but its final explicit RLS state is not ENABLE (policies are inert)`
    );
  }
}

// Invariant 2: every UPDATE policy must declare both USING and WITH CHECK.
for (const [key, clauses] of updatePolicies) {
  if (!clauses.using || !clauses.withCheck) {
    const missing = [
      !clauses.using ? 'USING' : null,
      !clauses.withCheck ? 'WITH CHECK' : null,
    ]
      .filter(Boolean)
      .join(' and ');
    problems.push(`UPDATE_POLICY_INCOMPLETE: "${key}" is missing ${missing}`);
  }
}

if (problems.length > 0) {
  console.error(`\nRLS invariant violations (${problems.length}):
`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error(
    '\nPolicies on an RLS-disabled table are inert — add "ALTER TABLE ... ENABLE ROW LEVEL SECURITY" and pair every UPDATE policy USING with WITH CHECK.'
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: 'ok',
    checkedMigrations: files.length,
    tablesWithPolicies: [...tablesWithPolicies.keys()],
    updatePoliciesChecked: updatePolicies.size,
    invariants: [
      'policy-bearing tables must ENABLE ROW LEVEL SECURITY',
      'UPDATE policies must pair USING with WITH CHECK',
      'no permissive (true) catch-all policies',
    ],
  })
);
