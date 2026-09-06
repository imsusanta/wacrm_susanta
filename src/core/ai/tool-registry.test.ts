import { describe, expect, it } from 'vitest';
import { AiToolRegistry } from './tool-registry';
import type { AiToolDefinition } from './types';

function tool(name: string, allowedIndustries?: string[]): AiToolDefinition {
  return {
    name,
    description: 'Synthetic registry fixture',
    type: 'read',
    parameters: {},
    allowedIndustries,
    execute: async () => ({ success: true }),
  };
}

describe('Industry-agnostic tool registry', () => {
  it('works without an industry implementation', () => {
    const registry = new AiToolRegistry();
    const core = tool('core');
    registry.register(core);
    expect(registry.get('core')).toBe(core);
    expect(registry.get('missing')).toBeUndefined();
    expect(registry.getAll()).toEqual([core]);
  });

  it('resolves changing industry capabilities without stale registration', () => {
    let extensions: AiToolDefinition[] = [];
    const registry = new AiToolRegistry(() => extensions);
    expect(registry.get('travel')).toBeUndefined();
    const travel = tool('travel', ['travel']);
    extensions = [travel];
    expect(registry.get('travel')).toBe(travel);
    extensions = [];
    expect(registry.get('travel')).toBeUndefined();
  });

  it('prevents extension names from replacing platform tools', () => {
    const core = tool('shared');
    const registry = new AiToolRegistry(() => [tool('shared', ['travel'])]);
    registry.register(core);
    expect(registry.get('shared')).toBe(core);
    expect(registry.getAll()).toEqual([core]);
  });

  it('returns each extension name once with consistent lookup semantics', () => {
    const first = tool('travel', ['travel']);
    const registry = new AiToolRegistry(() => [first, tool('travel')]);
    expect(registry.get('travel')).toBe(first);
    expect(registry.getAll()).toEqual([first]);
  });

  it('preserves shared tools and canonical industry filtering', () => {
    const travel = tool('travel', ['travel']);
    const health = tool('health', ['health']);
    const shared = tool('shared');
    const registry = new AiToolRegistry(() => [travel, health]);
    registry.register(shared);
    expect(registry.getToolsForIndustry('hospital_clinic')).toEqual([
      shared,
      health,
    ]);
    expect(registry.getToolsForIndustry('travel')).toEqual([shared, travel]);
    expect(registry.getToolsForIndustry('general')).toEqual([shared]);
  });
});
