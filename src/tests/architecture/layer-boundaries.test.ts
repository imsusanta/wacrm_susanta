/**
 * Architecture Conformance Tests
 *
 * Statically enforce the Helpa layer model so architectural drift fails CI
 * instead of accumulating silently:
 *
 * Layer model (dependencies may only point downwards):
 *   app  →  modules  →  core  →  lib
 *   app  →  components / hooks  →  core / lib
 *
 * Enforced rules:
 *   1. `src/core/**` never imports `@/modules/*`, `@/app/*`, `@/components/*`,
 *      `@/hooks/*`, or `@/lib/travel/*` (industry capabilities are consumed
 *      via the port in `src/core/modules`). Relative imports are canonicalized.
 *   2. `src/lib/**` never imports `@/app/*` or `@/modules/*`.
 *   3. `src/components/**` and `src/hooks/**` never import `@/app/*`.
 *   4. No circular imports within `src/core/**`.
 *   5. The modules layer registers the industry port; Core falls back to a
 *      safe general manifest before registration.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve(__dirname, '..', '..');

const IMPORT_RE =
  /(?:from|import)\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Source dirs scanned for boundary rules (tests are exempt). */
const BOUNDARY_RULES: Array<{
  layer: string;
  dir: string;
  forbidden: string[];
}> = [
  {
    layer: 'core',
    dir: path.join(SRC_ROOT, 'core'),
    forbidden: [
      '@/modules',
      '@/app',
      '@/components',
      '@/hooks',
      '@/lib/travel',
    ],
  },
  {
    layer: 'lib',
    dir: path.join(SRC_ROOT, 'lib'),
    forbidden: ['@/app', '@/modules'],
  },
  {
    layer: 'components',
    dir: path.join(SRC_ROOT, 'components'),
    forbidden: ['@/app'],
  },
  {
    layer: 'hooks',
    dir: path.join(SRC_ROOT, 'hooks'),
    forbidden: ['@/app'],
  },
];

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

function isTestFile(file: string): boolean {
  return (
    file.includes(`${path.sep}tests${path.sep}`) ||
    /\.test\.(ts|tsx)$/.test(file)
  );
}

function extractImportSpecifiers(
  content: string,
  options: { excludeTypeOnly?: boolean } = {}
): string[] {
  // `import type ... from` statements are erased at runtime and cannot
  // create runtime cycles, so cycle detection excludes them.
  const effectiveContent = options.excludeTypeOnly
    ? content.replace(/import\s+type\s+[^;'"]*?from\s+['"][^'"]+['"];?/g, '')
    : content;
  const specifiers: string[] = [];
  for (const match of effectiveContent.matchAll(IMPORT_RE)) {
    specifiers.push(match[1] || match[2] || '');
  }
  return specifiers;
}

function canonicalSpecifier(fromFile: string, specifier: string): string {
  if (!specifier.startsWith('.')) return specifier;
  const target = path.resolve(path.dirname(fromFile), specifier);
  const relative = path.relative(SRC_ROOT, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return specifier;
  return `@/${relative.split(path.sep).join('/')}`;
}

describe('Architecture: relative import normalization', () => {
  const file = path.join(SRC_ROOT, 'core', 'ai', 'tools.ts');

  it('detects a concrete travel dependency through a relative path', () => {
    expect(canonicalSpecifier(file, '../../lib/travel/retrieval')).toBe(
      '@/lib/travel/retrieval'
    );
  });

  it('detects upward modules imports through a relative path', () => {
    expect(canonicalSpecifier(file, '../../modules/travel')).toBe(
      '@/modules/travel'
    );
  });

  it('preserves permitted core imports and package imports', () => {
    expect(canonicalSpecifier(file, './types')).toBe('@/core/ai/types');
    expect(canonicalSpecifier(file, 'node:crypto')).toBe('node:crypto');
  });
});

describe('Architecture: layer boundaries', () => {
  for (const rule of BOUNDARY_RULES) {
    it(`${rule.layer} layer does not import forbidden layers (${rule.forbidden.join(', ')})`, () => {
      const violations: string[] = [];
      for (const file of listSourceFiles(rule.dir)) {
        if (isTestFile(file)) continue;
        const content = fs.readFileSync(file, 'utf8');
        for (const specifier of extractImportSpecifiers(content)) {
          const canonical = canonicalSpecifier(file, specifier);
          const forbidden = rule.forbidden.find(
            (prefix) =>
              canonical === prefix || canonical.startsWith(`${prefix}/`)
          );
          if (forbidden) {
            violations.push(
              `${path.relative(SRC_ROOT, file)} imports '${specifier}'`
            );
          }
        }
      }
      expect(
        violations,
        `Layer boundary violations found:\n${violations.join('\n')}`
      ).toEqual([]);
    });
  }
});

describe('Architecture: no circular imports in core', () => {
  function resolveCoreImport(
    fromFile: string,
    specifier: string
  ): string | null {
    let target: string | null = null;
    if (specifier.startsWith('@/core/')) {
      target = path.join(SRC_ROOT, specifier.slice('@/'.length));
    } else if (specifier.startsWith('.')) {
      target = path.resolve(path.dirname(fromFile), specifier);
    } else {
      return null;
    }
    const candidates = [
      target,
      `${target}.ts`,
      `${target}.tsx`,
      path.join(target, 'index.ts'),
      path.join(target, 'index.tsx'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
    return null;
  }

  it('core dependency graph is acyclic', () => {
    const coreDir = path.join(SRC_ROOT, 'core');
    const graph = new Map<string, string[]>();

    for (const file of listSourceFiles(coreDir)) {
      if (isTestFile(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      const edges: string[] = [];
      for (const specifier of extractImportSpecifiers(content, {
        excludeTypeOnly: true,
      })) {
        const resolved = resolveCoreImport(file, specifier);
        if (resolved && !isTestFile(resolved)) {
          edges.push(resolved);
        }
      }
      graph.set(file, edges);
    }

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    for (const node of graph.keys()) color.set(node, WHITE);

    const cycles: string[] = [];
    const stack: string[] = [];

    function visit(node: string): void {
      color.set(node, GRAY);
      stack.push(node);
      for (const next of graph.get(node) || []) {
        const state = color.get(next) ?? WHITE;
        if (state === GRAY) {
          const cycleStart = stack.indexOf(next);
          cycles.push(
            [...stack.slice(cycleStart), next]
              .map((p) => path.relative(SRC_ROOT, p))
              .join(' -> ')
          );
        } else if (state === WHITE) {
          visit(next);
        }
      }
      stack.pop();
      color.set(node, BLACK);
    }

    for (const node of graph.keys()) {
      if ((color.get(node) ?? WHITE) === WHITE) visit(node);
    }

    expect(
      cycles,
      `Circular imports detected in src/core:\n${cycles.join('\n')}`
    ).toEqual([]);
  });
});

describe('Architecture: industry module port', () => {
  it('falls back to a safe general manifest before registration', async () => {
    const { getIndustryModulePort, resetIndustryModulePort } =
      await import('@/core/modules/industry-port');
    resetIndustryModulePort();
    const port = getIndustryModulePort();
    const manifest = port.getIndustryModule('hospital_clinic');
    expect(manifest.id).toBe('general');
    expect(manifest.safetyKeywords).toBeUndefined();
    expect(port.resolveSystemPrompt('hospital_clinic', '  custom  ')).toBe(
      'custom'
    );
    expect(port.resolveSystemPrompt('hospital_clinic', null)).toContain(
      'business assistant'
    );
  });

  it('modules layer registers the registry-backed port', async () => {
    const { getIndustryModulePort } =
      await import('@/core/modules/industry-port');
    const { registerIndustryModulePort } =
      await import('@/modules/industry-port');
    registerIndustryModulePort();

    const port = getIndustryModulePort();
    const health = port.getIndustryModule('health');
    expect(health.id).toBe('hospital_clinic');
    expect(health.aiRole).toBe('AI Hospital Receptionist');
    expect(health.safetyKeywords?.length ?? 0).toBeGreaterThan(0);
    expect(health.entityLabel).toBe('Patient');

    // Unknown industries resolve to the general manifest.
    expect(port.getIndustryModule('nonexistent').id).toBe('general');
    expect(port.getIndustryModule(null).id).toBe('general');

    // Alias resolution matches the canonical industry set.
    expect(port.getIndustryModule('health').id).toBe('hospital_clinic');
  });

  it('resolveSystemPrompt applies the intent-fulfillment policy', async () => {
    const { getIndustryModulePort } =
      await import('@/core/modules/industry-port');
    const prompt = getIndustryModulePort().resolveSystemPrompt(
      'health',
      'Custom clinic prompt'
    );
    expect(prompt).toContain('Custom clinic prompt');
  });
});
