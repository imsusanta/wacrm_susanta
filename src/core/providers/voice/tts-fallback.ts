import {
  TTSProvider,
  TTSOptions,
  TTSSynthesizeResult,
  VoiceOption,
  VoiceProviderError,
} from './voice-provider.interface';

export class FallbackTTSProvider implements TTSProvider {
  readonly providerName: string;
  private readonly primary: TTSProvider;
  private readonly fallback?: TTSProvider;

  constructor(primary: TTSProvider, fallback?: TTSProvider) {
    this.primary = primary;
    this.fallback = fallback;
    this.providerName = `${primary.providerName}_with_fallback`;
  }

  async validateConfiguration(): Promise<void> {
    await this.primary.validateConfiguration();
  }

  async listVoices(): Promise<VoiceOption[]> {
    const primaryVoices = await this.primary.listVoices().catch(() => []);
    const fallbackVoices = this.fallback
      ? await this.fallback.listVoices().catch(() => [])
      : [];
    return [...primaryVoices, ...fallbackVoices];
  }

  async synthesizeSpeech(
    text: string,
    options?: TTSOptions
  ): Promise<TTSSynthesizeResult> {
    try {
      return await this.primary.synthesizeSpeech(text, options);
    } catch (primaryErr: unknown) {
      const isConfigError =
        primaryErr instanceof VoiceProviderError &&
        primaryErr.code === 'VOICE_PROVIDER_NOT_CONFIGURED';

      if (!this.fallback) {
        throw primaryErr;
      }

      console.warn(
        `[TTS-Failover] Primary provider '${this.primary.providerName}' failed. Attempting fallback '${this.fallback.providerName}'...`,
        primaryErr instanceof Error ? primaryErr.message : primaryErr
      );

      try {
        const fallbackResult = await this.fallback.synthesizeSpeech(text, {
          ...options,
          // If the voice was primary-specific (e.g., Sarvam 'shubh'), let fallback use its own default
          voiceId: undefined,
        });

        console.info(
          `[TTS-Failover] Fallback '${this.fallback.providerName}' succeeded.`
        );

        return fallbackResult;
      } catch (fallbackErr: unknown) {
        console.error(
          `[TTS-Failover] Both primary and fallback TTS providers failed.`,
          {
            primary: primaryErr instanceof Error ? primaryErr.message : primaryErr,
            fallback: fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
          }
        );
        // Throw the original primary error if configuration related, or fallback error
        throw isConfigError ? primaryErr : fallbackErr;
      }
    }
  }
}
