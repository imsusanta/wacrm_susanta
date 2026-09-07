import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { aiToolRegistry } from '@/core/ai/tools';
import { resetIndustryModulePort } from '@/core/modules/industry-port';
import { registerIndustryModulePort } from '@/modules/industry-port';

const SRC_ROOT = path.resolve(__dirname, '..', '..');

describe('Industry tool composition root', () => {
  afterEach(() => registerIndustryModulePort());

  it('does not expose travel tools before module registration', () => {
    resetIndustryModulePort();
    expect(aiToolRegistry.get('searchKnowledge')).toBeDefined();
    expect(aiToolRegistry.get('searchTourPackages')).toBeUndefined();
  });

  it('registers tools idempotently and keeps them industry-scoped', () => {
    registerIndustryModulePort();
    const before = aiToolRegistry.getAll().map((entry) => entry.name);
    registerIndustryModulePort();
    expect(aiToolRegistry.getAll().map((entry) => entry.name)).toEqual(before);
    expect(
      aiToolRegistry.getToolsForIndustry('travel').map((entry) => entry.name)
    ).toContain('searchTourPackages');
    expect(
      aiToolRegistry.getToolsForIndustry('health').map((entry) => entry.name)
    ).not.toContain('searchTourPackages');
  });

  it('does not statically import booking or WhatsApp runtimes from travel tools', () => {
    const source = fs.readFileSync(
      path.join(SRC_ROOT, 'modules', 'travel', 'ai', 'tools.ts'),
      'utf8'
    );
    expect(source).not.toMatch(
      /^import\s+(?:type\s+)?(?:\{[\s\S]*?\}|\*\s+as\s+\w+|\w+)\s+from\s+['"][^'"]*booking-confirm/m
    );
    expect(source).not.toMatch(/from ['"]@\/lib\/whatsapp/);
    expect(source).toContain("await import('@/lib/travel/booking-confirm')");
  });

  it('registers the industry port from Next.js startup and the worker', () => {
    const instrumentation = fs.readFileSync(
      path.join(SRC_ROOT, 'instrumentation.ts'),
      'utf8'
    );
    const worker = fs.readFileSync(
      path.join(SRC_ROOT, '..', 'scripts', 'worker.ts'),
      'utf8'
    );
    expect(instrumentation).toContain('./modules/industry-port');
    expect(worker).toContain('../src/modules/industry-port');
  });
});
