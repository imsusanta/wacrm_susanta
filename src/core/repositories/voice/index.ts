import { getAdminClient } from '@/lib/db/server';
import {
  SupabaseVoiceRepository,
  findUniqueVoiceTenant,
} from './supabase-voice.repository';
import type {
  VoiceCallDocument,
  VoiceCommandDocument,
  VoiceIntegrationDocument,
  VoiceProviderEventDocument,
} from './voice.interface';

export type {
  IVoiceRepository,
  VoiceCallDocument,
  VoiceCommandDocument,
  VoiceIntegrationDocument,
  VoiceProviderEventDocument,
} from './voice.interface';
export { isUniqueViolation } from './voice.interface';
export {
  SupabaseVoiceRepository,
  findUniqueVoiceTenant,
  mapVoiceCall,
  mapVoiceCommand,
  mapVoiceIntegration,
} from './supabase-voice.repository';

function scoped(accountId: string): SupabaseVoiceRepository {
  return new SupabaseVoiceRepository({ accountId }, getAdminClient());
}

/**
 * Compatibility facade. New code should construct SupabaseVoiceRepository
 * with a TenantContext. This object keeps existing call sites compiling
 * without growing src/lib/db/repositories/index.ts.
 */
export const voiceRepository = {
  findIntegration(
    accountId: string,
    provider: string
  ): Promise<VoiceIntegrationDocument | null> {
    return scoped(accountId).findIntegration(provider);
  },
  findUniqueTenant(
    provider: string,
    agentId?: string,
    phoneNumberId?: string
  ): Promise<VoiceIntegrationDocument | null> {
    return findUniqueVoiceTenant(provider, agentId, phoneNumberId);
  },
  createProviderEvent(
    data: Record<string, unknown>
  ): Promise<VoiceProviderEventDocument> {
    return scoped(
      String(data.accountId || data.account_id)
    ).createProviderEvent(data);
  },
  findProviderEvent(
    provider: string,
    externalEventId: string,
    accountId?: string
  ): Promise<VoiceProviderEventDocument | null> {
    if (!accountId?.trim()) {
      throw new Error(
        'findProviderEvent requires accountId after tenant resolution'
      );
    }
    return scoped(accountId).findProviderEvent(provider, externalEventId);
  },
  upsertCall(
    accountId: string,
    externalCallId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCallDocument> {
    return scoped(accountId).upsertCall(externalCallId, data);
  },
  createCall(
    accountId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCallDocument> {
    return scoped(accountId).createCall(data);
  },
  findCallByExternalId(
    accountId: string,
    externalCallId: string
  ): Promise<VoiceCallDocument | null> {
    return scoped(accountId).findCallByExternalId(externalCallId);
  },
  updateCallStatus(
    accountId: string,
    callId: string,
    status: string,
    extra?: Record<string, unknown>
  ): Promise<VoiceCallDocument> {
    return scoped(accountId).updateCallStatus(callId, status, extra);
  },
  createCommand(data: Record<string, unknown>): Promise<VoiceCommandDocument> {
    return scoped(String(data.accountId || data.account_id)).createCommand(
      data
    );
  },
  updateCommand(
    accountId: string,
    commandId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCommandDocument | null> {
    return scoped(accountId).updateCommand(commandId, data);
  },
  findCommand(
    accountId: string,
    idempotencyKey: string
  ): Promise<VoiceCommandDocument | null> {
    return scoped(accountId).findCommand(idempotencyKey);
  },
};
