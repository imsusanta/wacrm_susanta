import {
  STTProvider,
  STTOptions,
  STTTranscriptionResult,
  VoiceProviderConfig,
  VoiceProviderError,
} from './voice-provider.interface';

const DEFAULT_SARVAM_BASE_URL = 'https://api.sarvam.ai';
const STT_TIMEOUT_MS = 15_000;

export const SARVAM_SUPPORTED_LANGUAGES = [
  'hi-IN', // Hindi
  'bn-IN', // Bengali
  'en-IN', // English (India)
  'kn-IN', // Kannada
  'ml-IN', // Malayalam
  'mr-IN', // Marathi
  'od-IN', // Odia
  'pa-IN', // Punjabi
  'ta-IN', // Tamil
  'te-IN', // Telugu
  'gu-IN', // Gujarati
  'unknown', // Auto-detection
] as const;

export type SarvamLanguageCode = (typeof SARVAM_SUPPORTED_LANGUAGES)[number];

export class SarvamSTTProvider implements STTProvider {
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

  async transcribeAudio(
    audioBuffer: Buffer,
    options?: STTOptions
  ): Promise<STTTranscriptionResult> {
    await this.validateConfiguration();

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        'Cannot transcribe empty audio buffer',
        400
      );
    }

    const languageCode = options?.languageCode || 'unknown';
    const model = options?.model || 'saaras:v3';
    const mimeType = options?.mimeType || 'audio/wav';
    const fileName = mimeType.includes('wav') ? 'audio.wav' : 'audio.mp3';

    // Use native FormData with Blob
    const formData = new FormData();
    const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    formData.append('file', audioBlob, fileName);
    formData.append('language_code', languageCode);
    formData.append('model', model);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'api-subscription-key': this.apiKey,
        },
        body: formData,
        signal: controller.signal,
      });

      const responseText = await response.text();
      let responseJson: Record<string, unknown>;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        throw new VoiceProviderError(
          'VOICE_PROVIDER_REQUEST_FAILED',
          `Sarvam STT returned non-JSON response: ${responseText.slice(0, 100)}`,
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
          `Sarvam STT failed (${response.status}): ${errorDetail}`,
          response.status
        );
      }

      const transcript = typeof responseJson.transcript === 'string' ? responseJson.transcript : '';
      const detectedLang = typeof responseJson.language_code === 'string' ? responseJson.language_code : languageCode;
      const requestId = typeof responseJson.request_id === 'string' ? responseJson.request_id : undefined;

      return {
        transcript,
        languageCode: detectedLang,
        confidence: 0.95,
        isFinal: true,
        requestId,
      };
    } catch (err: unknown) {
      if (err instanceof VoiceProviderError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new VoiceProviderError(
          'VOICE_PROVIDER_TIMEOUT',
          'Sarvam STT request timed out',
          504
        );
      }
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        `Sarvam STT error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        502
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
