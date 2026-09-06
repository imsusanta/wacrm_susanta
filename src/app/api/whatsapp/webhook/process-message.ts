import { getAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { normalizePhone } from '@/lib/whatsapp/phone-utils';
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { dispatchInboundToFlows } from '@/lib/flows/engine';
import { triggerAiResponse } from '@/lib/whatsapp/ai';
import { safeRecordOutcomeEvent } from '@/lib/metrics/safe-record';
import { getAccountChatbotSettings } from '@/core/ai/chatbot-settings';
import { logger } from '@/lib/observability/logger';
import {
  handleCustomerReply,
  processInboundLeadDetection,
} from '@/lib/leads/inbound-lead-layer';
import { parseMessageContent } from './parse-event';
import { findOrCreateContact } from './contact-service';
import {
  findOrCreateConversation,
  lookupInternalIdByMetaId,
  flagBroadcastReplyIfAny,
} from './conversation-service';
import { handleReaction } from './process-reaction';
import { handleTravelBookingInbound } from '@/lib/travel/booking-confirm';
import type { WhatsAppMessage } from './types';

/**
 * SQLSTATE 23505. On the inbound path a unique violation is not an error —
 * it means a retried webhook delivery raced us and the message is already in
 * the inbox exactly once, which is precisely the guarantee we want.
 */
function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === '23505' ||
    candidate.message?.toLowerCase().includes('duplicate key') === true
  );
}

function providerMessageDate(timestamp: string | undefined): Date {
  const seconds = Number(timestamp);
  const date =
    Number.isFinite(seconds) && seconds > 0
      ? new Date(seconds * 1000)
      : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

type RollupMarkerState = {
  /** Whether the marker column/query shape was available. */
  known: boolean;
  /** Whether this call atomically claimed the message for rollup. */
  claimed: boolean;
  /** False when the result came from a compatibility read rather than a claim. */
  atomic: boolean;
};

async function inspectInboundRollupMarker({
  messageId,
  conversationId,
  accountId,
}: {
  messageId: string;
  conversationId: string;
  accountId: string;
}): Promise<{ known: boolean; applied: boolean }> {
  const db = getAdminClient();
  for (const key of ['message_id', 'provider_message_id', 'id']) {
    try {
      const result = await db
        .from('messages')
        .select('inbound_rollup_applied_at')
        .eq(key, messageId)
        .eq('conversation_id', conversationId)
        .eq('account_id', accountId)
        .limit(1);
      if (!result.error && result.data?.length) {
        return {
          known: true,
          applied: Boolean(result.data[0]?.inbound_rollup_applied_at),
        };
      }
    } catch {
      // Continue through compatibility shapes.
    }
  }
  return { known: false, applied: false };
}

async function markInboundRollup({
  messageId,
  conversationId,
  accountId,
  value,
}: {
  messageId: string;
  conversationId: string;
  accountId: string;
  value: string | null;
}): Promise<void> {
  const db = getAdminClient();
  for (const key of ['message_id', 'provider_message_id', 'id']) {
    try {
      const result = await db
        .from('messages')
        .update({ inbound_rollup_applied_at: value })
        .eq(key, messageId)
        .eq('conversation_id', conversationId)
        .eq('account_id', accountId);
      if (!result.error) return;
    } catch {
      // Continue through compatibility shapes.
    }
  }
}

/**
 * Re-read a row after a unique-constraint race. The initial duplicate lookup
 * is intentionally only a fast path and can be blind during concurrent
 * deliveries; a second lookup lets us repair a rollup when the winning
 * delivery inserted a complete payload. If the compatibility schema/fake
 * cannot expose the row, return null and leave the existing rollup untouched.
 */
async function findPersistedInboundMessage({
  messageId,
  conversationId,
  accountId,
}: {
  messageId: string;
  conversationId: string;
  accountId: string;
}): Promise<{
  id: string;
  content_text?: string | null;
  created_at?: string | null;
  conversation_id?: string | null;
} | null> {
  const db = getAdminClient();
  for (const key of ['message_id', 'provider_message_id', 'id']) {
    try {
      const result = await db
        .from('messages')
        .select('id, content_text, created_at, conversation_id')
        .eq(key, messageId)
        .eq('conversation_id', conversationId)
        .eq('account_id', accountId)
        .limit(1);
      if (!result.error && result.data?.length) {
        return result.data[0] as {
          id: string;
          content_text?: string | null;
          created_at?: string | null;
          conversation_id?: string | null;
        };
      }
    } catch {
      // Try the next identifier/compatibility shape.
    }
  }
  return null;
}

/**
 * Claim the inbound rollup marker for one message. Provider IDs are not
 * internal UUIDs, so compatibility paths must look at message_id and
 * provider_message_id as well as id. The conditional update makes the
 * fallback retry-safe when the atomic RPC is unavailable.
 */
async function claimInboundRollupMarker({
  messageId,
  conversationId,
  accountId,
}: {
  messageId: string;
  conversationId: string;
  accountId: string;
}): Promise<RollupMarkerState> {
  const db = getAdminClient();
  const markerAt = new Date().toISOString();

  for (const key of ['message_id', 'provider_message_id', 'id']) {
    try {
      const query = db
        .from('messages')
        .update({ inbound_rollup_applied_at: markerAt })
        .eq(key, messageId)
        .eq('conversation_id', conversationId)
        .eq('account_id', accountId)
        .is('inbound_rollup_applied_at', null)
        .select('id')
        .limit(1);
      const result = await query;
      if (!result.error) {
        return {
          known: true,
          claimed: Boolean(result.data?.length),
          atomic: true,
        };
      }
    } catch {
      // Try the next identifier/schema shape.
    }
  }

  // Legacy rows may use camelCase columns and may not support a conditional
  // update chain. A read is still useful for deciding whether to increment;
  // the modern schema takes the atomic path above.
  for (const key of ['message_id', 'provider_message_id', 'id']) {
    try {
      const result = await db
        .from('messages')
        .select('inbound_rollup_applied_at')
        .eq(key, messageId)
        .eq('conversation_id', conversationId)
        .eq('account_id', accountId)
        .limit(1);
      if (!result.error && result.data?.length) {
        return {
          known: true,
          claimed: !result.data[0]?.inbound_rollup_applied_at,
          atomic: false,
        };
      }
    } catch {
      // Continue through compatibility shapes.
    }
  }

  return { known: false, claimed: false, atomic: false };
}

/**
 * Advance a conversation's rollup fields for a newly-received inbound
 * message: preview text, last-message timestamp, unread badge, and reopening
 * a closed thread.
 *
 * Prefers the `apply_inbound_message_to_conversation` RPC, which performs the
 * unread increment inside a single UPDATE. The previous read-modify-write
 * (`unread_count = valueReadEarlier + 1`) dropped increments whenever two
 * replies arrived at once, and never reopened a closed conversation — leaving
 * the new reply hidden behind the inbox's status filter.
 *
 * Falls back to the direct update (and then the legacy camelCase column
 * names) so a database without the migration still gets its preview and
 * badge updated.
 */
async function applyConversationRollup({
  convId,
  previewText,
  messageDate,
  conversation,
  accountId,
  messageId,
  correlationId,
}: {
  convId: string;
  previewText: string;
  messageDate: Date;
  conversation: Record<string, unknown>;
  accountId: string;
  messageId: string;
  correlationId?: string;
}): Promise<void> {
  const db = getAdminClient();

  // The four-argument function claims the message row before incrementing
  // unread_count, making a retry of an already-inserted message repair-safe.
  const { error: rpcError } = await db.rpc(
    'apply_inbound_message_to_conversation',
    {
      p_conversation_id: convId,
      p_preview: previewText,
      p_message_at: messageDate.toISOString(),
      p_message_key: messageId,
    }
  );

  if (!rpcError) return;

  // Older deployments only have the original three-argument RPC. It is safe
  // for the first delivery; the marker/rollup checks below prevent duplicate
  // unread increments when the newer function is unavailable.
  const rpcCode = String((rpcError as { code?: string }).code || '');
  if (rpcCode === '42883' || rpcCode === 'PGRST202') {
    const marker = await inspectInboundRollupMarker({
      messageId,
      conversationId: convId,
      accountId,
    });
    if (!marker.known || !marker.applied) {
      const legacyRpc = await db.rpc('apply_inbound_message_to_conversation', {
        p_conversation_id: convId,
        p_preview: previewText,
        p_message_at: messageDate.toISOString(),
      });
      if (!legacyRpc.error) {
        await markInboundRollup({
          messageId,
          conversationId: convId,
          accountId,
          value: new Date().toISOString(),
        });
        return;
      }
    }
  }

  logger.warn('Atomic conversation rollup unavailable; using fallback update', {
    correlationId,
    component: 'inbound-message',
    accountId,
    conversationId: convId,
    messageId,
    code: (rpcError as { code?: string }).code,
  });

  // Fallback: replicate the RPC's semantics in application code.
  const existingLastMessageAt =
    conversation.lastMessageAt || conversation.last_message_at
      ? new Date(
          (conversation.lastMessageAt || conversation.last_message_at) as string
        )
      : null;
  const shouldUpdatePreview =
    !existingLastMessageAt || messageDate >= existingLastMessageAt;

  const marker = await claimInboundRollupMarker({
    messageId,
    conversationId: convId,
    accountId,
  });
  const shouldIncrementUnread = marker.known ? marker.claimed : true;

  const currentUnread = Number(
    conversation.unread_count || conversation.unreadCount || 0
  );
  const currentStatus = String(conversation.status ?? 'open');

  const convUpdatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    unread_count: currentUnread + (shouldIncrementUnread ? 1 : 0),
  };
  if (shouldUpdatePreview) {
    convUpdatePayload.last_message_text = previewText;
    convUpdatePayload.last_message_at = messageDate.toISOString();
  }
  // A customer replying to a closed thread reopens it.
  if (currentStatus === 'closed') {
    convUpdatePayload.status = 'open';
  }

  const { error: convError } = await db
    .from('conversations')
    .update(convUpdatePayload)
    .eq('id', convId);

  if (!convError) {
    if (shouldIncrementUnread && !marker.atomic) {
      await markInboundRollup({
        messageId,
        conversationId: convId,
        accountId,
        value: new Date().toISOString(),
      });
    }
    return;
  }

  // Legacy camelCase fallback.
  const legacyPayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    unreadCount: currentUnread + (shouldIncrementUnread ? 1 : 0),
  };
  if (shouldUpdatePreview) {
    legacyPayload.lastMessageText = previewText;
    legacyPayload.lastMessageAt = messageDate.toISOString();
  }
  if (currentStatus === 'closed') {
    legacyPayload.status = 'open';
  }

  try {
    const { error: legacyError } = await db
      .from('conversations')
      .update(legacyPayload)
      .eq('id', convId);

    if (legacyError) {
      logger.error('Conversation rollup failed after all fallbacks', {
        correlationId,
        component: 'inbound-message',
        accountId,
        conversationId: convId,
        messageId,
        code: (legacyError as { code?: string }).code,
      });
      throw new Error(
        `Conversation rollup failed for inbound message ${messageId}`
      );
    }

    // The canonical update failed, but the legacy update completed. Preserve
    // an atomic claim, or record the compatibility marker now, so a webhook
    // retry cannot count the same inbound message a second time.
    if (shouldIncrementUnread && !marker.atomic) {
      await markInboundRollup({
        messageId,
        conversationId: convId,
        accountId,
        value: new Date().toISOString(),
      });
    }
  } catch (err) {
    // Neither conversation shape was updated. Release an atomic claim so the
    // provider's retry can repair the rollup instead of being suppressed.
    if (shouldIncrementUnread && marker.atomic) {
      await markInboundRollup({
        messageId,
        conversationId: convId,
        accountId,
        value: null,
      });
    }
    logger.error('Conversation rollup threw after all fallbacks', {
      correlationId,
      component: 'inbound-message',
      accountId,
      conversationId: convId,
      messageId,
      error: err instanceof Error ? err.message : 'unknown',
    });
    throw new Error(
      `Conversation rollup failed for inbound message ${messageId}`
    );
  }
}

export async function handleReminderReplyAction(
  accountId: string,
  apptId: string,
  action: string,
  conversationId: string,
  contactId: string,
  userId: string
): Promise<boolean> {
  const db = getAdminClient();

  // 1. Fetch appointment details — always scoped to the resolved tenant.
  // The appointment id arrives inside an attacker-influenceable
  // interactive reply id, so an unscoped lookup would let a crafted
  // reply read or mutate another tenant's appointment.
  const { data: appt, error: apptErr } = await db
    .from('appointments')
    .select(
      'id, appointment_date, appointment_time, doctor:hospital_doctors(id, name, department)'
    )
    .eq('id', apptId)
    .eq('account_id', accountId)
    .single();

  if (apptErr || !appt) {
    console.error('[Reminder Interceptor] Appointment not found:', apptErr);
    return false;
  }

  const docData = appt.doctor as
    | { name: string; id?: string; department?: string }
    | Array<{ name: string; id?: string; department?: string }>
    | null;
  const docName =
    (Array.isArray(docData) ? docData[0]?.name : docData?.name) || 'Doctor';
  const apptDate = appt.appointment_date || 'N/A';
  const apptTime = appt.appointment_time
    ? appt.appointment_time.substring(0, 5)
    : 'N/A';

  const { engineSendText } = await import('@/lib/automations/meta-send');

  if (action === 'confirm') {
    await db
      .from('appointments')
      .update({ status: 'Confirmed' })
      .eq('id', apptId)
      .eq('account_id', accountId);

    await db.from('contact_notes').insert({
      account_id: accountId,
      contact_id: contactId,
      note_text: `[Timeline] Patient Confirmed Appointment via WhatsApp for Dr. ${docName} on ${apptDate} at ${apptTime}.`,
    });

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `Thank you! Your appointment with Dr. ${docName} on ${apptDate} at ${apptTime} has been successfully confirmed. We look forward to seeing you.`,
    });

    await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: `[System Alert] Patient confirmed their appointment with Dr. ${docName} on ${apptDate} at ${apptTime}.`,
      status: 'sent',
    });

    return true;
  }

  if (action === 'resched') {
    await db
      .from('appointments')
      .update({ status: 'Reschedule Requested' })
      .eq('id', apptId)
      .eq('account_id', accountId);

    await db.from('contact_notes').insert({
      account_id: accountId,
      contact_id: contactId,
      note_text: `[Timeline] Patient Requested Reschedule via WhatsApp for appointment with Dr. ${docName} on ${apptDate} at ${apptTime}.`,
    });

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `Certainly! I will help you reschedule your appointment with Dr. ${docName}. Please reply with your preferred new date and time, and I will check availability for you.`,
    });

    await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: `[System Alert] Patient requested a reschedule for their appointment with Dr. ${docName} on ${apptDate} at ${apptTime}.`,
      status: 'sent',
    });

    return true;
  }

  if (action === 'cancel') {
    await db
      .from('appointments')
      .update({ status: 'Cancelled' })
      .eq('id', apptId)
      .eq('account_id', accountId);

    await db.from('contact_notes').insert({
      account_id: accountId,
      contact_id: contactId,
      note_text: `[Timeline] Patient Cancelled Appointment via WhatsApp for Dr. ${docName} on ${apptDate} at ${apptTime}.`,
    });

    await engineSendText({
      accountId,
      userId,
      conversationId,
      contactId,
      text: `Your appointment with Dr. ${docName} on ${apptDate} at ${apptTime} has been cancelled as requested. If you wish to schedule a new visit in the future, please let us know.`,
    });

    await db.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: `[System Alert] Patient cancelled their appointment with Dr. ${docName} on ${apptDate} at ${apptTime}.`,
      status: 'sent',
    });

    return true;
  }

  return false;
}

export async function handleReportButtonReply(
  accountId: string,
  reportId: string,
  action: 'download' | 'status',
  conversationId: string,
  contactId: string,
  userId: string
): Promise<boolean> {
  const db = getAdminClient();

  // Scoped to the resolved tenant: the report id arrives inside an
  // attacker-influenceable interactive reply id, so an unscoped lookup
  // would leak another tenant's report PDF over WhatsApp.
  const { data: report, error } = await db
    .from('hospital_lab_reports')
    .select(
      'id, test_name, status, expected_delivery_date, report_pdf_url, department, doctor:hospital_doctors(name)'
    )
    .eq('id', reportId)
    .eq('account_id', accountId)
    .single();

  if (error || !report) {
    console.error('[Report Button] Report not found:', error);
    return false;
  }

  const { engineSendText, engineSendDocument } =
    await import('@/lib/automations/meta-send');
  const docData = report.doctor as
    { name: string } | Array<{ name: string }> | null;
  const docName =
    (Array.isArray(docData) ? docData[0]?.name : docData?.name) || 'Doctor';

  if (action === 'download' && report.report_pdf_url) {
    await engineSendDocument({
      accountId,
      userId,
      conversationId,
      contactId,
      documentUrl: report.report_pdf_url,
      filename: `${report.test_name.replace(/\s+/g, '_')}_Report.pdf`,
      caption: `Here is your ${report.test_name} report from Dr. ${docName}.`,
    });
    return true;
  }

  let statusMsg = '';
  switch (report.status) {
    case 'pending':
      statusMsg = `Your *${report.test_name}* report request has been received.\n\n📋 Status: *Pending*\n📅 Expected Delivery: ${report.expected_delivery_date || 'To be determined'}\n\nWe will notify you as soon as it becomes available.`;
      break;
    case 'processing':
      statusMsg = `Your *${report.test_name}* report is currently being processed.\n\n📋 Status: *Processing*\n📅 Expected Completion: ${report.expected_delivery_date || 'To be determined'}\n\nThank you for your patience.`;
      break;
    case 'ready':
      statusMsg = `Great news! Your *${report.test_name}* report is now *Ready*!\n\n🏥 Department: ${report.department || 'General'}\n👨‍⚕️ Doctor: Dr. ${docName}\n\n${report.report_pdf_url ? 'Your report PDF is being sent now.' : 'Please visit the hospital reception to collect your report.'}`;
      if (report.report_pdf_url) {
        engineSendDocument({
          accountId,
          userId,
          conversationId,
          contactId,
          documentUrl: report.report_pdf_url,
          filename: `${report.test_name.replace(/\s+/g, '_')}_Report.pdf`,
          caption: `${report.test_name} Report`,
        }).catch((e) => console.error('[Report Button] PDF send error:', e));
      }
      break;
    case 'delivered':
      statusMsg = `Your *${report.test_name}* report has already been delivered.\n\nIf you need another copy, please contact the hospital reception.`;
      break;
    default:
      statusMsg = `Your *${report.test_name}* report status is: ${report.status}.`;
  }

  await engineSendText({
    accountId,
    userId,
    conversationId,
    contactId,
    text: statusMsg,
  });
  return true;
}

export async function processMessage(
  message: WhatsAppMessage,
  contact: { profile?: { name?: string }; wa_id?: string },
  accountId: string,
  configOwnerUserId: string,
  accessToken: string,
  correlationId?: string
) {
  const senderPhone = normalizePhone(message.from);
  const contactName =
    contact?.profile?.name ||
    contact?.wa_id ||
    senderPhone ||
    'Unknown Contact';

  // Find or create contact
  const contactOutcome = await findOrCreateContact(
    accountId,
    configOwnerUserId,
    senderPhone,
    contactName
  );
  if (!contactOutcome) {
    throw new Error(
      `Unable to resolve contact for inbound message ${message.id}`
    );
  }
  const contactRecord = contactOutcome.contact;

  // Find or create conversation
  const conversation = await findOrCreateConversation(
    accountId,
    configOwnerUserId,
    contactRecord.id,
    'whatsapp'
  );
  if (!conversation) {
    throw new Error(
      `Unable to resolve conversation for inbound message ${message.id}`
    );
  }
  const convId = String(conversation.id);

  // Reactions short-circuit
  if (message.type === 'reaction') {
    await handleReaction(message, convId, contactRecord.id, accountId);
    return;
  }

  // Parse message content
  const { contentText, mediaUrl, mediaType, interactiveReplyId } =
    await parseMessageContent(message, accessToken);
  void mediaType;

  // Resolve reply context if present
  let replyToInternalId: string | null = null;
  if (message.context?.id) {
    replyToInternalId = await lookupInternalIdByMetaId(
      message.context.id,
      convId,
      accountId
    );
    if (!replyToInternalId) {
      console.warn(
        '[webhook] reply context parent not found:',
        message.context.id
      );
    }
  }

  const ALLOWED_CONTENT_TYPES = new Set([
    'text',
    'image',
    'document',
    'audio',
    'video',
    'location',
    'template',
    'interactive',
  ]);
  type MessageContentType =
    Database['public']['Tables']['messages']['Row']['content_type'];
  const contentType: MessageContentType = ALLOWED_CONTENT_TYPES.has(
    message.type
  )
    ? (message.type as MessageContentType)
    : message.type === 'sticker'
      ? 'image'
      : 'text';

  // Deduplication check: ignore duplicate webhook deliveries for the same
  // Meta message ID. This read-then-write check is a fast path only — two
  // concurrent redeliveries can both pass it, so the authoritative guard is
  // the unique index on messages.message_id, whose violation is handled as
  // an idempotent success below.
  let existingMsg:
    | {
        id: string;
        content_text?: string | null;
        created_at?: string | null;
        conversation_id?: string | null;
      }[]
    | null = null;
  try {
    const db = getAdminClient();
    for (const key of ['message_id', 'provider_message_id']) {
      const res = await db
        .from('messages')
        .select('id, content_text, created_at, conversation_id')
        .eq(key, message.id)
        .eq('account_id', accountId)
        .eq('conversation_id', convId)
        .limit(1);
      if (!res.error && res.data?.length) {
        existingMsg = res.data as {
          id: string;
          content_text?: string | null;
          created_at?: string | null;
          conversation_id?: string | null;
        }[];
        break;
      }
    }
  } catch {
    existingMsg = null;
  }

  if (existingMsg && existingMsg.length > 0) {
    logger.info('Duplicate inbound message ignored', {
      correlationId,
      component: 'inbound-message',
      accountId,
      conversationId: convId,
      messageId: message.id,
    });

    // A prior attempt may have inserted the message and then crashed before
    // updating the conversation rollup. Repair only rows with a real payload
    // (legacy tests/rows that only contain an id are already opaque and should
    // not be allowed to inflate unread_count).
    const existing = existingMsg[0];
    if (existing.content_text || existing.created_at) {
      const existingDate = existing.created_at
        ? new Date(existing.created_at)
        : providerMessageDate(message.timestamp);
      await applyConversationRollup({
        convId,
        previewText:
          existing.content_text || contentText || `[${message.type}]`,
        messageDate: existingDate,
        conversation,
        accountId,
        messageId: message.id,
        correlationId,
      });
    }
    return;
  }

  let priorCustomerMsgCount = 0;
  try {
    const res = await getAdminClient()
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', convId)
      .eq('account_id', accountId);
    priorCustomerMsgCount = res.count ?? 0;
  } catch {
    priorCustomerMsgCount = 0;
  }
  const isFirstInboundMessage = priorCustomerMsgCount === 0;

  const messageDate = providerMessageDate(message.timestamp);
  const nowIso = messageDate.toISOString();
  const writtenAtIso = new Date().toISOString();
  const previewText = contentText || `[${message.type}]`;
  let msgError: unknown = null;
  let msgInserted = false;
  let alreadyPersisted = false;

  // Attempt 1: Canonical schema. `account_id`, `direction` and
  // `provider_message_id` are what the outbound path in
  // /api/whatsapp/send writes; omitting them on inbound rows was leaving
  // inbound messages outside the tenant scoping and outside the
  // `messages_provider_message_unique` duplicate guard.
  const insertRes = await getAdminClient()
    .from('messages')
    .insert({
      account_id: accountId,
      conversation_id: convId,
      direction: 'inbound',
      sender_type: 'customer',
      content_type: contentType,
      content_text: contentText || null,
      media_url: mediaUrl || null,
      message_id: message.id,
      provider_message_id: message.id,
      status: 'delivered',
      reply_to_message_id: replyToInternalId || null,
      interactive_reply_id: interactiveReplyId || null,
      created_at: nowIso,
      updated_at: writtenAtIso,
    });

  if (!insertRes.error) {
    msgInserted = true;
  } else if (isUniqueViolation(insertRes.error)) {
    // A concurrent redelivery won the race. The message is in the inbox
    // exactly once, which is the desired outcome — treat as success and stop
    // so we do not double-count the unread badge or re-run automations.
    alreadyPersisted = true;
  } else {
    // Attempt 2: Canonical column names minus the newer columns, for a
    // database that has not yet applied the tenant-cutover migration.
    const reducedRes = await getAdminClient()
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_type: 'customer',
        content_type: contentType,
        content_text: contentText || null,
        media_url: mediaUrl || null,
        message_id: message.id,
        status: 'delivered',
        reply_to_message_id: replyToInternalId || null,
        interactive_reply_id: interactiveReplyId || null,
        created_at: nowIso,
      });

    if (!reducedRes.error) {
      msgInserted = true;
    } else if (isUniqueViolation(reducedRes.error)) {
      alreadyPersisted = true;
    } else {
      // Attempt 3: Legacy schema fallback (Appwrite or alternate naming)
      const legacyRes = await getAdminClient()
        .from('messages')
        .insert({
          conversationId: convId,
          senderType: 'customer',
          contentType: contentType,
          contentText: contentText || null,
          mediaUrl: mediaUrl || null,
          messageId: message.id,
          status: 'delivered',
          replyToMessageId: replyToInternalId || null,
          interactiveReplyId: interactiveReplyId || null,
          createdAt: nowIso,
        });

      if (!legacyRes.error) {
        msgInserted = true;
      } else if (isUniqueViolation(legacyRes.error)) {
        alreadyPersisted = true;
      } else {
        msgError = legacyRes.error || reducedRes.error || insertRes.error;
      }
    }
  }

  if (alreadyPersisted) {
    // A unique violation can race the initial read. Re-read the winning row
    // before attempting repair; opaque legacy rows are deliberately ignored
    // so a retry cannot manufacture an unread increment.
    if (!existingMsg || existingMsg.length === 0) {
      const persisted = await findPersistedInboundMessage({
        messageId: message.id,
        conversationId: convId,
        accountId,
      });
      if (persisted) existingMsg = [persisted];
    }

    logger.info('Inbound message already persisted by a concurrent delivery', {
      correlationId,
      component: 'inbound-message',
      accountId,
      conversationId: convId,
      messageId: message.id,
    });
    // A concurrent delivery may have won the insert race and then failed
    // before its conversation rollup. The marker-aware RPC repairs that case
    // without incrementing unread twice when the rollup already happened.
    const persisted = existingMsg?.[0];
    if (persisted?.content_text || persisted?.created_at) {
      await applyConversationRollup({
        convId,
        previewText: persisted.content_text || previewText,
        messageDate: persisted.created_at
          ? (() => {
              const date = new Date(persisted.created_at as string);
              return Number.isNaN(date.getTime()) ? messageDate : date;
            })()
          : messageDate,
        conversation,
        accountId,
        messageId: message.id,
        correlationId,
      });
    }
    return;
  }

  if (!msgInserted || msgError) {
    logger.error('Failed to persist inbound message', {
      correlationId,
      component: 'inbound-message',
      accountId,
      conversationId: convId,
      messageId: message.id,
      messageType: message.type,
      code:
        msgError && typeof msgError === 'object'
          ? (msgError as { code?: string }).code
          : undefined,
      reason:
        msgError && typeof msgError === 'object'
          ? (msgError as { message?: string }).message
          : undefined,
    });
    safeRecordOutcomeEvent({
      accountId,
      eventName: 'webhook_failed',
      sourceId: `webhook-fail:${accountId}:${message.id}`,
      attributes: { reason: 'inbound_persist_failed' },
    });
    throw new Error(`Unable to persist inbound message ${message.id}`);
  }

  safeRecordOutcomeEvent({
    accountId,
    eventName: 'inbound_message_received',
    sourceId: `inbound:${accountId}:${message.id}`,
    attributes: { channel: 'whatsapp', conversation_id: convId },
  });

  logger.info('Inbound message persisted', {
    correlationId,
    component: 'inbound-message',
    accountId,
    conversationId: convId,
    contactId: contactRecord.id,
    messageId: message.id,
    messageType: message.type,
    contentType,
  });

  // Roll the conversation forward: preview, timestamp, unread badge, and
  // reopen if it had been closed. Done in a single atomic statement so two
  // simultaneous replies cannot lose an unread increment.
  await applyConversationRollup({
    convId,
    previewText,
    messageDate,
    conversation,
    accountId,
    messageId: message.id,
    correlationId,
  });

  const isButtonClicked =
    message.type === 'button' || message.type === 'interactive';
  await flagBroadcastReplyIfAny(accountId, contactRecord.id, isButtonClicked);

  const inboundLeadContext = {
    accountId,
    userId: configOwnerUserId,
    conversationId: convId,
    contactId: contactRecord.id,
    messageId: message.id,
    messageText: contentText ?? message.text?.body ?? '',
    contactName: contactRecord.name ?? null,
    contactPhone: contactRecord.phone ?? null,
    assignedAgentId:
      (conversation.assigned_agent_id as string | null) ||
      (conversation.assignedAgentId as string | null) ||
      null,
    conversationStatus: (conversation.status as string | null) ?? null,
    aiDisabled:
      conversation.ai_chat_enabled === false ||
      conversation.ai_autoreply_disabled === true ||
      conversation.is_ai_enabled === false,
    correlationId,
  };

  try {
    await handleCustomerReply(inboundLeadContext);
  } catch (err) {
    logger.error('Lead follow-up reply guard failed', {
      correlationId,
      component: 'lead-detection',
      accountId,
      conversationId: convId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Smart Interceptions (Reminders & Reports)
  try {
    let reminderHandled = false;

    if (
      interactiveReplyId &&
      (interactiveReplyId.startsWith('rem_confirm_') ||
        interactiveReplyId.startsWith('rem_resched_') ||
        interactiveReplyId.startsWith('rem_cancel_'))
    ) {
      const parts = interactiveReplyId.split('_');
      const action = parts[1];
      const apptId = parts[2];

      reminderHandled = await handleReminderReplyAction(
        accountId,
        apptId,
        action,
        convId,
        contactRecord.id,
        configOwnerUserId
      );
    } else {
      const cleanedText = (contentText || '').trim().toLowerCase();

      const { data: reminderAppt } = await getAdminClient()
        .from('appointments')
        .select('id, status')
        .eq('account_id', accountId)
        .eq('patient_id', contactRecord.id)
        .eq('status', 'Reminder Sent')
        .order('appointment_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reminderAppt) {
        let matchedAction: 'confirm' | 'resched' | 'cancel' | null = null;
        const isConfirm = [
          '1',
          'confirm',
          'yes',
          'coming',
          "i'll be there",
          'ill be there',
        ].includes(cleanedText);
        const isResched = [
          '2',
          'reschedule',
          'change time',
          'another date',
          'change date',
          'resched',
        ].includes(cleanedText);
        const isCancel = [
          '3',
          'cancel',
          "i can't come",
          'cant come',
          'cannot come',
        ].includes(cleanedText);

        if (isConfirm) matchedAction = 'confirm';
        else if (isResched) matchedAction = 'resched';
        else if (isCancel) matchedAction = 'cancel';

        if (matchedAction) {
          reminderHandled = await handleReminderReplyAction(
            accountId,
            reminderAppt.id,
            matchedAction,
            convId,
            contactRecord.id,
            configOwnerUserId
          );
        }
      }
    }

    if (reminderHandled) return;

    // Report Status button replies
    let reportHandled = false;
    if (
      interactiveReplyId &&
      (interactiveReplyId.startsWith('report_download_') ||
        interactiveReplyId.startsWith('report_status_'))
    ) {
      const reportId = interactiveReplyId.replace(
        /^report_(download|status)_/,
        ''
      );
      reportHandled = await handleReportButtonReply(
        accountId,
        reportId,
        interactiveReplyId.startsWith('report_download_')
          ? 'download'
          : 'status',
        convId,
        contactRecord.id,
        configOwnerUserId
      );
    }

    if (reportHandled) return;

    const travelHandled = await handleTravelBookingInbound({
      accountId,
      userId: configOwnerUserId,
      contactId: contactRecord.id,
      conversationId: convId,
      interactiveReplyId,
      inboundText: contentText ?? message.text?.body ?? '',
    });
    if (travelHandled) return;
  } catch (err) {
    console.error(
      '[Webhook Interception] Failed to process action safely:',
      err
    );
  }

  // Flow runner, Automations, AI
  try {
    const flowResult = await dispatchInboundToFlows({
      accountId,
      userId: configOwnerUserId,
      contactId: contactRecord.id,
      conversationId: convId,
      message: interactiveReplyId
        ? {
            kind: 'interactive_reply',
            reply_id: interactiveReplyId,
            reply_title: contentText ?? '',
            meta_message_id: message.id,
          }
        : {
            kind: 'text',
            text: contentText ?? message.text?.body ?? '',
            meta_message_id: message.id,
          },
      isFirstInboundMessage,
    });
    const flowConsumed = flowResult.consumed;

    const inboundText = contentText ?? message.text?.body ?? '';
    const automationTriggers: (
      | 'new_contact_created'
      | 'first_inbound_message'
      | 'new_message_received'
      | 'keyword_match'
    )[] = [];

    if (!flowConsumed) {
      automationTriggers.push('new_message_received', 'keyword_match');
    }
    if (contactOutcome.wasCreated)
      automationTriggers.unshift('new_contact_created');
    if (isFirstInboundMessage)
      automationTriggers.unshift('first_inbound_message');

    let automationDetected = false;
    let automationReplied = false;

    for (const triggerType of automationTriggers) {
      try {
        const autoRes = await runAutomationsForTrigger({
          accountId,
          triggerType,
          contactId: contactRecord.id,
          context: {
            message_text: inboundText,
            conversation_id: convId,
          },
        });
        if (autoRes?.executedCount > 0) {
          automationDetected = true;
        }
        if (autoRes?.replied) {
          automationReplied = true;
        }
      } catch (err) {
        console.error('[automations] dispatch failed:', err);
      }
    }

    const assignedAgent = Boolean(
      conversation.assigned_agent_id || conversation.assignedAgentId
    );
    const aiDisabledOnConv =
      conversation.ai_chat_enabled === false ||
      conversation.ai_autoreply_disabled === true ||
      conversation.is_ai_enabled === false;

    const shouldTriggerAiBase =
      !flowConsumed &&
      !automationReplied &&
      !assignedAgent &&
      !aiDisabledOnConv;

    // Respect the account-level chatbot master switch. triggerAiResponse also
    // enforces this (chokepoint), so we only query here when AI would
    // otherwise fire — avoiding an extra read on every inbound message.
    let chatbotMasterEnabled = true;
    if (shouldTriggerAiBase) {
      try {
        chatbotMasterEnabled = (await getAccountChatbotSettings(accountId))
          .enabled;
      } catch {
        // On read failure, default to enabled — triggerAiResponse re-checks.
        chatbotMasterEnabled = true;
      }
    }

    const shouldTriggerAi = shouldTriggerAiBase && chatbotMasterEnabled;

    console.log(
      `[AI AUTO REPLY] accountId=${accountId} conversationId=${convId} autoReplyEnabled=${!aiDisabledOnConv} chatbotMasterEnabled=${chatbotMasterEnabled} automationDetected=${automationDetected} automationActuallyReplied=${automationReplied} flowConsumed=${flowConsumed} assignedAgent=${assignedAgent} aiDisabled=${aiDisabledOnConv} decision=${shouldTriggerAi ? 'GENERATE_AI_REPLY' : 'SKIP_AI_REPLY'}`
    );

    if (shouldTriggerAi) {
      try {
        let inboundMessageId: string | undefined;
        try {
          const persistedInbound = await findPersistedInboundMessage({
            messageId: message.id,
            conversationId: convId,
            accountId,
          });
          inboundMessageId = persistedInbound?.id;
        } catch {
          inboundMessageId = undefined;
        }
        await triggerAiResponse({
          accountId,
          userId: configOwnerUserId,
          conversationId: convId,
          contactId: contactRecord.id,
          inboundMessageId,
        });
      } catch (err) {
        console.error('[AI Assistant] trigger error:', err);
        safeRecordOutcomeEvent({
          accountId,
          eventName: 'ai_failed',
          sourceId: `ai-fail:${accountId}:${convId}:${message.id || 'unknown'}`,
          attributes: { reason: 'trigger_error' },
        });
      }
    } else {
      try {
        await processInboundLeadDetection(inboundLeadContext, {
          aiAlreadySynced: false,
        });
      } catch (err) {
        console.error('[lead-layer] inbound detection failed:', err);
      }
    }
  } catch (backgroundErr) {
    console.error('[Webhook Background execution] error:', backgroundErr);
  }
}
