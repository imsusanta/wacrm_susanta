import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

export const CHECKS = [
  { key: 'install', label: 'Clean dependency installation', args: ['ci'] },
  { key: 'format', label: 'Formatting', args: ['run', 'format:check'] },
  { key: 'lint', label: 'Strict lint', args: ['run', 'lint'] },
  { key: 'types', label: 'Typecheck', args: ['run', 'typecheck'] },
  { key: 'unit', label: 'Unit tests', args: ['test'] },
  {
    key: 'integration',
    label: 'Tenant isolation tests',
    args: ['run', 'test:integration'],
  },
  {
    key: 'migrations',
    label: 'Migration validation',
    args: ['run', 'supabase:validate'],
  },
  {
    key: 'invariants',
    label: 'RLS invariants',
    args: ['run', 'supabase:invariants'],
  },
  { key: 'build', label: 'Production build', args: ['run', 'build'] },
];

/** Keep diagnostics readable without posting credentials or triggering mentions. */
export function sanitizeDiagnostic(value, env = process.env) {
  let text = stripVTControlCharacters(String(value ?? ''));
  const secrets = Object.entries(env)
    .filter(
      ([key, secret]) =>
        /token|secret|password|credential|api.?key|private.?key/i.test(key) &&
        typeof secret === 'string' &&
        secret.length >= 8
    )
    .map(([, secret]) => secret)
    .sort((a, b) => b.length - a.length);
  for (const secret of secrets) text = text.split(secret).join('[REDACTED]');
  return text
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]+)\b/g,
      '[REDACTED]'
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      '[REDACTED]'
    )
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replaceAll('@', '＠')
    .replaceAll('`', 'ˋ')
    .replaceAll('<', '‹')
    .replaceAll('>', '›');
}

export function collectDiagnostics({
  execute = spawnSync,
  env = process.env,
} = {}) {
  const results = [];
  let installed = false;
  for (const check of CHECKS) {
    if (check.key !== 'install' && !installed) {
      results.push({
        key: check.key,
        label: check.label,
        status: 'skipped',
        detail: 'Dependency installation failed.',
      });
      continue;
    }
    const result = execute('npm', check.args, {
      encoding: 'utf8',
      shell: false,
      timeout:
        check.key === 'build'
          ? 360_000
          : ['install', 'unit', 'integration'].includes(check.key)
            ? 240_000
            : 120_000,
      maxBuffer: 8 * 1024 * 1024,
      env: { ...env, CI: 'true', NO_COLOR: '1' },
    });
    const passed = result.status === 0 && !result.error && !result.signal;
    const raw = [
      result.stdout,
      result.stderr,
      result.error?.message,
      result.signal ? `Terminated by ${result.signal}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const cleaned = sanitizeDiagnostic(raw, env);
    const failureHeaders = cleaned
      .split('\n')
      .filter((line) => /^\s*FAIL\s/.test(line))
      .slice(0, 30)
      .join('\n')
      .slice(0, 1900);
    const tail = failureHeaders
      ? failureHeaders + '\n\nLast failure details:\n' + cleaned.slice(-2200)
      : cleaned.split('\n').slice(-100).join('\n').slice(-4200);
    results.push({
      key: check.key,
      label: check.label,
      status: passed ? 'passed' : 'failed',
      exitCode: result.status ?? null,
      detail:
        tail ||
        (passed
          ? 'Completed successfully.'
          : 'Command did not complete successfully.'),
    });
    if (check.key === 'install') installed = passed;
  }
  return results;
}

export function renderDiagnostics(results, headSha = '') {
  const sha = /^[a-f0-9]{40}$/.test(headSha) ? headSha : 'unavailable';
  const summary = results
    .map((result) => `| ${result.label} | ${result.status} |`)
    .join('\n');
  const details = results
    .filter((result) => result.status === 'failed')
    .map(
      (result) =>
        `<details>\n<summary>${result.label}: failed</summary>\n\n\`\`\`text\n${result.detail}\n\`\`\`\n\n</details>`
    )
    .join('\n\n');
  return `<!-- helpa-architecture-diagnostics -->\n## Architecture validation diagnostics\n\nCommit: ${sha}\n\nThese are supplemental diagnostics, not a replacement for required CI checks. Skipped checks are not passes. Output excerpts are sanitized and truncated.\n\n| Check | Result |\n| --- | --- |\n${summary}\n\n${details}\n`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const outputDir = resolve(process.argv[2] || '.ci-diagnostics');
  mkdirSync(outputDir, { recursive: true });
  const results = collectDiagnostics();
  const report = renderDiagnostics(results, process.env.HEAD_SHA);
  writeFileSync(
    resolve(outputDir, 'report.json'),
    JSON.stringify(results, null, 2) + '\n'
  );
  writeFileSync(resolve(outputDir, 'report.md'), report);
  console.log(
    results.map((result) => `${result.label}: ${result.status}`).join('\n')
  );
  process.exitCode = results.every((result) => result.status === 'passed')
    ? 0
    : 1;
}
