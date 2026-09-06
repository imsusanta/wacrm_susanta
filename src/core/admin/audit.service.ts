/** Helpa Core Super Admin — immutable administrative audit trail. */

import { randomUUID } from 'node:crypto';
import type { AdminAuditLog } from './types';
import { getAdminClient } from '@/lib/db/server';

const SENSITIVE_KEY =
  /(?:token|secret|password|passphrase|api.?key|credential|signature|authorization|cookie)/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, nested]) => [key, sanitizeValue(nested)])
  );
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  return sanitizeValue(metadata || {}) as Record<string, unknown>;
}

export async function logAdminAction({
  actorEmail,
  action,
  targetType,
  targetId,
  workspaceId,
  metadata,
}: {
  actorEmail: string;
  action: string;
  targetType: AdminAuditLog['targetType'];
  targetId: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<AdminAuditLog> {
  if (!actorEmail?.trim()) throw new Error('Admin audit actor is required');
  if (!action?.trim()) throw new Error('Admin audit action is required');
  if (!targetId?.trim()) throw new Error('Admin audit target is required');

  const database = getAdminClient();
  const timestamp = new Date().toISOString();
  const safeMetadata = sanitizeMetadata(metadata);
  const record: AdminAuditLog = {
    id: randomUUID(),
    actorEmail: actorEmail.trim().toLowerCase(),
    action,
    targetType,
    targetId,
    workspaceId,
    timestamp,
    metadata: safeMetadata,
  };

  const { error } = await database.from('audit_logs').insert({
    account_id: workspaceId || null,
    action: `admin:${action}`,
    target_type: targetType,
    target_id: UUID_RE.test(targetId) ? targetId : null,
    metadata: {
      audit_id: record.id,
      actor_email: record.actorEmail,
      target_id: targetId,
      ...safeMetadata,
    },
    created_at: timestamp,
  });
  if (error) throw new Error(`ADMIN_AUDIT_WRITE_FAILED: ${error.message}`);
  return record;
}

export async function listAdminAuditLogs(filter?: {
  action?: string;
  targetType?: string;
  workspaceId?: string;
  limit?: number;
}): Promise<AdminAuditLog[]> {
  const database = getAdminClient();
  let query = database
    .from('audit_logs')
    .select('*')
    .ilike('action', 'admin:%')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(filter?.limit || 50, 1), 200));

  if (filter?.workspaceId) query = query.eq('account_id', filter.workspaceId);
  if (filter?.action) query = query.eq('action', `admin:${filter.action}`);
  if (filter?.targetType) query = query.eq('target_type', filter.targetType);

  const { data: rows, error } = await query;
  if (error) throw new Error(`ADMIN_AUDIT_READ_FAILED: ${error.message}`);

  return ((rows || []) as Record<string, unknown>[]).map((row) => {
    const metadata =
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {};
    return {
      id: String(metadata.audit_id || row.id),
      actorEmail: String(metadata.actor_email || ''),
      action: String(row.action || '').replace(/^admin:/, ''),
      targetType: (row.target_type ||
        metadata.target_type ||
        'system') as AdminAuditLog['targetType'],
      targetId: String(row.target_id || metadata.target_id || ''),
      workspaceId: row.account_id ? String(row.account_id) : undefined,
      timestamp: String(row.created_at || ''),
      metadata,
    };
  });
}
