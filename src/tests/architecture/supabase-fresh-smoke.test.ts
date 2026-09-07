import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCRIPT = fs.readFileSync(
  path.join(ROOT, 'scripts', 'supabase-fresh-smoke.sh'),
  'utf8'
);
const EXECUTABLE = SCRIPT.replace(/#.*$/gm, '');
const CUTOVER = fs.readFileSync(
  path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260814000000_canonical_tenant_cutover.sql'
  ),
  'utf8'
);
const MEMBERS_VIEW = fs.readFileSync(
  path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260815100000_account_members_view.sql'
  ),
  'utf8'
);
const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
) as { scripts: Record<string, string> };

describe('supabase-fresh-smoke local-only contract', () => {
  it('never invokes supabase with linked, remote-url, or all-stack flags', () => {
    expect(EXECUTABLE).not.toMatch(/\bsupabase\b[^\n]*--linked\b/);
    expect(EXECUTABLE).not.toMatch(/\bsupabase\b[^\n]*--db-url\b/);
    expect(EXECUTABLE).not.toMatch(/\bsupabase\b[^\n]*--project-ref\b/);
    expect(EXECUTABLE).not.toMatch(/\bsupabase\b[^\n]*--all\b/);
    expect(EXECUTABLE).toContain(
      'supabase --workdir "$SMOKE_ROOT" db reset --local --yes --no-seed'
    );
    expect(EXECUTABLE).toContain('HELPA_ALLOW_LOCAL_DB_RESET');
    expect(EXECUTABLE).toContain('helpa-fresh-smoke');
    expect(EXECUTABLE).toContain(
      'supabase stop --project-id "$SMOKE_PROJECT_ID"'
    );
    expect(EXECUTABLE).not.toMatch(/\bsupabase stop(?! --project-id)/);
  });

  it('refuses unsafe CLI flags even when they appear as arguments', () => {
    expect(EXECUTABLE).toMatch(
      /--linked \| --db-url \| --project-ref \| --all/
    );
    expect(EXECUTABLE).toContain('refusing unsafe argument');
  });

  it('keeps npm entrypoints pointed at the fail-closed script', () => {
    expect(PACKAGE_JSON.scripts['supabase:fresh']).toBe(
      'bash scripts/supabase-fresh-smoke.sh'
    );
    expect(PACKAGE_JSON.scripts['supabase:fresh:keep']).toBe(
      'bash scripts/supabase-fresh-smoke.sh keep'
    );
  });

  it('documents the table-vs-view collision that blocks a fresh apply', () => {
    expect(CUTOVER).toMatch(
      /create table if not exists public\.account_members/
    );
    expect(MEMBERS_VIEW).toMatch(
      /CREATE OR REPLACE VIEW public\.account_members/
    );
    expect(CUTOVER).toMatch(
      /alter table public\.account_members enable row level security/
    );
  });
});
