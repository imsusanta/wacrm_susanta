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
  inboundCalling: true,
  outboundCalling: true,
  callTransfer: false,
  callTermination: false,
  liveTranscription: false,
  postCallTranscript: true,
  signedWebhooks: false,
  streamingAudio: false,
};

export class SarvamVoiceProvider implements VoiceProvider {
  readonly providerName = 'sarvam' as const;
  readonly capabilities = capabilities;
  private config: VoiceProviderConfig;

  constructor(config?: VoiceProviderConfig) {
    this.config = config || {};
  }

  private unavailable(): never {
    throw new VoiceProviderError(
      'VOICE_OPERATION_UNSUPPORTED',
      'This Sarvam AI voice operation is not implemented for the current configuration',
      501
    );
  }

  async validateConfiguration(): Promise<void> {
    if (!this.config.apiKey) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_NOT_CONFIGURED',
        'Sarvam Voice Agents API key is required',
        422
      );
    }
  }

  async verifyWebhook(
    _rawBody: string,
    _headers: Headers
  ): Promise<WebhookVerification> {
    return { verified: true };
  }

  async normalizeWebhook(
    rawBody: string,
    _headers?: Headers
  ): Promise<NormalizedVoiceWebhook> {
    try {
      const parsed = JSON.parse(rawBody);
      return {
        externalEventId: parsed.event_id || `sarvam_event_${Date.now()}`,
        eventType: parsed.event || 'call.completed',
        externalCallId: parsed.call_id || parsed.attempt_id || parsed.id || '',
        status: parsed.status === 'completed' ? 'completed' : 'failed',
        startedAt: new Date().toISOString(),
      };
    } catch {
      this.unavailable();
    }
  }

  async listAgents(): Promise<Array<{ id: string; name: string }>> {
    if (this.config.agentId) {
      return [{ id: this.config.agentId, name: this.config.agentId }];
    }
    return [];
  }

  async listPhoneNumbers(): Promise<
    Array<{ id: string; phoneNumberMasked: string }>
  > {
    if (this.config.phoneNumber) {
      return [{ id: this.config.connectionId || 'default', phoneNumberMasked: this.config.phoneNumber }];
    }
    return [];
  }

  async initiateOutboundCall(
    request: OutboundCallRequest
  ): Promise<{ externalCallId: string }> {
    const apiKey = this.config.apiKey;
    const orgId = this.config.orgId || process.env.SARVAM_ORG_ID;
    const workspaceId = this.config.workspaceId || process.env.SARVAM_WORKSPACE_ID;
    const appId = request.agentId || this.config.agentId;
    const connectionId = this.config.connectionId || request.phoneNumberId;
    const fromNumber = this.config.phoneNumber || '+918065354942';
    const toNumber = request.toNumber || request.patientPhone || request.recipientPhone;

    if (!apiKey) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_NOT_CONFIGURED',
        'Sarvam Voice Agents API key is not configured. Please set your API key in Calling → Settings.',
        422
      );
    }

    if (!toNumber) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        'Recipient phone number is required to initiate an outbound call.',
        400
      );
    }

    if (!orgId || !workspaceId || !appId || !connectionId) {
      throw new VoiceProviderError(
        'VOICE_PROVIDER_NOT_CONFIGURED',
        'Sarvam Voice Agents Platform configuration (Org ID, Workspace ID, App ID, Connection ID) is incomplete. Please configure in Calling → Settings.',
        422
      );
    }

    // Format phone number to strict E.164
    let formattedToNumber = toNumber.trim();
    if (!formattedToNumber.startsWith('+')) {
      formattedToNumber = `+${formattedToNumber.replace(/^0+/, '')}`;
    }

    const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds`;

    const payload = {
      app_config: {
        app_id: appId,
        app_version: 1,
        app_type: 'agent',
        connection_config: {
          connection_id: connectionId,
          agent_phone_number: fromNumber.startsWith('+') ? fromNumber : `+${fromNumber}`,
        },
        ...(request.context ? { agent_variables: request.context } : {}),
      },
      user_config: {
        user_phone_number: formattedToNumber,
      },
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr: unknown) {
      const msg = networkErr instanceof Error ? networkErr.message : 'Network error reaching Sarvam';
      throw new VoiceProviderError('VOICE_PROVIDER_REQUEST_FAILED', `Failed to connect to Sarvam: ${msg}`, 502);
    }

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      const errorObj = data.error as Record<string, unknown> | undefined;
      const errorData = errorObj?.data as Record<string, unknown> | undefined;
      const msg =
        (errorData?.details as string) ||
        (errorObj?.message as string) ||
        (data.message as string) ||
        `Sarvam outbound call failed with status ${res.status}`;

      throw new VoiceProviderError(
        'VOICE_PROVIDER_REQUEST_FAILED',
        msg,
        res.status >= 400 && res.status < 500 ? res.status : 502
      );
    }

    const externalCallId =
      (data.call_id as string) ||
      (data.attempt_id as string) ||
      (data.outbound_id as string) ||
      (data.id as string) ||
      `sarvam_${Date.now()}`;

    return { externalCallId };
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
