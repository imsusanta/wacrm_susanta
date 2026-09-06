import type {
  VoiceProvider,
  VoiceProviderConfig,
  VoiceProviderName,
} from './voice-provider.interface';
import { ElevenLabsVoiceProvider } from './elevenlabs-provider';
import { SarvamVoiceProvider } from './sarvam-provider';
import { XAiVoiceProvider } from './xai-provider';

export function getVoiceProvider(
  providerName: VoiceProviderName,
  config?: VoiceProviderConfig
): VoiceProvider {
  switch (providerName) {
    case 'elevenlabs':
      return new ElevenLabsVoiceProvider(config);
    case 'sarvam':
      return new SarvamVoiceProvider(config);
    case 'xai':
      return new XAiVoiceProvider();
  }
}
