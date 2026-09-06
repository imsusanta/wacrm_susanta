import {
  TTSProvider,
  TTSOptions,
  TTSSynthesizeResult,
  VoiceOption,
  VoiceProviderConfig,
  VoiceProviderError,
} from './voice-provider.interface';

const DEFAULT_ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const TTS_TIMEOUT_MS = 15_000;

export const DEFAULT_ELEVENLABS_VOICES: VoiceOption[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Calm & Professional)', gender: 'female', provider: 'elevenlabs' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Empathetic & Warm)', gender: 'female', provider: 'elevenlabs' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Expressive)', gender: 'female', provider: 'elevenlabs' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Friendly Male)', gender: 'male', provider: 'elevenlabs' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Authoritative Male)', gender: 'male', provider: 'elevenlabs' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Deep Male)', gender: 'male', provider: 'elevenlabs' },
];

export class ElevenLabsTTSProvider implements TTSProvider {
  readonly providerName = 'elevenlabs' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config?: VoiceProviderConfig) {
    this.apiKey = config?.apiKey || process.env.ELEVENLABS_API_KEY || '';
    this.baseUrl = config?.baseUrl || DEFAULT_ELEVENLABS_BASE_URL;
  }

  async validateConfiguration(): Promise<void> {
    if (!this.apiKey) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_NOT_CONFIGURED',
        'ElevenLabs API key is not configured',
        503
      );
    }
  }

  async listVoices(): Promise<VoiceOption[]> {
    if (!this.apiKey) return DEFAULT_ELEVENLABS_VOICES;

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        const data = (await response.json()) as { voices?: Array<{ voice_id: string; name: string; labels?: { gender?: string } }> };
        if (Array.isArray(data.voices) && data.voices.length > 0) {
          return data.voices.map((v) => ({
            id: v.voice_id,
            name: v.name,
            gender: v.labels?.gender,
            provider: 'elevenlabs',
          }));
        }
      }
    } catch {
      // Return defaults on network/auth failure
    }
    return DEFAULT_ELEVENLABS_VOICES;
  }

  async synthesizeSpeech(
    text: string,
    options?: TTSOptions
  ): Promise<TTSSynthesizeResult> {
    await this.validateConfiguration();

    const trimmedText = text?.trim();
    if (!trimmedText) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        'Cannot synthesize empty text',
        400
      );
    }

    const voiceId = options?.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel default
    const model = options?.model || 'eleven_multilingual_v2';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: trimmedText,
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const code =
          response.status === 401 || response.status === 403
            ? 'VOICE_AUTHENTICATION_FAILED'
            : response.status === 429
              ? 'VOICE_PROVIDER_RATE_LIMITED'
              : 'VOICE_PROVIDER_REQUEST_FAILED';

        throw new VoiceProviderError(
          code,
          `ElevenLabs TTS failed (${response.status}): ${errorText.slice(0, 120)}`,
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const estimatedDuration = Math.max(1, Math.round(trimmedText.length / 15));

      return {
        audioBuffer,
        mimeType: 'audio/mpeg',
        durationSeconds: estimatedDuration,
      };
    } catch (err: unknown) {
      if (err instanceof VoiceProviderError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new VoiceProviderError(
          'VOICE_PROVIDER_TIMEOUT',
          'ElevenLabs TTS request timed out',
          504
        );
      }
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        `ElevenLabs TTS error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        502
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
