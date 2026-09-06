import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(
  new URL('../supabase-fresh-smoke.sh', import.meta.url)
);

function exercise({
  acknowledge = false,
  keep = false,
  failReset = false,
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'helpa-smoke-safety-'));
  try {
    const bin = join(dir, 'bin');
    const log = join(dir, 'commands.log');
    mkdirSync(bin);
    writeFileSync(
      join(bin, 'supabase'),
      `#!/bin/sh
printf 'supabase %s\\n' "$*" >> "$HELPA_TEST_COMMAND_LOG"
if [ "$1" = "db" ] && [ "$2" = "reset" ]; then
  [ "$3" = "--local" ] || exit 99
  [ "$HELPA_TEST_RESET_FAIL" != "1" ] || exit 42
fi
exit 0
`,
      { mode: 0o755 }
    );
    for (const name of ['docker', 'npm']) {
      writeFileSync(
        join(bin, name),
        `#!/bin/sh\nprintf '${name} %s\\n' "$*" >> "$HELPA_TEST_COMMAND_LOG"\nexit 0\n`,
        { mode: 0o755 }
      );
    }
    const result = spawnSync('bash', [script, ...(keep ? ['keep'] : [])], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH || ''}`,
        HELPA_ALLOW_LOCAL_DB_RESET: acknowledge ? '1' : '',
        HELPA_TEST_COMMAND_LOG: log,
        HELPA_TEST_RESET_FAIL: failReset ? '1' : '',
      },
    });
    const commands = existsSync(log)
      ? readFileSync(log, 'utf8').trim().split('\n')
      : [];
    return { ...result, commands };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('requires acknowledgement before invoking any infrastructure command', () => {
  const result = exercise();
  assert.equal(result.status, 1);
  assert.deepEqual(result.commands, []);
  assert.match(result.stderr, /HELPA_ALLOW_LOCAL_DB_RESET=1/);
});

test('reset is explicitly local and never falls back to a remote target', () => {
  const result = exercise({ acknowledge: true });
  assert.equal(result.status, 0);
  assert.deepEqual(
    result.commands.filter((line) => line.startsWith('supabase db reset')),
    ['supabase db reset --local']
  );
  assert.ok(
    result.commands.every(
      (line) => !line.includes('--linked') && !line.includes('--db-url')
    )
  );
  assert.equal(
    result.commands.filter((line) => line === 'supabase stop --no-backup')
      .length,
    2
  );
  assert.ok(result.commands.includes('npm run supabase:validate'));
  assert.ok(result.commands.includes('npm run supabase:invariants'));
});

test('a migration failure remains a failure, is not retried remotely, and cleans up', () => {
  const result = exercise({ acknowledge: true, failReset: true });
  assert.equal(result.status, 42);
  assert.equal(
    result.commands.filter((line) => line.startsWith('supabase db reset'))
      .length,
    1
  );
  assert.equal(result.commands.at(-1), 'supabase stop --no-backup');
  assert.ok(!result.commands.includes('npm run supabase:validate'));
});

test('keep mode leaves only a successful local stack running', () => {
  const result = exercise({ acknowledge: true, keep: true });
  assert.equal(result.status, 0);
  assert.equal(
    result.commands.filter((line) => line === 'supabase stop --no-backup')
      .length,
    1
  );
});

test('keep mode still cleans up after a failed migration', () => {
  const result = exercise({ acknowledge: true, keep: true, failReset: true });
  assert.equal(result.status, 42);
  assert.equal(result.commands.at(-1), 'supabase stop --no-backup');
});
