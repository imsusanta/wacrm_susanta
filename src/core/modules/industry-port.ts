/**
 * Helpa Core Platform — Industry Module Port (Dependency Inversion)
 *
 * Core and lib layers must never import the industry `modules` layer
 * (`src/modules`) directly. Industry manifests, system prompt resolution, and
 * industry-specific prompt augmentation are consumed exclusively through this
 * port. The composition root (`src/modules/industry-port.ts`) registers the
 * concrete implementation at server startup (`src/instrumentation.ts`) and in
 * the test bootstrap (`src/tests/setup.ts`).
 */

import type { AiToolDefinition } from '@/core/ai/types';

export interface CoreIndustryManifest {
  id: string;
  name: string;
  aiRole?: string;
  systemPrompt: string;
  terminology?: Record<string, string>;
  safetyKeywords?: string[];
  safetyResponse?: string;
  /** Display label for the industry's primary CRM entity (e.g. "Patient"). */
  entityLabel?: string;
}

export interface SystemPromptAugmentationParams {
  industry: string;
  accountId: string;
  userMessage: string;
  systemPrompt: string;
}

export interface IndustryModulePort {
  /** Resolve the industry manifest for a workspace industry. */
  getIndustryModule(industry?: string | null): CoreIndustryManifest;
  /** Resolve the mandatory system prompt (custom override + industry default). */
  resolveSystemPrompt(
    industry?: string | null,
    customPrompt?: string | null
  ): string;
  /**
   * Optional industry-specific prompt augmentation hook (e.g. travel package
   * grounding). Core calls this instead of hardcoding industry branches.
   */
  augmentSystemPrompt?(params: SystemPromptAugmentationParams): Promise<string>;
  /** Retrieve all seeded knowledge base titles registered across industries. */
  getSeededKnowledgeTitles?(): Set<string> | string[];
  /**
   * Industry-owned tool implementations. Core retains industry filtering
   * and the trusted executor remains the authorization decision.
   */
  getAiTools?(): readonly AiToolDefinition[];
}

const DEFAULT_GENERAL_MANIFEST: CoreIndustryManifest = {
  id: 'general',
  name: 'General CRM',
  aiRole: 'AI Business Assistant',
  systemPrompt:
    'You are the official business assistant. Help clients with inquiries, bookings, and information.',
};

/**
 * Fail-safe fallback used before the modules layer registers the real port
 * (e.g. in isolated unit tests). Mirrors the `general` industry behaviour.
 */
const defaultPort: IndustryModulePort = {
  getIndustryModule: () => ({ ...DEFAULT_GENERAL_MANIFEST }),
  resolveSystemPrompt: (_industry, customPrompt) =>
    customPrompt?.trim() || DEFAULT_GENERAL_MANIFEST.systemPrompt,
};

let activePort: IndustryModulePort | null = null;

export function setIndustryModulePort(port: IndustryModulePort): void {
  activePort = port;
}

export function getIndustryModulePort(): IndustryModulePort {
  return activePort ?? defaultPort;
}

/** Test-only helper to restore the unregistered default state. */
export function resetIndustryModulePort(): void {
  activePort = null;
}
