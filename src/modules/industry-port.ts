/**
 * Industry Module Port implementation — modules layer adapter.
 */

import {
  setIndustryModulePort,
  type CoreIndustryManifest,
  type IndustryModulePort,
} from '@/core/modules/industry-port';
import { getAdminClient } from '@/lib/db/server';
import { matchTourPackagesForMessage } from '@/lib/travel/retrieval';
import { buildTravelPackagePromptBlock } from '@/lib/travel/prompt';
import type { AiToolDefinition } from '@/core/ai/types';
import { registerTourPackageTools } from './travel/ai/tools';
import {
  getExecutableIndustryModule,
  resolveSystemPrompt,
  INDUSTRY_REGISTRY,
} from './registry';

const travelTools = new Map<string, AiToolDefinition>();
registerTourPackageTools({
  get: (name) => travelTools.get(name),
  register: (tool) => {
    travelTools.set(tool.name, tool);
  },
});

function toCoreManifest(industry?: string | null): CoreIndustryManifest {
  const industryModule = getExecutableIndustryModule(industry);
  return {
    id: industryModule.id,
    name: industryModule.name,
    aiRole: industryModule.aiRole,
    systemPrompt: industryModule.systemPrompt,
    terminology: industryModule.terminology as
      Record<string, string> | undefined,
    safetyKeywords: industryModule.safetyKeywords,
    safetyResponse: industryModule.safetyResponse,
    entityLabel: industryModule.entityConfigs?.contacts?.label,
  };
}

export const modulesIndustryPort: IndustryModulePort = {
  getAiTools: () => Array.from(travelTools.values()),
  getIndustryModule: (industry) => toCoreManifest(industry),
  resolveSystemPrompt: (industry, customPrompt) =>
    resolveSystemPrompt(industry, customPrompt),
  augmentSystemPrompt: async ({
    industry,
    accountId,
    userMessage,
    systemPrompt,
  }) => {
    const activeModule = getExecutableIndustryModule(industry);
    if (activeModule.id !== 'travel') return systemPrompt;
    const packageResult = await matchTourPackagesForMessage(
      getAdminClient(),
      accountId,
      userMessage
    );
    return systemPrompt + buildTravelPackagePromptBlock(packageResult);
  },
  getSeededKnowledgeTitles: () => {
    const titles = new Set<string>();
    for (const industryModule of Object.values(INDUSTRY_REGISTRY)) {
      if (industryModule.status !== 'ACTIVE') continue;
      for (const template of industryModule.kbTemplates ?? []) {
        if (template.questionTitle) titles.add(template.questionTitle);
      }
    }
    return titles;
  },
};

export function registerIndustryModulePort(): void {
  setIndustryModulePort(modulesIndustryPort);
}

registerIndustryModulePort();
