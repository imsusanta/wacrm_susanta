import {
  VoiceProviderError,
  type VoiceProvider,
  type VoiceCapabilities,
  type VoiceProviderConfig,
  type ProviderHealth,
  type WebhookVerification,
  type NormalizedVoiceWebhook,
  type OutboundCallRequest,
  type ProviderCall,
} from './voice-provider.interface';

const capabilities: VoiceCapabilities = {
  inboundCalling: false,
  outboundCalling: false,
  callTransfer: false,
  callTermination: false,
  liveTranscription: false,
  postCallTranscript: false,
  signedWebhooks: false,
  streamingAudio: false,
};

export class SarvamVoiceProvider implements VoiceProvider {
  readonly providerName = 'sarvam' as const;
  readonly capabilities = capabilities;
  constructor(_config?: VoiceProviderConfig) {}
  private unavailable(): never {
    throw new VoiceProviderError(
      'VOICE_OPERATION_UNSUPPORTED',
      'Sarvam AI voice telephony operations are not implemented because the documented public API does not provide this contract',
      501
    );
  }
  async validateConfiguration(): Promise<void> {
    this.unavailable();
  }
  async verifyWebhook(
    _rawBody: string,
    _headers: Headers
  ): Promise<WebhookVerification> {
    this.unavailable();
  }
  async normalizeWebhook(
    _rawBody: string,
    _headers: Headers
  ): Promise<NormalizedVoiceWebhook> {
    this.unavailable();
  }
  async listAgents(): Promise<Array<{ id: string; name: string }>> {
    this.unavailable();
  }
  async listPhoneNumbers(): Promise<
    Array<{ id: string; phoneNumberMasked: string }>
  > {
    this.unavailable();
  }
  async initiateOutboundCall(
    _request: OutboundCallRequest
  ): Promise<{ externalCallId: string }> {
    throw new VoiceProviderError(
      'VOICE_OPERATION_UNSUPPORTED',
      'Sarvam AI outbound calling requires the Voice Agents Platform (platform.sarvam.ai). ' +
        'Please configure your Sarvam Platform App ID, Org ID, and phone number in Calling → Settings.',
      422
    );
  }
  async getCallStatus(_externalCallId: string): Promise<ProviderCall> {
    this.unavailable();
  }
  async getTranscript(_externalCallId: string): Promise<string | null> {
    this.unavailable();
  }
  async transferCall(
    _externalCallId: string,
    _targetNumber: string
  ): Promise<void> {
    this.unavailable();
  }
  async terminateCall(_externalCallId: string): Promise<void> {
    this.unavailable();
  }
  async healthCheck(): Promise<ProviderHealth> {
    return {
      configured: false,
      credentialsValid: false,
      providerReachable: false,
      webhookConfigured: false,
      agentFound: false,
      phoneNumberFound: false,
      capabilities,
    };
  }
}
