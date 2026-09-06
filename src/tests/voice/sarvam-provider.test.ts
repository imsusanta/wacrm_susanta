import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SarvamSTTProvider } from '@/core/providers/voice/sarvam-stt-provider';
import { SarvamTTSProvider } from '@/core/providers/voice/sarvam-tts-provider';
import { FallbackTTSProvider } from '@/core/providers/voice/tts-fallback';
import type { TTSProvider } from '@/core/providers/voice/voice-provider.interface';

describe('SarvamSTTProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('transcribes audio correctly with saaras:v3 model', async () => {
    const mockResponse = {
      transcript: 'नमस्ते, मुझे हेल्प सेंटर से बात करनी है',
      request_id: 'req-12345',
      language_code: 'hi-IN',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse,
    } as unknown as Response) as unknown as typeof fetch;

    const provider = new SarvamSTTProvider({ apiKey: 'test-sarvam-key' });
    const dummyAudio = Buffer.from('RIFF....WAVEfmt');

    const result = await provider.transcribeAudio(dummyAudio, {
      languageCode: 'hi-IN',
    });

    expect(result.transcript).toBe('नमस्ते, मुझे हेल्प सेंटर से बात करनी है');
    expect(result.languageCode).toBe('hi-IN');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.requestId).toBe('req-12345');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.sarvam.ai/speech-to-text',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'api-subscription-key': 'test-sarvam-key',
        },
      })
    );
  });

  it('rejects empty audio buffer', async () => {
    const provider = new SarvamSTTProvider({ apiKey: 'test-sarvam-key' });
    await expect(provider.transcribeAudio(Buffer.alloc(0))).rejects.toThrow(
      'Cannot transcribe empty audio buffer'
    );
  });

  it('throws on Sarvam API failure with error JSON', async () => {
    const errorBody = { error: { message: 'Unauthorized subscription key' } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify(errorBody),
      json: async () => errorBody,
    } as unknown as Response) as unknown as typeof fetch;

    const provider = new SarvamSTTProvider({ apiKey: 'invalid-key' });
    const dummyAudio = Buffer.from('audio-data');

    await expect(provider.transcribeAudio(dummyAudio)).rejects.toThrow(
      'Sarvam STT failed (401)'
    );
  });
});

describe('SarvamTTSProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('synthesizes speech with bulbul:v3 and returns audio buffer', async () => {
    const base64Audio = Buffer.from('test-audio-wav').toString('base64');
    const mockResponse = {
      audios: [base64Audio],
      request_id: 'req-tts-999',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockResponse),
      json: async () => mockResponse,
    } as unknown as Response) as unknown as typeof fetch;

    const provider = new SarvamTTSProvider({
      apiKey: 'test-sarvam-key',
    });

    const result = await provider.synthesizeSpeech('Welcome to Helpa', {
      voiceId: 'aditya',
      languageCode: 'en-IN',
    });

    expect(result.audioBuffer).toBeInstanceOf(Buffer);
    expect(result.audioBuffer.toString()).toBe('test-audio-wav');
    expect(result.mimeType).toBe('audio/wav');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.sarvam.ai/text-to-speech',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'api-subscription-key': 'test-sarvam-key',
        }),
        body: JSON.stringify({
          text: 'Welcome to Helpa',
          language_code: 'en-IN',
          speaker: 'aditya',
          model: 'bulbul:v3',
          pace: 1.0,
        }),
      })
    );
  });

  it('throws when synthesize is called with empty text', async () => {
    const provider = new SarvamTTSProvider({ apiKey: 'test-key' });
    await expect(provider.synthesizeSpeech('   ')).rejects.toThrow('Cannot synthesize empty text');
  });
});

describe('FallbackTTSProvider', () => {
  it('uses primary provider when primary succeeds', async () => {
    const primaryMock: TTSProvider = {
      providerName: 'sarvam',
      validateConfiguration: vi.fn().mockResolvedValue(undefined),
      synthesizeSpeech: vi.fn().mockResolvedValue({
        audioBuffer: Buffer.from('primary-audio'),
        mimeType: 'audio/wav',
      }),
      listVoices: vi.fn().mockResolvedValue([]),
    };

    const secondaryMock: TTSProvider = {
      providerName: 'elevenlabs',
      validateConfiguration: vi.fn().mockResolvedValue(undefined),
      synthesizeSpeech: vi.fn(),
      listVoices: vi.fn().mockResolvedValue([]),
    };

    const fallback = new FallbackTTSProvider(primaryMock, secondaryMock);
    const result = await fallback.synthesizeSpeech('Hello world');

    expect(primaryMock.synthesizeSpeech).toHaveBeenCalledWith('Hello world', undefined);
    expect(secondaryMock.synthesizeSpeech).not.toHaveBeenCalled();
    expect(result.audioBuffer.toString()).toBe('primary-audio');
  });

  it('fails over to secondary provider when primary fails', async () => {
    const primaryMock: TTSProvider = {
      providerName: 'sarvam',
      validateConfiguration: vi.fn().mockResolvedValue(undefined),
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('Sarvam 503 Service Unavailable')),
      listVoices: vi.fn().mockResolvedValue([]),
    };

    const secondaryMock: TTSProvider = {
      providerName: 'elevenlabs',
      validateConfiguration: vi.fn().mockResolvedValue(undefined),
      synthesizeSpeech: vi.fn().mockResolvedValue({
        audioBuffer: Buffer.from('fallback-elevenlabs-audio'),
        mimeType: 'audio/mpeg',
      }),
      listVoices: vi.fn().mockResolvedValue([]),
    };

    const fallback = new FallbackTTSProvider(primaryMock, secondaryMock);
    const result = await fallback.synthesizeSpeech('Hello fallback');

    expect(primaryMock.synthesizeSpeech).toHaveBeenCalled();
    expect(secondaryMock.synthesizeSpeech).toHaveBeenCalled();
    expect(result.audioBuffer.toString()).toBe('fallback-elevenlabs-audio');
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('throws fallback error when both primary and secondary fail', async () => {
    const primaryMock: TTSProvider = {
      providerName: 'sarvam',
      validateConfiguration: vi.fn().mockResolvedValue(undefined),
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('Primary network down')),
      listVoices: vi.fn().mockResolvedValue([]),
    };

    const secondaryMock: TTSProvider = {
      providerName: 'elevenlabs',
      validateConfiguration: vi.fn().mockResolvedValue(undefined),
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('Secondary rate limit 429')),
      listVoices: vi.fn().mockResolvedValue([]),
    };

    const fallback = new FallbackTTSProvider(primaryMock, secondaryMock);
    await expect(fallback.synthesizeSpeech('Both fail')).rejects.toThrow(
      'Secondary rate limit 429'
    );
  });
});
