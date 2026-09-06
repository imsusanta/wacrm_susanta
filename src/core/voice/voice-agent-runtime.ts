import { getRelevantKnowledge, formatKnowledgeForAi } from '@/core/knowledge';
import { OpenRouterProvider } from '@/core/ai/provider';
import { SarvamSTTProvider } from '@/core/providers/voice/sarvam-stt-provider';
import { SarvamTTSProvider } from '@/core/providers/voice/sarvam-tts-provider';
import { ElevenLabsTTSProvider } from '@/core/providers/voice/elevenlabs-tts-provider';
import { FallbackTTSProvider } from '@/core/providers/voice/tts-fallback';
import {
  STTProvider,
  TTSProvider,
  TTSSynthesizeResult,
} from '@/core/providers/voice/voice-provider.interface';

export interface VoiceAgentConfig {
  name: string;
  description?: string;
  systemInstructions?: string;
  greeting?: string;
  language: string;
  sttProvider?: string;
  ttsProvider?: string;
  voiceId?: string;
  llmProvider?: string;
  llmModel?: string;
  knowledgeBaseEnabled?: boolean;
  transferNumber?: string;
  toolsConfig?: Record<string, boolean>;
}

export interface VoiceTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  durationSeconds?: number;
}

export interface VoiceRuntimeTurnInput {
  accountId: string;
  agentConfig: VoiceAgentConfig;
  history: VoiceTurn[];
  userText?: string;
  userAudioBuffer?: Buffer;
  userAudioMimeType?: string;
  contactContext?: {
    name?: string;
    phone?: string;
    leadStage?: string;
    dealValue?: number;
  };
  generateAudioResponse?: boolean;
  sttProvider?: STTProvider;
  ttsProvider?: TTSProvider;
}

export interface VoiceRuntimeTurnResult {
  userTranscript: string;
  aiResponseText: string;
  audioResult?: TTSSynthesizeResult;
  transferToHuman: boolean;
  endCall: boolean;
  history: VoiceTurn[];
  detectedIntent?: string;
}

export class VoiceAgentRuntime {
  private static aiProvider = new OpenRouterProvider();

  /**
   * Builds an active TTS provider instance with automatic failover if configured.
   */
  static getTtsProvider(
    config: VoiceAgentConfig,
    customKey?: string
  ): TTSProvider {
    const sarvamKey = customKey || process.env.SARVAM_API_KEY;
    const elevenlabsKey = process.env.ELEVENLABS_API_KEY;

    const sarvamTts = new SarvamTTSProvider({ apiKey: sarvamKey });
    const elevenlabsTts = elevenlabsKey
      ? new ElevenLabsTTSProvider({ apiKey: elevenlabsKey })
      : undefined;

    if (config.ttsProvider === 'elevenlabs' && elevenlabsTts) {
      return elevenlabsTts;
    }

    if (config.ttsProvider === 'sarvam' && elevenlabsTts) {
      // Primary Sarvam with ElevenLabs fallback
      return new FallbackTTSProvider(sarvamTts, elevenlabsTts);
    }

    return sarvamTts;
  }

  /**
   * Executes a single conversational voice turn:
   * 1. Speech-to-Text (if audio provided)
   * 2. Grounded Knowledge Retrieval
   * 3. LLM Reasoner with Anti-Hallucination & Tool Directives
   * 4. Text-to-Speech Synthesis
   */
  static async executeTurn(
    params: VoiceRuntimeTurnInput
  ): Promise<VoiceRuntimeTurnResult> {
    const {
      accountId,
      agentConfig,
      history,
      contactContext,
      generateAudioResponse = true,
    } = params;

    // 1. Resolve User Input (STT if audio provided)
    let userTranscript = params.userText || '';
    if (params.userAudioBuffer && params.userAudioBuffer.length > 0) {
      const stt = params.sttProvider || new SarvamSTTProvider();
      try {
        const sttResult = await stt.transcribeAudio(params.userAudioBuffer, {
          languageCode: agentConfig.language,
          mimeType: params.userAudioMimeType || 'audio/wav',
        });
        userTranscript = sttResult.transcript.trim();
      } catch (sttErr) {
        console.error('[VoiceAgentRuntime] STT transcription failed:', sttErr);
        userTranscript = '';
      }
    }

    if (!userTranscript && history.length === 0 && agentConfig.greeting) {
      // Start of call greeting turn
      const greeting = agentConfig.greeting;
      let audioResult: TTSSynthesizeResult | undefined = undefined;

      if (generateAudioResponse) {
        const tts = params.ttsProvider || this.getTtsProvider(agentConfig);
        try {
          audioResult = await tts.synthesizeSpeech(greeting, {
            languageCode: agentConfig.language,
            voiceId: agentConfig.voiceId,
          });
        } catch (ttsErr) {
          console.warn('[VoiceAgentRuntime] Greeting TTS failed:', ttsErr);
        }
      }

      return {
        userTranscript: '',
        aiResponseText: greeting,
        audioResult,
        transferToHuman: false,
        endCall: false,
        history: [{ role: 'assistant', content: greeting, timestamp: new Date().toISOString() }],
      };
    }

    // 2. Retrieve Grounded Knowledge Base Articles
    let knowledgeBaseContext = '';
    if (agentConfig.knowledgeBaseEnabled !== false && userTranscript) {
      try {
        const relevantArticles = await getRelevantKnowledge(
          accountId,
          userTranscript,
          4
        );
        knowledgeBaseContext = formatKnowledgeForAi(relevantArticles);
      } catch (kbErr) {
        console.warn('[VoiceAgentRuntime] KB retrieval warning:', kbErr);
      }
    }

    // 3. Assemble Grounded System Instructions
    const systemPrompt = `You are "${agentConfig.name}", an intelligent voice calling AI representative for this business.
Your spoken language is: ${agentConfig.language}.

CRITICAL CONVERSATIONAL VOICE GUIDELINES:
1. Speak concisely and naturally. Keep answers to 1 to 3 short sentences suitable for a phone call.
2. NEVER use markdown, bullet points, asterisks, URLs, or code blocks in your spoken output.
3. GROUNDING & ANTI-HALLUCINATION:
   - Use ONLY the provided Knowledge Base below to answer business questions.
   - If the requested information (pricing, dates, specific rules, availability) is NOT in the knowledge base, say:
     "I don't have that specific information with me right now. I can connect you with our team."
   - NEVER invent or guess package pricing, appointment slots, or company policies.
4. ACTIONS & TRANSFERS:
   - If the customer wants to speak with a human or is angry/escalating, say:
     "I will transfer you to our specialist right away. Please stay on the line." and include "[ACTION: TRANSFER]" in your response.
   - If the customer says goodbye or indicates the call is finished, conclude politely and include "[ACTION: END_CALL]" in your response.

${contactContext ? `CUSTOMER INFO: Name: ${contactContext.name || 'Unknown'}, Phone: ${contactContext.phone || 'Unknown'}` : ''}
${agentConfig.systemInstructions ? `CUSTOM INSTRUCTIONS:\n${agentConfig.systemInstructions}` : ''}
${knowledgeBaseContext ? `\nOFFICIAL KNOWLEDGE BASE:\n${knowledgeBaseContext}` : ''}
`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((t) => ({ role: t.role as 'user' | 'assistant', content: t.content })),
      { role: 'user' as const, content: userTranscript || '(Customer answered call)' },
    ];

    // 4. Generate LLM response
    let rawAiResponse = '';
    try {
      const completion = await this.aiProvider.generateCompletion(messages, {
        model: agentConfig.llmModel || 'google/gemini-2.5-flash',
        temperature: 0.3,
        maxTokens: 300,
      });
      rawAiResponse = completion.content || '';
    } catch (llmErr) {
      console.error('[VoiceAgentRuntime] LLM completion failed:', llmErr);
      rawAiResponse =
        "I apologize, I'm having a brief connection issue. Could you please repeat that?";
    }

    // Check for actionable tags
    const transferToHuman = rawAiResponse.includes('[ACTION: TRANSFER]');
    const endCall = rawAiResponse.includes('[ACTION: END_CALL]');

    // Clean spoken text for TTS
    const cleanSpokenText = rawAiResponse
      .replace(/\[ACTION:[^\]]+\]/g, '')
      .replace(/[*_#`~[\]]/g, '')
      .trim();

    // 5. Synthesize speech via TTS
    let audioResult: TTSSynthesizeResult | undefined = undefined;
    if (generateAudioResponse && cleanSpokenText) {
      const tts = params.ttsProvider || this.getTtsProvider(agentConfig);
      try {
        audioResult = await tts.synthesizeSpeech(cleanSpokenText, {
          languageCode: agentConfig.language,
          voiceId: agentConfig.voiceId,
        });
      } catch (ttsErr) {
        console.warn('[VoiceAgentRuntime] TTS synthesis failed:', ttsErr);
      }
    }

    const updatedHistory: VoiceTurn[] = [
      ...history,
      { role: 'user', content: userTranscript, timestamp: new Date().toISOString() },
      { role: 'assistant', content: cleanSpokenText, timestamp: new Date().toISOString() },
    ];

    return {
      userTranscript,
      aiResponseText: cleanSpokenText,
      audioResult,
      transferToHuman,
      endCall,
      history: updatedHistory,
    };
  }
}
