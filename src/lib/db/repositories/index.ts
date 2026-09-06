import { randomUUID } from 'node:crypto';
import { getAdminClient } from '@/lib/db/server';

/* eslint-disable @typescript-eslint/no-explicit-any */

function db() {
  return getAdminClient();
}

function asDoc(row: unknown): any {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const id = String(record.id ?? record.$id ?? '');
  const accountId = String(record.account_id ?? record.accountId ?? '');
  return {
    ...record,
    $id: id,
    accountId,
  };
}

async function getTenantRow(
  table: string,
  accountId: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const { data } = await db()
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('account_id', accountId)
    .maybeSingle();
  return asDoc(data as Record<string, unknown> | null);
}

export interface LeadDocument {
  $id: string;
  accountId: string;
  contactId?: string;
  name: string;
  phone?: string;
  stage: string;
  assignedAgentId?: string;
  value?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const leadsRepository = {
  async getLead(
    accountId: string,
    leadId: string
  ): Promise<LeadDocument | null> {
    const row = await getTenantRow('leads', accountId, leadId);
    return row as LeadDocument | null;
  },
  async updateStage(
    accountId: string,
    leadId: string,
    toStage: string,
    actorId: string,
    _idempotencyKey?: string
  ): Promise<LeadDocument> {
    const lead = await this.getLead(accountId, leadId);
    if (!lead) throw new Error('Lead not found in tenant');
    const now = new Date().toISOString();
    const { data, error } = await db()
      .from('leads')
      .update({ stage: toStage, updated_at: now })
      .eq('id', leadId)
      .eq('account_id', accountId)
      .select('*')
      .maybeSingle();
    if (error || !data) throw new Error('Lead not found in tenant');
    const { error: auditError } = await db()
      .from('audit_logs')
      .insert({
        account_id: accountId,
        actor_id: actorId,
        action: 'lead.stage_update',
        resource_type: 'lead',
        resource_id: leadId,
        details: JSON.stringify({ fromStage: lead.stage, toStage }),
        created_at: now,
      });
    if (auditError) {
      console.warn(
        '[leadsRepository] audit log insert failed:',
        auditError.message
      );
    }
    return asDoc(data as Record<string, unknown>) as LeadDocument;
  },
};

export interface AppointmentDocument {
  $id: string;
  accountId: string;
  contactId?: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

export const appointmentsRepository = {
  async getAppointment(accountId: string, appointmentId: string) {
    return (await getTenantRow(
      'appointments',
      accountId,
      appointmentId
    )) as AppointmentDocument | null;
  },
  async createAppointment(
    accountId: string,
    data: Partial<AppointmentDocument>
  ): Promise<AppointmentDocument> {
    const now = new Date().toISOString();
    const { data: row, error } = await db()
      .from('appointments')
      .insert({
        account_id: accountId,
        title: data.title,
        start_time: data.startTime,
        end_time: data.endTime,
        status: data.status || 'scheduled',
        source: data.source,
        contact_id: data.contactId,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    if (error || !row)
      throw new Error(error?.message || 'Failed to create appointment');
    return asDoc(row as Record<string, unknown>) as AppointmentDocument;
  },
};

export const auditLogsRepository = {
  async createAuditLog(
    accountId: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: Record<string, unknown>
  ) {
    const now = new Date().toISOString();
    const { data, error } = await db()
      .from('audit_logs')
      .insert({
        account_id: accountId,
        actor_id: actorId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details: details ? JSON.stringify(details) : '',
        created_at: now,
      })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return asDoc((data || { id: resourceId }) as Record<string, unknown>);
  },
};

export interface ContactDocument {
  $id: string;
  accountId: string;
  name: string;
  phone?: string;
  email?: string;
  tags?: string[];
  consentStatus?: 'pending' | 'opted_in' | 'opted_out';
  createdAt: string;
  updatedAt: string;
}

export const contactsRepository = {
  async getContact(accountId: string, contactId: string) {
    const row = await getTenantRow('contacts', accountId, contactId);
    if (!row) return null;
    return {
      ...row,
      consentStatus: row.consent_status || row.consentStatus,
      phone: row.phone,
    } as ContactDocument;
  },
};

export interface PatientDocument {
  $id: string;
  accountId: string;
  name: string;
}

export const patientsRepository = {
  async getPatient(accountId: string, patientId: string) {
    return (await getTenantRow(
      'patients',
      accountId,
      patientId
    )) as PatientDocument | null;
  },
  async deletePatient(accountId: string, patientId: string) {
    const existing = await this.getPatient(accountId, patientId);
    if (!existing) throw new Error('Patient not found in tenant');
    const { error } = await db()
      .from('patients')
      .delete()
      .eq('id', patientId)
      .eq('account_id', accountId);
    if (error) throw error;
  },
};

export const conversationsRepository = {
  async getConversation(accountId: string, conversationId: string) {
    return getTenantRow('conversations', accountId, conversationId);
  },
};

export const callsRepository = {
  async getCall(accountId: string, callId: string) {
    return getTenantRow('calls', accountId, callId);
  },
};

export const integrationsRepository = {
  async getIntegration(accountId: string, providerOrId: string) {
    const byId = await getTenantRow('integrations', accountId, providerOrId);
    if (byId) return byId;
    const { data } = await db()
      .from('integrations')
      .select('*')
      .eq('account_id', accountId)
      .eq('provider', providerOrId)
      .maybeSingle();
    return asDoc(data as Record<string, unknown> | null);
  },
};

export const providerEventsRepository = {
  async getEvent(accountId: string, eventId: string) {
    return getTenantRow('provider_events', accountId, eventId);
  },
  async isDuplicateEvent(provider: string, eventId: string): Promise<boolean> {
    const { data } = await db()
      .from('provider_events')
      .select('id')
      .eq('provider', provider)
      .eq('external_event_id', eventId)
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  },
  async recordEvent(
    provider: string,
    eventType: string,
    eventId: string,
    payload: Record<string, unknown>,
    accountId?: string
  ) {
    const { data, error } = await db()
      .from('provider_events')
      .insert({
        account_id: accountId,
        provider,
        event_type: eventType,
        external_event_id: eventId,
        payload,
        payload_hash: eventId,
        status: 'processed',
      })
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return asDoc((data || { id: eventId }) as Record<string, unknown>);
  },
};

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

function mapVoiceIntegration(
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

export const voiceRepository = {
  async findIntegration(
    accountId: string,
    provider: string
  ): Promise<VoiceIntegrationDocument | null> {
    const { data } = await db()
      .from('voice_integrations')
      .select('*')
      .eq('account_id', accountId)
      .eq('provider', provider)
      .eq('status', 'configured')
      .maybeSingle();
    return data ? mapVoiceIntegration(data as Record<string, unknown>) : null;
  },
  async findUniqueTenant(
    provider: string,
    agentId?: string,
    phoneNumberId?: string
  ): Promise<VoiceIntegrationDocument | null> {
    let query = db()
      .from('voice_integrations')
      .select('*')
      .eq('provider', provider);
    if (agentId) query = query.eq('agent_id', agentId);
    if (phoneNumberId)
      query = query.eq('provider_phone_number_id', phoneNumberId);
    const { data } = await query.limit(2);
    if (!data || data.length !== 1) return null;
    return mapVoiceIntegration(data[0] as Record<string, unknown>);
  },
  async createProviderEvent(data: Record<string, unknown>) {
    const { data: row, error } = await db()
      .from('provider_events')
      .insert({
        account_id: data.accountId || data.account_id,
        provider: data.provider,
        event_type: data.eventType || data.event_type || 'voice',
        external_event_id:
          data.externalEventId || data.external_event_id || data.eventId,
        payload: data.payload || {},
        payload_hash: data.payloadHash || data.payload_hash || '',
        status: data.processingStatus || data.status || 'queued',
      })
      .select('*')
      .single();
    if (error) throw error;
    return asDoc(row as Record<string, unknown>);
  },
  async findProviderEvent(provider: string, externalEventId: string) {
    const { data } = await db()
      .from('provider_events')
      .select('*')
      .eq('provider', provider)
      .eq('external_event_id', externalEventId)
      .maybeSingle();
    return asDoc(data as Record<string, unknown> | null);
  },
  async upsertCall(
    accountId: string,
    externalCallId: string,
    data: Record<string, unknown>
  ) {
    const { data: existing } = await db()
      .from('calls')
      .select('*')
      .eq('account_id', accountId)
      .eq('external_call_id', externalCallId)
      .maybeSingle();
    const sanitizedStatus =
      data.status === 'queued' || data.status === 'initiating'
        ? 'initiated'
        : (data.status as string) || 'initiated';
    const payload = {
      account_id: accountId,
      external_call_id: externalCallId,
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
          v,
        ])
      ),
      status: sanitizedStatus,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      const { data: row } = await db()
        .from('calls')
        .update(payload)
        .eq('id', existing.id)
        .eq('account_id', accountId)
        .select('*')
        .maybeSingle();
      return asDoc((row || existing) as Record<string, unknown>);
    }
    const { data: row, error } = await db()
      .from('calls')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return asDoc(row as Record<string, unknown>);
  },
  async createCall(accountId: string, data: Record<string, unknown>) {
    return this.upsertCall(
      accountId,
      String(data.externalCallId || data.external_call_id || randomUUID()),
      data
    );
  },
  async findCallByExternalId(accountId: string, externalCallId: string) {
    const { data } = await db()
      .from('calls')
      .select('*')
      .eq('account_id', accountId)
      .eq('external_call_id', externalCallId)
      .maybeSingle();
    return asDoc(data as Record<string, unknown> | null);
  },
  async updateCallStatus(
    accountId: string,
    callId: string,
    status: string,
    extra?: Record<string, unknown>
  ) {
    const sanitizedStatus =
      status === 'queued' || status === 'initiating' ? 'initiated' : status;
    const sanitizedExtra: Record<string, unknown> = {};
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (k === 'externalCallId') sanitizedExtra.external_call_id = v;
        else if (k === 'failureMessageSanitized' || k === 'failureCode')
          sanitizedExtra.failure_reason = v;
        else {
          const snakeKey = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
          sanitizedExtra[snakeKey] = v;
        }
      }
    }
    const { data, error } = await db()
      .from('calls')
      .update({
        status: sanitizedStatus,
        ...sanitizedExtra,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .eq('account_id', accountId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return asDoc(data as Record<string, unknown>);
  },
  async createCommand(data: Record<string, unknown>) {
    const { data: row, error } = await db()
      .from('voice_commands')
      .insert({
        account_id: data.accountId || data.account_id,
        call_id: data.callId || data.call_id,
        command_type: data.commandType || data.command_type,
        status: data.status || 'pending',
        params_json: data.paramsJson || data.params_json || {
          fingerprint: data.commandFingerprint || data.command_fingerprint,
        },
        idempotency_key: data.idempotencyKey || data.idempotency_key,
      })
      .select('*')
      .single();
    if (error) throw error;
    return asDoc(row as Record<string, unknown>);
  },
  async updateCommand(commandId: string, data: Record<string, unknown>) {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (data.status) payload.status = data.status;
    if (data.callId || data.call_id) payload.call_id = data.callId || data.call_id;
    if (data.paramsJson || data.params_json) payload.params_json = data.paramsJson || data.params_json;
    const { data: row, error } = await db()
      .from('voice_commands')
      .update(payload)
      .eq('id', commandId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return asDoc(row as Record<string, unknown> | null);
  },
  async findCommand(accountId: string, idempotencyKey: string) {
    const { data } = await db()
      .from('voice_commands')
      .select('*')
      .eq('account_id', accountId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    return asDoc(data as Record<string, unknown> | null);
  },
};
