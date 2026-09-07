import type { TenantContext } from '../tenant-context';

export interface VoiceIntegrationDocument {
  $id: string;
  accountId: string;
  provider: string;
  encryptedCredentialsReference: string;
  agentId: string;
  providerPhoneNumberId: string;
  phoneNumberMasked?: string;
  status: 'configured' | 'disabled' | 'error';
  capabilities?: string[];
  keyVersion?: string;
}

export interface VoiceCommandDocument {
  $id: string;
  id: string;
  accountId: string;
  callId?: string;
  commandType?: string;
  status: string;
  idempotencyKey?: string;
  params_json: Record<string, unknown>;
  commandFingerprint?: string;
  externalCallId?: string;
  resultReference?: string;
  lastErrorSanitized?: string;
}

export interface VoiceCallDocument {
  $id: string;
  id: string;
  accountId: string;
  externalCallId?: string;
  status?: string;
  contactId?: string;
  leadId?: string;
  transcript?: string;
  transcriptReference?: string;
  transcriptStatus?: string;
  [key: string]: unknown;
}

export interface VoiceProviderEventDocument {
  $id: string;
  id: string;
  accountId: string;
  provider: string;
  externalEventId: string;
  payloadHash: string;
  status?: string;
  rawPayloadReference?: string;
}

export interface IVoiceRepository {
  readonly tenantContext: TenantContext;
  findIntegration(provider: string): Promise<VoiceIntegrationDocument | null>;
  createProviderEvent(
    data: Record<string, unknown>
  ): Promise<VoiceProviderEventDocument>;
  findProviderEvent(
    provider: string,
    externalEventId: string
  ): Promise<VoiceProviderEventDocument | null>;
  upsertCall(
    externalCallId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCallDocument>;
  createCall(data: Record<string, unknown>): Promise<VoiceCallDocument>;
  findCallByExternalId(
    externalCallId: string
  ): Promise<VoiceCallDocument | null>;
  updateCallStatus(
    callId: string,
    status: string,
    extra?: Record<string, unknown>
  ): Promise<VoiceCallDocument>;
  createCommand(data: Record<string, unknown>): Promise<VoiceCommandDocument>;
  updateCommand(
    commandId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCommandDocument | null>;
  findCommand(idempotencyKey: string): Promise<VoiceCommandDocument | null>;
}

export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string | number }).code;
  return code === '23505' || code === 23505;
}
