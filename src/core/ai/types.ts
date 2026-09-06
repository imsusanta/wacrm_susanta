/**
 * Helpa Core Platform — AI Engine Types
 *
 * Reusable type definitions for AI roles, request pipelines, tool registries,
 * human handoff, and copilot capabilities across all Helpa industries.
 */

import type { AiMessage } from './provider';

export type AiRole =
  | 'AI Receptionist'
  | 'AI Admission Assistant'
  | 'AI Teaching Assistant'
  | 'AI Property Assistant'
  | 'AI Business Assistant';

export interface IndustryAiConfig {
  role: AiRole;
  systemPrompt: string;
  terminology: Record<string, string>;
  availableTools: string[];
  safetyRules: string[];
  welcomeMessageTemplate?: string;
}

export type ToolType = 'read' | 'write';

export interface AiToolParameter {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AiToolDefinition {
  name: string;
  description: string;
  type: ToolType;
  parameters: Record<string, AiToolParameter>;
  requiresConfirmation?: boolean;
  allowedIndustries?: string[];
  execute: (
    params: Record<string, unknown>,
    context: AiExecutionContext
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
}

export interface AiExecutionContext {
  accountId: string;
  userId: string;
  conversationId: string;
  contactId: string;
  industry?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface AiContextBundle {
  systemPrompt: string;
  messages: AiMessage[];
  contactName?: string;
  contactPhone?: string;
  industry: string;
  role: AiRole;
  knowledgeSnippets: string[];
  availableTools: AiToolDefinition[];
  businessName?: string;
  detectedLanguage?: {
    code: string;
    name: string;
    script: string;
    isRegionalIndian: boolean;
    confidence: number;
  };
}

export interface AiExecutionResult {
  replyText: string;
  role: AiRole;
  model: string;
  provider: string;
  tokensUsed?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  toolCallsExecuted?: Array<{
    toolName: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
  needsHumanHandoff: boolean;
  handoffReason?: string;
  detectedLanguage?: {
    code: string;
    name: string;
    script: string;
    isRegionalIndian: boolean;
    confidence: number;
  };
  timestamp: string;
}

export interface CopilotSuggestions {
  summary: string;
  intent: string;
  suggestedReply: string;
  suggestedAction?: {
    label: string;
    actionType: string;
    payload?: Record<string, unknown>;
  };
  confidence: number;
}

export type AiProviderName = 'openrouter' | 'orcarouter' | 'cloudflare';

export type AiFeatureType =
  | 'AI_REPLY'
  | 'AI_AGENT'
  | 'AI_COPILOT'
  | 'AI_SUMMARY'
  | 'AI_SUGGESTED_REPLY'
  | 'AI_SUGGESTED_ACTION'
  | 'KNOWLEDGE_BASE'
  | 'AUTOMATION'
  | 'CAMPAIGN';

export interface AiProviderCapabilities {
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  supportsStructuredOutput: boolean;
  supportsVision: boolean;
}

export interface AiProviderHealth {
  provider: AiProviderName;
  status: 'healthy' | 'unavailable' | 'error';
  latencyMs?: number;
  message?: string;
  checkedAt: string;
}

export interface AiAccountConfig {
  ai_provider?: AiProviderName | null;
  ai_fallback_provider?: AiProviderName | 'none' | null;
  openrouter_api_key?: string | null;
  openrouter_model?: string | null;
  orcarouter_api_key?: string | null;
  orcarouter_model?: string | null;
  cloudflare_account_id?: string | null;
  cloudflare_api_token?: string | null;
  cloudflare_model?: string | null;
  ai_system_prompt?: string | null;
  welcome_message?: string | null;
  industry?: string | null;
  name?: string | null;
}
