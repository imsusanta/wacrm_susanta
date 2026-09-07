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
  it('keeps shared tools available before any industry implementation', () => {
    const registry = new AiToolRegistry();
    const core = tool('searchKnowledge');
    registry.register(core);
    expect(registry.get('searchKnowledge')).toBe(core);
    expect(registry.get('searchTourPackages')).toBeUndefined();
    expect(registry.getAll()).toEqual([core]);
  });

  it('resolves industry tools after the port supplies them', () => {
    let extensions: AiToolDefinition[] = [];
    const registry = new AiToolRegistry(() => extensions);
    expect(registry.get('searchTourPackages')).toBeUndefined();
    const travel = tool('searchTourPackages', ['travel']);
    extensions = [travel];
    expect(registry.get('searchTourPackages')).toBe(travel);
  });

  it('drops stale industry tools after reset', () => {
    let extensions: AiToolDefinition[] = [
      tool('searchTourPackages', ['travel']),
    ];
    const registry = new AiToolRegistry(() => extensions);
    expect(registry.get('searchTourPackages')).toBeDefined();
    extensions = [];
    expect(registry.get('searchTourPackages')).toBeUndefined();
  });

  it('does not duplicate tools when the same industry list is supplied twice', () => {
    const travel = tool('searchTourPackages', ['travel']);
    const registry = new AiToolRegistry(() => [travel, travel]);
    expect(
      registry.getAll().filter((entry) => entry.name === 'searchTourPackages')
    ).toHaveLength(1);
  });

  it('prevents industry tools from overriding platform names', () => {
    const core = tool('searchKnowledge');
    const registry = new AiToolRegistry(() => [
      tool('searchKnowledge', ['travel']),
    ]);
    registry.register(core);
    expect(registry.get('searchKnowledge')).toBe(core);
    expect(registry.getAll()).toEqual([core]);
  });

  it('preserves canonical industry aliases', () => {
    const travel = tool('searchTourPackages', ['travel']);
    const health = tool('findPatient', ['health']);
    const shared = tool('searchKnowledge');
    const registry = new AiToolRegistry(() => [travel, health]);
    registry.register(shared);
    expect(
      registry.getToolsForIndustry('hospital_clinic').map((entry) => entry.name)
    ).toEqual(['searchKnowledge', 'findPatient']);
    expect(
      registry.getToolsForIndustry('hospital').map((entry) => entry.name)
    ).toEqual(['searchKnowledge', 'findPatient']);
    expect(
      registry.getToolsForIndustry('travel').map((entry) => entry.name)
    ).toEqual(['searchKnowledge', 'searchTourPackages']);
  });
});
