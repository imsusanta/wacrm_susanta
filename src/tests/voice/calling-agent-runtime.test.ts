import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VoiceAgentRuntime,
  type VoiceAgentConfig,
  type VoiceTurn,
} from '@/core/voice/voice-agent-runtime';
import type { STTProvider, TTSProvider } from '@/core/providers/voice/voice-provider.interface';

// Hoisted AI mock
const { mockGenerateCompletion } = vi.hoisted(() => {
  return {
    mockGenerateCompletion: vi.fn(),
  };
});

vi.mock('@/core/ai/provider', () => {
  return {
    OpenRouterProvider: class {
      generateCompletion = mockGenerateCompletion;
    },
  };
});

// Mock knowledge base retrieval
vi.mock('@/core/knowledge', () => ({
  getRelevantKnowledge: vi.fn().mockResolvedValue([
    { title: 'Clinic Timings', content: 'Open Mon-Sat 9AM to 7PM. Sunday closed.' },
  ]),
  formatKnowledgeForAi: vi.fn((articles: Array<{ title: string; content: string }>) =>
    articles.map((a) => `${a.title}: ${a.content}`).join('\n')
  ),
}));

describe('VoiceAgentRuntime', () => {
  const defaultAgentConfig: VoiceAgentConfig = {
    name: 'Maya',
    description: 'Admissions Voice Assistant',
    greeting: 'Namaste! I am Maya from Helpa.',
    language: 'en-IN',
    voiceId: 'shubh',
    sttProvider: 'sarvam',
    ttsProvider: 'sarvam',
    knowledgeBaseEnabled: true,
  };

  const mockTts: TTSProvider = {
    providerName: 'mock-tts',
    validateConfiguration: vi.fn().mockResolvedValue(undefined),
    listVoices: vi.fn().mockResolvedValue([]),
    synthesizeSpeech: vi.fn().mockResolvedValue({
      audioBuffer: Buffer.from('tts-audio'),
      mimeType: 'audio/wav',
    }),
  };

  const mockStt: STTProvider = {
    providerName: 'mock-stt',
    validateConfiguration: vi.fn().mockResolvedValue(undefined),
    transcribeAudio: vi.fn().mockResolvedValue({
      transcript: 'What are your clinic timings?',
      languageCode: 'en-IN',
      confidence: 0.95,
      isFinal: true,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delivers opening greeting on first turn when history is empty', async () => {
    const result = await VoiceAgentRuntime.executeTurn({
      accountId: 'acc-1',
      agentConfig: defaultAgentConfig,
      history: [],
      ttsProvider: mockTts,
    });

    expect(result.aiResponseText).toBe('Namaste! I am Maya from Helpa.');
    expect(result.transferToHuman).toBe(false);
    expect(result.endCall).toBe(false);
    expect(result.history).toHaveLength(1);
    expect(result.history[0].role).toBe('assistant');
  });

  it('transcribes user audio when userAudioBuffer is provided', async () => {
    mockGenerateCompletion.mockResolvedValueOnce({
      content: 'We are open Monday to Saturday from 9 AM to 7 PM.',
    });

    const history: VoiceTurn[] = [
      { role: 'assistant', content: 'Namaste! How may I help?' },
    ];

    const result = await VoiceAgentRuntime.executeTurn({
      accountId: 'acc-1',
      agentConfig: defaultAgentConfig,
      history,
      userAudioBuffer: Buffer.from('dummy-audio-bytes'),
      sttProvider: mockStt,
      ttsProvider: mockTts,
    });

    expect(mockStt.transcribeAudio).toHaveBeenCalled();
    expect(result.userTranscript).toBe('What are your clinic timings?');
    expect(result.aiResponseText).toBe('We are open Monday to Saturday from 9 AM to 7 PM.');
  });

  it('detects and strips [ACTION: TRANSFER] directive for human escalation', async () => {
    mockGenerateCompletion.mockResolvedValueOnce({
      content: 'I will transfer you to our specialist right away. Please stay on the line. [ACTION: TRANSFER]',
    });

    const history: VoiceTurn[] = [
      { role: 'assistant', content: 'Namaste! How may I help?' },
    ];

    const result = await VoiceAgentRuntime.executeTurn({
      accountId: 'acc-1',
      agentConfig: defaultAgentConfig,
      history,
      userText: 'I want to talk to an agent or your supervisor right now.',
      ttsProvider: mockTts,
    });

    expect(result.transferToHuman).toBe(true);
    expect(result.endCall).toBe(false);
    // Spoken text sent to customer / TTS must NOT include raw tag
    expect(result.aiResponseText).not.toContain('[ACTION: TRANSFER]');
    expect(result.aiResponseText).toContain('I will transfer you to our specialist');
  });

  it('detects and strips [ACTION: END_CALL] directive upon conversation conclusion', async () => {
    mockGenerateCompletion.mockResolvedValueOnce({
      content: 'Thank you for calling Helpa. Have a wonderful day! [ACTION: END_CALL]',
    });

    const history: VoiceTurn[] = [
      { role: 'assistant', content: 'Are you satisfied with this information?' },
    ];

    const result = await VoiceAgentRuntime.executeTurn({
      accountId: 'acc-1',
      agentConfig: defaultAgentConfig,
      history,
      userText: 'Yes, thank you so much! Goodbye.',
      ttsProvider: mockTts,
    });

    expect(result.endCall).toBe(true);
    expect(result.transferToHuman).toBe(false);
    expect(result.aiResponseText).not.toContain('[ACTION: END_CALL]');
    expect(result.aiResponseText).toContain('Thank you for calling Helpa');
  });
});
