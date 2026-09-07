import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/db/server';
import { assertTenantContext, type TenantContext } from '../tenant-context';
import type {
  IVoiceRepository,
  VoiceCallDocument,
  VoiceCommandDocument,
  VoiceIntegrationDocument,
  VoiceProviderEventDocument,
} from './voice.interface';

function asRecord(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return null;
  return row as Record<string, unknown>;
}

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

function sanitizeCallStatus(status: string | undefined): string {
  if (status === 'queued' || status === 'initiating') return 'initiated';
  return status || 'initiated';
}

function paramsOf(row: Record<string, unknown>): Record<string, unknown> {
  const raw = row.params_json;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

export function mapVoiceIntegration(
  row: Record<string, unknown>
): VoiceIntegrationDocument {
  return {
    $id: String(row.id),
    accountId: String(row.account_id),
    provider: String(row.provider),
    encryptedCredentialsReference: String(
      row.encrypted_credentials_reference || row.api_key_encrypted || ''
    ),
    agentId: String(row.agent_id || ''),
    providerPhoneNumberId: String(
      row.provider_phone_number_id || row.phone_number_id || ''
    ),
    phoneNumberMasked: row.phone_number_masked as string | undefined,
    status: (row.status as VoiceIntegrationDocument['status']) || 'configured',
    capabilities: row.capabilities as string[] | undefined,
    keyVersion: row.key_version as string | undefined,
  };
}

export function mapVoiceCommand(
  row: Record<string, unknown>
): VoiceCommandDocument {
  const params = paramsOf(row);
  const id = String(row.id ?? '');
  return {
    ...row,
    $id: id,
    id,
    accountId: String(row.account_id ?? ''),
    callId: row.call_id ? String(row.call_id) : undefined,
    commandType: row.command_type ? String(row.command_type) : undefined,
    status: String(row.status || 'pending'),
    idempotencyKey: row.idempotency_key
      ? String(row.idempotency_key)
      : undefined,
    params_json: params,
    commandFingerprint:
      (params.fingerprint as string | undefined) ||
      (params.commandFingerprint as string | undefined),
    externalCallId:
      (params.externalCallId as string | undefined) ||
      (params.external_call_id as string | undefined),
    resultReference:
      (params.resultReference as string | undefined) ||
      (params.result_reference as string | undefined),
    lastErrorSanitized: params.lastErrorSanitized as string | undefined,
  };
}

export function mapVoiceCall(row: Record<string, unknown>): VoiceCallDocument {
  const id = String(row.id ?? row.$id ?? '');
  return {
    ...row,
    $id: id,
    id,
    accountId: String(row.account_id ?? row.accountId ?? ''),
    externalCallId: (row.external_call_id || row.externalCallId) as
      string | undefined,
    status: row.status as string | undefined,
    contactId: (row.contact_id || row.contactId) as string | undefined,
    leadId: (row.lead_id || row.leadId) as string | undefined,
    transcript: row.transcript as string | undefined,
    transcriptReference: (row.transcript_reference ||
      row.transcriptReference) as string | undefined,
    transcriptStatus: (row.transcript_status || row.transcriptStatus) as
      string | undefined,
  };
}

export function mapVoiceProviderEvent(
  row: Record<string, unknown>
): VoiceProviderEventDocument {
  const id = String(row.id ?? '');
  return {
    $id: id,
    id,
    accountId: String(row.account_id ?? ''),
    provider: String(row.provider ?? ''),
    externalEventId: String(row.external_event_id ?? ''),
    payloadHash: String(row.payload_hash ?? ''),
    status: row.status as string | undefined,
    rawPayloadReference: (row.raw_payload_path || row.rawPayloadReference) as
      string | undefined,
  };
}

function callWritePayload(
  accountId: string,
  externalCallId: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    account_id: accountId,
    external_call_id: externalCallId,
    status: sanitizeCallStatus(
      typeof data.status === 'string' ? data.status : undefined
    ),
    updated_at: new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(data)) {
    if (key === 'status') continue;
    if (key === 'externalCallId' || key === 'external_call_id') continue;
    if (key === 'failureMessageSanitized' || key === 'failureCode') {
      payload.failure_reason = value;
      continue;
    }
    payload[camelToSnake(key)] = value;
  }
  return payload;
}

export class SupabaseVoiceRepository implements IVoiceRepository {
  readonly tenantContext: TenantContext;
  private readonly client: SupabaseClient;

  constructor(tenantContext: TenantContext, client?: SupabaseClient) {
    assertTenantContext(tenantContext);
    this.tenantContext = tenantContext;
    this.client = client ?? getAdminClient();
  }

  private accountId(): string {
    assertTenantContext(this.tenantContext);
    return this.tenantContext.accountId.trim();
  }

  async findIntegration(
    provider: string
  ): Promise<VoiceIntegrationDocument | null> {
    const { data } = await this.client
      .from('voice_integrations')
      .select('*')
      .eq('account_id', this.accountId())
      .eq('provider', provider)
      .eq('status', 'configured')
      .maybeSingle();
    const row = asRecord(data);
    return row ? mapVoiceIntegration(row) : null;
  }

  async createProviderEvent(
    data: Record<string, unknown>
  ): Promise<VoiceProviderEventDocument> {
    const { data: row, error } = await this.client
      .from('provider_events')
      .insert({
        account_id: this.accountId(),
        provider: data.provider,
        event_type: data.eventType || data.event_type || 'voice',
        external_event_id:
          data.externalEventId || data.external_event_id || data.eventId,
        payload: data.payload || {},
        payload_hash: data.payloadHash || data.payload_hash || '',
        status: data.processingStatus || data.status || 'queued',
        raw_payload_path:
          data.rawPayloadReference || data.raw_payload_path || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    const mapped = asRecord(row);
    if (!mapped) throw new Error('provider event insert returned no row');
    return mapVoiceProviderEvent(mapped);
  }

  async findProviderEvent(
    provider: string,
    externalEventId: string
  ): Promise<VoiceProviderEventDocument | null> {
    const { data } = await this.client
      .from('provider_events')
      .select('*')
      .eq('account_id', this.accountId())
      .eq('provider', provider)
      .eq('external_event_id', externalEventId)
      .maybeSingle();
    const row = asRecord(data);
    return row ? mapVoiceProviderEvent(row) : null;
  }

  async upsertCall(
    externalCallId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCallDocument> {
    const accountId = this.accountId();
    const { data: existing } = await this.client
      .from('calls')
      .select('*')
      .eq('account_id', accountId)
      .eq('external_call_id', externalCallId)
      .maybeSingle();
    const payload = callWritePayload(accountId, externalCallId, data);
    if (existing) {
      const { data: row } = await this.client
        .from('calls')
        .update(payload)
        .eq('id', (existing as { id: string }).id)
        .eq('account_id', accountId)
        .select('*')
        .maybeSingle();
      return mapVoiceCall(asRecord(row) || asRecord(existing)!);
    }
    const { data: row, error } = await this.client
      .from('calls')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return mapVoiceCall(asRecord(row)!);
  }

  async createCall(data: Record<string, unknown>): Promise<VoiceCallDocument> {
    return this.upsertCall(
      String(data.externalCallId || data.external_call_id || randomUUID()),
      data
    );
  }

  async findCallByExternalId(
    externalCallId: string
  ): Promise<VoiceCallDocument | null> {
    const { data } = await this.client
      .from('calls')
      .select('*')
      .eq('account_id', this.accountId())
      .eq('external_call_id', externalCallId)
      .maybeSingle();
    const row = asRecord(data);
    return row ? mapVoiceCall(row) : null;
  }

  async updateCallStatus(
    callId: string,
    status: string,
    extra?: Record<string, unknown>
  ): Promise<VoiceCallDocument> {
    const accountId = this.accountId();
    const payload = callWritePayload(accountId, '', extra || {});
    delete payload.external_call_id;
    if (extra?.externalCallId || extra?.external_call_id) {
      payload.external_call_id = extra.externalCallId || extra.external_call_id;
    }
    payload.status = sanitizeCallStatus(status);
    const { data, error } = await this.client
      .from('calls')
      .update(payload)
      .eq('id', callId)
      .eq('account_id', accountId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return mapVoiceCall(asRecord(data)!);
  }

  async createCommand(
    data: Record<string, unknown>
  ): Promise<VoiceCommandDocument> {
    const incoming = asRecord(data.paramsJson || data.params_json) || {};
    const params: Record<string, unknown> = { ...incoming };
    const fingerprint = data.commandFingerprint || data.command_fingerprint;
    if (fingerprint) params.fingerprint = fingerprint;
    if (data.externalCallId || data.external_call_id) {
      params.externalCallId = data.externalCallId || data.external_call_id;
    }
    if (data.resultReference || data.result_reference) {
      params.resultReference = data.resultReference || data.result_reference;
    }
    const { data: row, error } = await this.client
      .from('voice_commands')
      .insert({
        account_id: this.accountId(),
        call_id: data.callId || data.call_id || null,
        command_type: data.commandType || data.command_type,
        status: data.status || 'pending',
        params_json: params,
        idempotency_key: data.idempotencyKey || data.idempotency_key,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapVoiceCommand(asRecord(row)!);
  }

  async updateCommand(
    commandId: string,
    data: Record<string, unknown>
  ): Promise<VoiceCommandDocument | null> {
    const accountId = this.accountId();
    const { data: existing } = await this.client
      .from('voice_commands')
      .select('*')
      .eq('id', commandId)
      .eq('account_id', accountId)
      .maybeSingle();
    if (!existing) return null;

    const params = paramsOf(asRecord(existing)!);
    const incoming = asRecord(data.paramsJson || data.params_json);
    if (incoming) Object.assign(params, incoming);
    if (data.commandFingerprint || data.command_fingerprint) {
      params.fingerprint = data.commandFingerprint || data.command_fingerprint;
    }
    if (data.externalCallId || data.external_call_id) {
      params.externalCallId = data.externalCallId || data.external_call_id;
    }
    if (data.resultReference || data.result_reference) {
      params.resultReference = data.resultReference || data.result_reference;
    }
    if (data.lastErrorSanitized) {
      params.lastErrorSanitized = data.lastErrorSanitized;
    }

    const payload: Record<string, unknown> = {
      params_json: params,
      updated_at: new Date().toISOString(),
    };
    if (data.status) payload.status = data.status;
    if (data.callId || data.call_id)
      payload.call_id = data.callId || data.call_id;

    const { data: row, error } = await this.client
      .from('voice_commands')
      .update(payload)
      .eq('id', commandId)
      .eq('account_id', accountId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    const mapped = asRecord(row);
    return mapped ? mapVoiceCommand(mapped) : null;
  }

  async findCommand(
    idempotencyKey: string
  ): Promise<VoiceCommandDocument | null> {
    const { data } = await this.client
      .from('voice_commands')
      .select('*')
      .eq('account_id', this.accountId())
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    const row = asRecord(data);
    return row ? mapVoiceCommand(row) : null;
  }
}

/**
 * Webhook bootstrap only: resolve exactly one integration from provider
 * identifiers before tenant context exists. All later reads/writes must
 * go through SupabaseVoiceRepository with an accountId.
 */
export async function findUniqueVoiceTenant(
  provider: string,
  agentId?: string,
  phoneNumberId?: string,
  client?: SupabaseClient
): Promise<VoiceIntegrationDocument | null> {
  const db = client ?? getAdminClient();
  let query = db
    .from('voice_integrations')
    .select('*')
    .eq('provider', provider);
  if (agentId) query = query.eq('agent_id', agentId);
  if (phoneNumberId)
    query = query.eq('provider_phone_number_id', phoneNumberId);
  const { data } = await query.limit(2);
  if (!data || data.length !== 1) return null;
  return mapVoiceIntegration(data[0] as Record<string, unknown>);
}
