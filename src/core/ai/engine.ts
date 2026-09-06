/**
 * Helpa Core Platform — Unified AI Execution Engine
 *
 * Coordinates context building, safety screening, provider completion (OpenRouter),
 * tool execution, human handoff, summary generation, and copilot suggestions.
 */

import { coreEvents } from '@/core/events';
import { getIndustryModulePort } from '../modules/industry-port';
import { type AiMessage } from './provider';
import { executeAiCompletionWithFallback } from './resolver';
import { buildAiContextBundle } from './context-builder';
import { detectRegionalLanguage } from './regional-language';
import { aiToolRegistry } from './tools';
import type {
  AiExecutionContext,
  AiExecutionResult,
  CopilotSuggestions,
} from './types';

/**
 * Executes the full AI request pipeline for an incoming user message.
 */
export async function executeAiPipeline({
  context,
  userMessage,
  customApiKey,
  customModel,
}: {
  context: AiExecutionContext;
  userMessage: string;
  customApiKey?: string;
  customModel?: string;
}): Promise<AiExecutionResult> {
  const startTime = Date.now();

  // 1. Build Layered Context Bundle
  const bundle = await buildAiContextBundle(context);
  const detectedLanguage =
    bundle.detectedLanguage ?? detectRegionalLanguage(userMessage);

  // 2. Safety Pre-screening driven by Industry Manifest (via the Core port)
  const lowerMsg = userMessage.toLowerCase();
  const industryPort = getIndustryModulePort();
  const manifest = industryPort.getIndustryModule(bundle.industry);

  if (
    manifest.safetyKeywords &&
    manifest.safetyKeywords.length > 0 &&
    manifest.safetyKeywords.some((keyword) =>
      lowerMsg.includes(keyword.toLowerCase())
    )
  ) {
    // Immediate emergency escalation
    await aiToolRegistry
      .get('handoffToHuman')
      ?.execute(
        { reason: `Emergency keyword detected (${manifest.name})` },
        context
      );

    return {
      replyText:
        manifest.safetyResponse ||
        '⚠️ An urgent situation was detected. Our staff has been alerted and will assist you shortly.',
      role: bundle.role,
      model: 'system-safety-guard',
      provider: 'core-safety',
      needsHumanHandoff: true,
      handoffReason: 'Emergency pre-screening trigger',
      detectedLanguage: {
        code: detectedLanguage.code,
        name: detectedLanguage.name,
        script: detectedLanguage.script,
        isRegionalIndian: detectedLanguage.isRegionalIndian,
        confidence: detectedLanguage.confidence,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // 3. Industry-specific prompt augmentation via the port (no hardcoded
  //    industry branches in Core — e.g. travel package grounding is registered
  //    by the modules layer).
  let systemPrompt = bundle.systemPrompt;
  if (industryPort.augmentSystemPrompt) {
    systemPrompt = await industryPort.augmentSystemPrompt({
      industry: bundle.industry,
      accountId: context.accountId,
      userMessage,
      systemPrompt,
    });
  }

  const conversationMessages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...bundle.messages,
    { role: 'user', content: userMessage },
  ];

  // 4. Generate AI Completion via Provider Resolver (Primary + Fallback)
  const completion = await executeAiCompletionWithFallback({
    messages: conversationMessages,
    options: {
      temperature: 0.3,
      maxTokens: 800,
    },
    resolutionParams: {
      accountId: context.accountId,
      customApiKey,
      customModel,
      feature: 'AI_REPLY',
      conversationId: context.conversationId,
    },
  });

  let replyText = completion.content.trim();
  const toolCallsExecuted: AiExecutionResult['toolCallsExecuted'] = [];
  let needsHumanHandoff = false;
  let handoffReason: string | undefined;

  // 5. Detect and Execute Tool Calls if structured in response
  if (replyText.includes('TOOL_CALL:')) {
    try {
      const match = replyText.match(/TOOL_CALL:\s*(\{[\s\S]*?\})/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]) as {
          name: string;
          arguments: Record<string, unknown>;
        };
        const tool = aiToolRegistry.get(parsed.name);
        if (tool) {
          const toolRes = await tool.execute(parsed.arguments || {}, context);
          toolCallsExecuted.push({
            toolName: parsed.name,
            input: parsed.arguments || {},
            output: toolRes,
          });

          if (parsed.name === 'handoffToHuman') {
            needsHumanHandoff = true;
            handoffReason = String(
              parsed.arguments.reason || 'Requested by AI'
            );
          }
        }
        // Clean out tool tag from client response
        replyText = replyText.replace(/TOOL_CALL:\s*\{[\s\S]*?\}/, '').trim();
      }
    } catch {
      // Non-critical tool parsing error
    }
  }

  // 6. Check for human handoff intent in plain text
  if (
    replyText.toLowerCase().includes('connect you with our team') ||
    replyText.toLowerCase().includes('connect you with our reception') ||
    lowerMsg.includes('speak to human') ||
    lowerMsg.includes('talk to an agent')
  ) {
    needsHumanHandoff = true;
    handoffReason = 'Customer requested human staff';
    await aiToolRegistry
      .get('handoffToHuman')
      ?.execute({ reason: handoffReason }, context);
  }

  // 7. Emit Core Platform Event
  coreEvents.emit('ai.replied', context.accountId, {
    conversationId: context.conversationId,
    contactId: context.contactId,
    role: bundle.role,
    model: completion.model,
    tokens: completion.totalTokens,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });

  return {
    replyText,
    role: bundle.role,
    model: completion.model,
    provider: completion.provider,
    tokensUsed: {
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
      totalTokens: completion.totalTokens,
    },
    toolCallsExecuted:
      toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
    needsHumanHandoff,
    handoffReason,
    detectedLanguage: {
      code: detectedLanguage.code,
      name: detectedLanguage.name,
      script: detectedLanguage.script,
      isRegionalIndian: detectedLanguage.isRegionalIndian,
      confidence: detectedLanguage.confidence,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generates an intelligent conversation summary for staff and copilot.
 */
export async function generateConversationSummary({
  context,
  customApiKey,
}: {
  context: AiExecutionContext;
  customApiKey?: string;
}): Promise<string> {
  const bundle = await buildAiContextBundle(context);
  if (bundle.messages.length === 0) {
    return 'No previous messages in conversation.';
  }

  const promptMessages: AiMessage[] = [
    {
      role: 'system',
      content:
        'Summarize the following customer interaction concisely in 2-3 bullet points. Focus on: customer intent, key facts mentioned (preferred time, services, doctor, budget), and current status.',
    },
    ...bundle.messages,
  ];

  const res = await executeAiCompletionWithFallback({
    messages: promptMessages,
    options: {
      temperature: 0.2,
      maxTokens: 250,
    },
    resolutionParams: {
      accountId: context.accountId,
      customApiKey,
      feature: 'AI_SUMMARY',
      conversationId: context.conversationId,
    },
  });

  return res.content.trim();
}

/**
 * Generates AI Copilot suggestions (Summary, Intent, Suggested Reply, Suggested Action) for human staff.
 */
export async function generateCopilotSuggestions({
  context,
  customApiKey,
}: {
  context: AiExecutionContext;
  customApiKey?: string;
}): Promise<CopilotSuggestions> {
  const bundle = await buildAiContextBundle(context);
  const lastUserMsg =
    bundle.messages.filter((m) => m.role === 'user').slice(-1)[0]?.content ||
    'Customer conversation';

  const copilotPrompt = `You are the staff AI Copilot for "${bundle.businessName}" in the ${bundle.industry} industry.
Analyze the following conversation and return a JSON object with:
{
  "summary": "Brief 1-sentence summary of the customer situation",
  "intent": "e.g. Booking Enquiry / Service Pricing / Human Request",
  "suggestedReply": "Polite, professional ready-to-send draft reply for human staff to approve",
  "suggestedAction": {
    "label": "e.g. Book Appointment / Send Schedule / Escalate",
    "actionType": "e.g. book_appointment / view_knowledge"
  }
}
Ground the reply in this Knowledge Base:
${bundle.knowledgeSnippets.join('\n')}
`;

  const promptMessages: AiMessage[] = [
    { role: 'system', content: copilotPrompt },
    ...bundle.messages,
    {
      role: 'user',
      content: `Generate Copilot suggestions for: "${lastUserMsg}"`,
    },
  ];

  try {
    const res = await executeAiCompletionWithFallback({
      messages: promptMessages,
      options: {
        temperature: 0.2,
        maxTokens: 400,
        responseFormat: { type: 'json_object' },
      },
      resolutionParams: {
        accountId: context.accountId,
        customApiKey,
        feature: 'AI_COPILOT',
        conversationId: context.conversationId,
      },
    });

    const jsonMatch = res.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Customer inquiry regarding services.',
        intent: parsed.intent || 'General Inquiry',
        suggestedReply:
          parsed.suggestedReply || 'Hello, how can we assist you today?',
        suggestedAction: parsed.suggestedAction,
        confidence: 0.92,
      };
    }
  } catch {
    // Fallback on JSON parse failure
  }

  return {
    summary: 'Customer enquiry in progress.',
    intent: 'General Inquiry',
    suggestedReply: 'Thank you for reaching out. How can I help you today?',
    suggestedAction: {
      label: 'View Knowledge Base',
      actionType: 'view_knowledge',
    },
    confidence: 0.85,
  };
}
