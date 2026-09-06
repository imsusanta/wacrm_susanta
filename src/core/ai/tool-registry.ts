import { resolveIndustryAlias } from '@/core/modules/terminology';
import type { AiToolDefinition } from './types';

/**
 * Industry-agnostic registry. The composition root supplies optional tools;
 * Core never imports a concrete industry implementation.
 */
export class AiToolRegistry {
  private readonly tools = new Map<string, AiToolDefinition>();

  constructor(
    private readonly getIndustryTools: () => readonly AiToolDefinition[] = () => []
  ) {}

  public register(tool: AiToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): AiToolDefinition | undefined {
    // An industry extension must not replace a platform tool by name.
    return (
      this.tools.get(name) ||
      this.getIndustryTools().find((tool) => tool.name === name)
    );
  }

  public getAll(): AiToolDefinition[] {
    const merged = new Map(this.tools);
    for (const tool of this.getIndustryTools()) {
      if (!merged.has(tool.name)) merged.set(tool.name, tool);
    }
    return Array.from(merged.values());
  }

  public getToolsForIndustry(industry?: string): AiToolDefinition[] {
    const all = this.getAll();
    if (!industry) return all;
    const canonicalTarget = resolveIndustryAlias(industry);
    return all.filter(
      (tool) =>
        !tool.allowedIndustries ||
        tool.allowedIndustries.length === 0 ||
        tool.allowedIndustries.some(
          (allowed) => resolveIndustryAlias(allowed) === canonicalTarget
        )
    );
  }
}
