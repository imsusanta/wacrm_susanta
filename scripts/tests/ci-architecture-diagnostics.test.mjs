import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHECKS,
  collectDiagnostics,
  renderDiagnostics,
  sanitizeDiagnostic,
} from '../ci-architecture-diagnostics.mjs';

const success = { status: 0, stdout: 'ok', stderr: '' };

test('retains early failure names without exceeding the report bound', () => {
  const results = collectDiagnostics({
    env: {},
    execute: (_command, args) =>
      args[0] === 'test'
        ? {
            status: 1,
            stderr:
              ' FAIL src/tests/first-failure.test.ts > first contract\n' +
              'diagnostic detail\n'.repeat(1000) +
              'Last failure assertion',
          }
        : success,
  });
  const detail = results.find((result) => result.key === 'unit').detail;
  assert.match(detail, /first-failure\.test\.ts/);
  assert.match(detail, /Last failure assertion/);
  assert.ok(detail.length <= 4200);
});

test('executes independent checks without a shell', () => {
  const calls = [];
  const results = collectDiagnostics({
    env: {},
    execute: (command, args, options) => {
      calls.push({ command, args, options });
      return success;
    },
  });
  assert.equal(calls.length, CHECKS.length);
  assert.ok(calls.every((call) => call.command === 'npm'));
  assert.ok(calls.every((call) => call.options.shell === false));
  assert.ok(calls.every((call) => call.options.timeout > 0));
  assert.ok(results.every((result) => result.status === 'passed'));
});

test('a failed check remains failed and does not hide later failures', () => {
  const results = collectDiagnostics({
    env: {},
    execute: (_command, args) =>
      args.includes('format:check') || args.includes('typecheck')
        ? { status: 1, stdout: '', stderr: 'validation failure' }
        : success,
  });
  assert.equal(
    results.find((result) => result.key === 'format').status,
    'failed'
  );
  assert.equal(
    results.find((result) => result.key === 'types').status,
    'failed'
  );
  assert.equal(
    results.find((result) => result.key === 'build').status,
    'passed'
  );
});

test('installation failure marks dependent checks skipped rather than passed', () => {
  let calls = 0;
  const results = collectDiagnostics({
    env: {},
    execute: () => {
      calls++;
      return { status: 1, stderr: 'install failed' };
    },
  });
  assert.equal(calls, 1);
  assert.equal(results[0].status, 'failed');
  assert.ok(results.slice(1).every((result) => result.status === 'skipped'));
});

test('timeouts and signals never become successful checks', () => {
  const results = collectDiagnostics({
    env: {},
    execute: () => ({
      status: null,
      signal: 'SIGTERM',
      error: new Error('timeout'),
    }),
  });
  assert.equal(results[0].status, 'failed');
  assert.match(results[0].detail, /timeout/);
});

test('redacts credentials and neutralizes terminal controls and mentions', () => {
  const output = sanitizeDiagnostic(
    '\u001b[31msecret123456\u001b[0m Bearer abcdefghijkl @everyone ``` <script>',
    { TEST_API_KEY: 'secret123456' }
  );
  assert.ok(!output.includes('secret123456'));
  assert.ok(!output.includes('abcdefghijkl'));
  assert.ok(!output.includes('\u001b'));
  assert.ok(!output.includes('@everyone'));
  assert.ok(!output.includes('```'));
  assert.ok(!output.includes('<script>'));
});

test('limits diagnostics and identifies the exact evaluated commit', () => {
  const results = collectDiagnostics({
    env: {},
    execute: (_command, args) =>
      args[0] === 'ci'
        ? success
        : { status: 1, stderr: 'failure\n'.repeat(5000) },
  });
  assert.ok(results.every((result) => result.detail.length <= 4200));
  const sha = 'a'.repeat(40);
  const report = renderDiagnostics(results, sha);
  assert.ok(report.startsWith('<!-- helpa-architecture-diagnostics -->'));
  assert.ok(report.includes(sha));
  assert.ok(report.includes('Skipped checks are not passes'));
  assert.ok(report.length < 60000);
  assert.ok(!renderDiagnostics(results, '@untrusted').includes('@untrusted'));
});
