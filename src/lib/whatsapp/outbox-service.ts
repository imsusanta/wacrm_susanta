import crypto from 'node:crypto';
import { getAdminClient } from '@/lib/db/server';
import {
  touchConversationPreview,
  outboundPreviewText,
} from '@/lib/whatsapp/persist-outbound-message';

export interface OutboxMessageSnapshot {
  contentType: string;
  contentText: string | null;
  mediaUrl?: string | null;
  templateName?: string | null;
  replyToMessageId?: string | null;
  senderId?: string | null;
}

export interface OutboxEntryPayload {
  accountId: string;
  idempotencyKey: string;
  requestHash: string;
  channel: string;
  conversationId?: string;
  contactId?: string | null;
  provider?: string;
  correlationId?: string;
  messageType?: string;
  messageSnapshot?: OutboxMessageSnapshot;
}

export type OutboxCreateResult =
  | {
      ok: true;
      status: 'created' | 'existing';
      outboxId: string;
      messageId?: string;
      existingStatus?: string;
      providerMessageId?: string;
      requestHashMatches: boolean;
    }
  | {
      ok: false;
      code: 'OUTBOX_PERSISTENCE_FAILED' | 'IDEMPOTENCY_CONFLICT';
      message: string;
      retryable: boolean;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === 'object' && 'message' in value) {
    return String((value as { message?: unknown }).message || 'database error');
  }
  return String(value || 'database error');
}

function persistenceFailure(): OutboxCreateResult {
  return {
    ok: false,
    code: 'OUTBOX_PERSISTENCE_FAILED',
    message: 'Unable to persist the outbound message safely. Please retry.',
    retryable: true,
  };
}

function requireNonBlank(value: string | undefined, label: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export class OutboxService {
  /** Atomically persists the local message and delivery job before provider I/O. */
  static async createPreSendOutbox(
    payload: OutboxEntryPayload
  ): Promise<OutboxCreateResult> {
    try {
      const accountId = requireNonBlank(payload.accountId, 'accountId');
      const conversationId = requireNonBlank(
        payload.conversationId,
        'conversationId'
      );
      const idempotencyKey = requireNonBlank(
        payload.idempotencyKey,
        'idempotencyKey'
      );
      const requestHash = requireNonBlank(payload.requestHash, 'requestHash');
      const db = getAdminClient();
      const correlationId = payload.correlationId || crypto.randomUUID();

      const { data, error } = await db.rpc(
        'enqueue_whatsapp_outbound_message',
        {
          p_account_id: accountId,
          p_conversation_id: conversationId,
          p_idempotency_key: idempotencyKey,
          p_provider: payload.provider || 'meta',
          p_content_type: payload.messageType || 'text',
          p_content_text: payload.messageSnapshot?.contentText ?? null,
          p_sender_type: payload.messageSnapshot?.senderId ? 'agent' : 'bot',
          p_media_url: payload.messageSnapshot?.mediaUrl ?? null,
          p_max_attempts: 8,
          p_payload: {
            requestHash,
            channel: payload.channel || 'whatsapp',
            correlationId,
            contactId: payload.contactId || null,
            messageSnapshot: payload.messageSnapshot || null,
          },
        }
      );

      if (error) {
        console.error('[OutboxService] Atomic enqueue failed:', errorMessage(error));
        return persistenceFailure();
      }

      const result = asRecord(data);
      if (!result?.ok) {
        if (result?.error === 'IDEMPOTENCY_CONFLICT') {
          return {
            ok: false,
            code: 'IDEMPOTENCY_CONFLICT',
            message:
              'Idempotency key has already been used with a different message payload',
            retryable: false,
          };
        }
        console.error(
          '[OutboxService] Atomic enqueue was rejected:',
          String(result?.error || 'unknown result')
        );
        return persistenceFailure();
      }

      const outboxId = String(result.outbox_id || '');
      const messageId = String(result.message_id || '');
      if (!outboxId || !messageId) {
        console.error('[OutboxService] Atomic enqueue returned incomplete IDs');
        return persistenceFailure();
      }

      return {
        ok: true,
        status: result.duplicate ? 'existing' : 'created',
        outboxId,
        messageId,
        existingStatus: result.duplicate
          ? String(result.status || 'processing')
          : undefined,
        providerMessageId: result.provider_message_id
          ? String(result.provider_message_id)
          : undefined,
        requestHashMatches: true,
      };
    } catch (error) {
      console.error(
        '[OutboxService] Atomic enqueue failed:',
        errorMessage(error)
      );
      return persistenceFailure();
    }
  }

  /** Atomically records provider acceptance on the outbox and local message. */
  static async markSent(
    outboxId: string,
    accountId: string,
    providerMessageId: string
  ): Promise<void> {
    const db = getAdminClient();
    const normalizedOutboxId = requireNonBlank(outboxId, 'outboxId');
    const normalizedAccountId = requireNonBlank(accountId, 'accountId');
    const normalizedProviderId = requireNonBlank(
      providerMessageId,
      'providerMessageId'
    );

    const { data, error } = await db.rpc(
      'complete_whatsapp_outbound_message',
      {
        p_outbox_id: normalizedOutboxId,
        p_account_id: normalizedAccountId,
        p_provider_message_id: normalizedProviderId,
      }
    );
    const result = asRecord(data);
    if (!error && result?.ok) return;

    const reason = error
      ? `Atomic completion failed: ${errorMessage(error)}`
      : `Atomic completion rejected: ${String(result?.error || 'unknown')}`;
    try {
      await this.markReconciliationRequired(
        normalizedOutboxId,
        normalizedAccountId,
        normalizedProviderId,
        reason
      );
    } catch (reconciliationError) {
      console.error(
        '[OutboxService] Could not preserve reconciliation state:',
        errorMessage(reconciliationError)
      );
    }
    throw new Error('Failed to complete WhatsApp outbox delivery');
  }

  /** Records provider success without permitting a provider resend. */
  static async markReconciliationRequired(
    outboxId: string,
    accountId: string,
    providerMessageId: string,
    dbErrorMessage: string
  ): Promise<void> {
    const db = getAdminClient();
    const { data, error } = await db
      .from('whatsapp_outbox')
      .update({
        status: 'reconciliation_required',
        provider_message_id: requireNonBlank(
          providerMessageId,
          'providerMessageId'
        ),
        last_error_message: String(dbErrorMessage || 'Local persistence failed').slice(
          0,
          255
        ),
        lease_expires_at: null,
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requireNonBlank(outboxId, 'outboxId'))
      .eq('account_id', requireNonBlank(accountId, 'accountId'))
      .select('id')
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        `Failed to mark WhatsApp outbox for reconciliation: ${errorMessage(error)}`
      );
    }
  }

  /** Permanently closes a provider-rejected delivery job. */
  static async markDeadLetter(
    outboxId: string,
    accountId: string,
    message: string
  ): Promise<void> {
    const db = getAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('whatsapp_outbox')
      .update({
        status: 'dead_letter',
        dead_lettered_at: now,
        last_error_message: String(message || 'Permanent provider error').slice(
          0,
          255
        ),
        lease_expires_at: null,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      })
      .eq('id', requireNonBlank(outboxId, 'outboxId'))
      .eq('account_id', requireNonBlank(accountId, 'accountId'))
      .select('id')
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        `Failed to mark WhatsApp outbox dead letter: ${errorMessage(error)}`
      );
    }
  }

  /** Claims and repairs provider-accepted messages without resending them. */
  static async reconcilePendingMessages(
    batchSize = 20,
    workerId = `reconcile-${process.pid}-${crypto.randomUUID()}`
  ): Promise<number> {
    const db = getAdminClient();
    const limit = Math.min(Math.max(Math.trunc(batchSize), 1), 100);
    const { data, error } = await db.rpc(
      'claim_whatsapp_reconciliation_batch',
      {
        p_worker_id: workerId,
        p_batch_size: limit,
        p_lease_seconds: 120,
      }
    );
    if (error) {
      throw new Error(`Failed to claim reconciliation work: ${errorMessage(error)}`);
    }

    const pending = Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : [];
    let reconciled = 0;

    for (const row of pending) {
      const outboxId = String(row.id || '');
      const accountId = String(row.account_id || '');
      const conversationId = String(row.conversation_id || '');
      const providerMessageId = String(row.provider_message_id || '');

      try {
        if (!outboxId || !accountId || !conversationId || !providerMessageId) {
          if (outboxId && accountId) {
            await this.markDeadLetter(
              outboxId,
              accountId,
              'Reconciliation row is missing required identifiers'
            );
          }
          continue;
        }

        await this.markSent(outboxId, accountId, providerMessageId);
        const payload = asRecord(row.provider_result) || {};
        const snapshot = asRecord(payload.messageSnapshot) || {};
        const contentType = String(snapshot.contentType || 'text');
        const contentText =
          snapshot.contentText == null ? null : String(snapshot.contentText);
        try {
          await touchConversationPreview({
            accountId,
            conversationId,
            previewText: outboundPreviewText({ contentText, contentType }),
          });
        } catch (previewError) {
          console.warn(
            '[OutboxService] Reconciled message but preview update failed:',
            errorMessage(previewError)
          );
        }
        reconciled++;
      } catch (reconciliationError) {
        console.error(
          `[OutboxService] Reconciliation failed for ${outboxId || 'unknown'}:`,
          errorMessage(reconciliationError)
        );
      }
    }

    return reconciled;
  }
}
