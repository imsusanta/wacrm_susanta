import { afterEach, describe, expect, it } from 'vitest';
import { aiToolRegistry } from '@/core/ai/tools';
import { resetIndustryModulePort } from '@/core/modules/industry-port';
import { registerIndustryModulePort } from '@/modules/industry-port';

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
});
