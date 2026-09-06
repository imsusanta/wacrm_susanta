import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(
  new URL('../check-rls-invariants.mjs', import.meta.url)
);
const setup = `
create table public.patients (id uuid, account_id uuid);
alter table public.patients enable row level security;
`;
const predicate = 'account_id = auth.uid()';
const valid = `create policy patient_update on public.patients for update
using (${predicate}) with check (${predicate});`;

function run(migrations) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'helpa-rls-test-'));
  try {
    const dir = path.join(root, 'supabase', 'migrations');
    fs.mkdirSync(dir, { recursive: true });
    migrations.forEach((sql, index) => {
      fs.writeFileSync(
        path.join(
          dir,
          `202609${String(index + 1).padStart(2, '0')}000000_fixture.sql`
        ),
        sql
      );
    });
    const result = spawnSync(process.execPath, [checker], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.ifError(result.error);
    return result;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('counts valid UPDATE policies instead of silently checking zero', () => {
  const result = run([setup + valid]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).updatePoliciesChecked, 1);
});

for (const [name, clauses, missing] of [
  ['USING only', `using (${predicate})`, 'WITH CHECK'],
  ['WITH CHECK only', `with check (${predicate})`, 'USING'],
  ['no clauses', '', 'USING and WITH CHECK'],
]) {
  test(`rejects an UPDATE policy with ${name}`, () => {
    const result = run([
      `${setup} create policy p on public.patients for update ${clauses};`,
    ]);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(`missing ${missing}`), result.stderr);
  });
}

test('checks multiline UPDATE and quoted policy names with spaces', () => {
  const result = run([
    `${setup} create policy "Patient updates" on public."patients"
    for
    update to authenticated using (${predicate});`,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /patients\|Patient updates.*WITH CHECK/);
});

test('comments and string values cannot satisfy missing clauses', () => {
  const result = run([
    `${setup} create policy p on public.patients for update
    -- WITH CHECK (account_id = auth.uid())
    using (${predicate} and 'with check (' <> '');
    /* create policy fake on public.patients for update with check (true); */`,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /UPDATE_POLICY_INCOMPLETE.*WITH CHECK/);
  assert.doesNotMatch(result.stderr, /PERMISSIVE_RLS_POLICY_FORBIDDEN/);
});

test('a replacement cannot inherit clauses from an earlier policy', () => {
  const result = run([
    setup + valid,
    `drop policy patient_update on public.patients;
     create policy patient_update on public.patients for update using (${predicate});`,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /UPDATE_POLICY_INCOMPLETE/);
});

test('a dropped UPDATE policy is not counted as an active policy', () => {
  const result = run([
    setup + valid,
    'drop policy patient_update on public.patients;',
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).updatePoliciesChecked, 0);
});

test('a later DISABLE RLS fails the table invariant', () => {
  const result = run([
    setup + valid,
    'alter table public.patients disable row level security;',
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /RLS_FLAG_MISSING/);
});

test('commented ENABLE RLS cannot satisfy the invariant', () => {
  const result = run([
    `
    create table public.patients (id uuid, account_id uuid);
    -- alter table public.patients enable row level security;
    ${valid}`,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /RLS_FLAG_MISSING/);
});

test('permissive policies still fail', () => {
  const result = run([
    `${setup} create policy p on public.patients for update using (true) with check (true);`,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /PERMISSIVE_RLS_POLICY_FORBIDDEN/);
});

test('does not misidentify a managed schema as a public table', () => {
  const result = run([
    `${setup}${valid}
     create policy "Storage updates" on storage.objects
     for update using (owner = auth.uid()) with check (owner = auth.uid());`,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).updatePoliciesChecked, 1);
});

test('retains capture groups for multiple policies', () => {
  const result = run([
    `${setup}${valid}
     create policy second_update on public.patients for update
     using (${predicate}) with check (${predicate});`,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).updatePoliciesChecked, 2);
});
