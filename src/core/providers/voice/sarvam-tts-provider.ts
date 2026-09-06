import {
  TTSProvider,
  TTSOptions,
  TTSSynthesizeResult,
  VoiceOption,
  VoiceProviderConfig,
  VoiceProviderError,
} from './voice-provider.interface';

const DEFAULT_SARVAM_BASE_URL = 'https://api.sarvam.ai';
const TTS_TIMEOUT_MS = 15_000;

export const SARVAM_VOICES: VoiceOption[] = [
  { id: 'shubh', name: 'Shubh (Natural Male)', gender: 'male', provider: 'sarvam' },
  { id: 'aditya', name: 'Aditya (Expressive Male)', gender: 'male', provider: 'sarvam' },
  { id: 'rahul', name: 'Rahul (Calm Male)', gender: 'male', provider: 'sarvam' },
  { id: 'arvind', name: 'Arvind (Professional Male)', gender: 'male', provider: 'sarvam' },
  { id: 'amartya', name: 'Amartya (Deep Male)', gender: 'male', provider: 'sarvam' },
  { id: 'anushka', name: 'Anushka (Warm Female)', gender: 'female', provider: 'sarvam' },
  { id: 'priya', name: 'Priya (Friendly Female)', gender: 'female', provider: 'sarvam' },
  { id: 'ritu', name: 'Ritu (Clear Female)', gender: 'female', provider: 'sarvam' },
  { id: 'neha', name: 'Neha (Conversational Female)', gender: 'female', provider: 'sarvam' },
  { id: 'meera', name: 'Meera (Soft Female)', gender: 'female', provider: 'sarvam' },
];

export class SarvamTTSProvider implements TTSProvider {
  readonly providerName = 'sarvam' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config?: VoiceProviderConfig) {
    this.apiKey = config?.apiKey || process.env.SARVAM_API_KEY || '';
    this.baseUrl = config?.baseUrl || DEFAULT_SARVAM_BASE_URL;
  }

  async validateConfiguration(): Promise<void> {
    if (!this.apiKey) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_NOT_CONFIGURED',
        'Sarvam AI API key is not configured',
        503
      );
    }
  }

  async listVoices(): Promise<VoiceOption[]> {
    return SARVAM_VOICES;
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

    const languageCode =
      options?.languageCode || (options as { language?: string })?.language || 'hi-IN';
    const speaker = options?.voiceId || 'shubh';
    const model = options?.model || 'bulbul:v3';
    const pace = typeof options?.pace === 'number' ? options.pace : 1.0;

    const payload = {
      text: trimmedText,
      language_code: languageCode,
      speaker,
      model,
      pace,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let responseJson: Record<string, unknown>;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        throw new VoiceProviderError(
          'VOICE_PROVIDER_REQUEST_FAILED',
          `Sarvam TTS returned non-JSON response: ${responseText.slice(0, 100)}`,
          response.status || 502
        );
      }

      if (!response.ok) {
        const errorDetail =
          (responseJson.error as { message?: string })?.message ||
          (responseJson.message as string) ||
          response.statusText;

        const code =
          response.status === 401 || response.status === 403
            ? 'VOICE_AUTHENTICATION_FAILED'
            : response.status === 429
              ? 'VOICE_PROVIDER_RATE_LIMITED'
              : 'VOICE_PROVIDER_REQUEST_FAILED';

        throw new VoiceProviderError(
          code,
          `Sarvam TTS failed (${response.status}): ${errorDetail}`,
          response.status
        );
      }

      // Sarvam returns { audios: [base64String], request_id: string }
      const audios = Array.isArray(responseJson.audios) ? (responseJson.audios as string[]) : [];
      const base64Audio = audios[0];

      if (!base64Audio || typeof base64Audio !== 'string') {
        throw new VoiceProviderError(
          'VOICE_PROVIDER_REQUEST_FAILED',
          'Sarvam TTS response missing audio payload',
          502
        );
      }

      const audioBuffer = Buffer.from(base64Audio, 'base64');
      const requestId = typeof responseJson.request_id === 'string' ? responseJson.request_id : undefined;

      // Estimate duration from character count (approx 15 chars/sec)
      const estimatedDuration = Math.max(1, Math.round(trimmedText.length / 15));

      return {
        audioBuffer,
        mimeType: 'audio/wav',
        durationSeconds: estimatedDuration,
        requestId,
      };
    } catch (err: unknown) {
      if (err instanceof VoiceProviderError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new VoiceProviderError(
          'VOICE_PROVIDER_TIMEOUT',
          'Sarvam TTS request timed out',
          504
        );
      }
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        `Sarvam TTS error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        502
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
