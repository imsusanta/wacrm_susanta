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

export {
  isUniqueViolation,
  voiceRepository,
  type VoiceIntegrationDocument,
} from '@/core/repositories/voice';
