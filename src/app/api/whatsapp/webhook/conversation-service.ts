import { getAdminClient } from '@/lib/supabase/server';

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === '23505' ||
    candidate.message?.toLowerCase().includes('duplicate key') === true
  );
}

function isSchemaCompatibilityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    code?: string;
    message?: string;
    details?: string;
  };
  const code = String(candidate.code || '').toUpperCase();
  if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code)) return true;
  const text =
    `${candidate.message || ''} ${candidate.details || ''}`.toLowerCase();
  return (
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('could not find the table')
  );
}

/**
 * Finds an existing conversation or creates one for the account and contact.
 */
export async function findOrCreateConversation(
  accountId: string,
  configOwnerUserId: string,
  contactId: string,
  channel: 'whatsapp' | 'sms' = 'whatsapp'
) {
  const db = getAdminClient();
  let legacyShape = false;
  let camelCaseShape = false;

  const findExisting = async (): Promise<Record<string, unknown> | null> => {
    if (camelCaseShape) {
      const camelCase = await db
        .from('conversations')
        .select('*')
        .eq('accountId', accountId)
        .eq('contactId', contactId)
        .limit(1);
      if (camelCase.error && !isSchemaCompatibilityError(camelCase.error)) {
        throw new Error(
          `Legacy conversation lookup failed: ${String(
            (camelCase.error as { message?: string }).message || camelCase.error
          )}`
        );
      }
      return (
        (camelCase.data?.[0] as Record<string, unknown> | undefined) ?? null
      );
    }

    const canonical = await db
      .from('conversations')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .eq('channel', channel)
      .limit(1);

    if (!canonical.error) {
      return (
        (canonical.data?.[0] as Record<string, unknown> | undefined) ?? null
      );
    }
    if (!isSchemaCompatibilityError(canonical.error)) {
      throw new Error(
        `Conversation lookup failed: ${String(
          (canonical.error as { message?: string }).message || canonical.error
        )}`
      );
    }

    legacyShape = true;
    const legacy = await db
      .from('conversations')
      .select('*')
      .eq('account_id', accountId)
      .eq('contact_id', contactId)
      .limit(1);
    if (legacy.error) {
      if (isSchemaCompatibilityError(legacy.error)) {
        // The account/contact columns themselves are camelCase on a small
        // set of pre-cutover schemas. Let the outer compatibility branch
        // retry with those exact column names.
        throw new Error(
          'Legacy conversation schema cache uses camelCase columns'
        );
      }
      throw new Error(
        `Legacy conversation lookup failed: ${String(
          (legacy.error as { message?: string }).message || legacy.error
        )}`
      );
    }
    return (legacy.data?.[0] as Record<string, unknown> | undefined) ?? null;
  };

  let existing: Record<string, unknown> | null = null;
  try {
    existing = await findExisting();
  } catch (canonicalError) {
    // A small number of pre-cutover deployments expose camelCase columns.
    // Only use that compatibility path when the canonical query itself is a
    // schema error; operational failures must remain retryable.
    if (!isSchemaCompatibilityError(canonicalError)) throw canonicalError;
    legacyShape = true;
    camelCaseShape = true;
    const legacy = await db
      .from('conversations')
      .select('*')
      .eq('accountId', accountId)
      .eq('contactId', contactId)
      .limit(1);
    if (legacy.error && !isSchemaCompatibilityError(legacy.error)) {
      throw new Error(
        `Legacy conversation lookup failed: ${String(
          (legacy.error as { message?: string }).message || legacy.error
        )}`
      );
    }
    existing =
      (legacy.data?.[0] as Record<string, unknown> | undefined) ?? null;
  }

  if (existing) return existing;

  const now = new Date().toISOString();
  const canonicalPayload = {
    account_id: accountId,
    user_id: configOwnerUserId || null,
    contact_id: contactId,
    channel,
    status: 'open',
    ai_chat_enabled: true,
    unread_count: 0,
    last_message_text: '',
    last_message_at: now,
    created_at: now,
    updated_at: now,
  };
  const legacyPayload = {
    account_id: accountId,
    user_id: configOwnerUserId || null,
    contact_id: contactId,
    status: 'open',
    ai_chat_enabled: true,
    unread_count: 0,
    last_message_text: '',
    last_message_at: now,
    created_at: now,
    updated_at: now,
  };
  const camelCasePayload = {
    accountId,
    userId: configOwnerUserId || null,
    contactId,
    status: 'open',
    aiChatEnabled: true,
    unreadCount: 0,
    lastMessageText: '',
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const inserted = camelCaseShape
    ? await db
        .from('conversations')
        // The generated Supabase type describes the canonical snake_case
        // schema. This branch is only reached for pre-cutover camelCase
        // deployments, so keep the compatibility payload out of that type's
        // excess-property check.
        .insert(camelCasePayload as never)
        .select()
        .single()
    : await db
        .from('conversations')
        .insert(legacyShape ? legacyPayload : canonicalPayload)
        .select()
        .single();

  if (!inserted.error && inserted.data) return inserted.data;

  if (isUniqueViolation(inserted.error)) {
    // Another webhook created the channel-specific row between our lookup
    // and insert. Re-query before reporting failure.
    const raced = await findExisting();
    if (raced) return raced;
    throw new Error(
      'Conversation creation raced but the row could not be re-read'
    );
  }

  if (!legacyShape && isSchemaCompatibilityError(inserted.error)) {
    const fallback = await db
      .from('conversations')
      .insert(legacyPayload)
      .select()
      .single();
    if (!fallback.error && fallback.data) return fallback.data;
    if (isUniqueViolation(fallback.error)) {
      const raced = await findExisting();
      if (raced) return raced;
    }
    throw new Error(
      `Legacy conversation creation failed: ${String(
        (fallback.error as { message?: string })?.message || fallback.error
      )}`
    );
  }

  throw new Error(
    `Conversation creation failed: ${String(
      (inserted.error as { message?: string })?.message || inserted.error
    )}`
  );
}

/**
 * Resolve a Meta-side message_id into matching internal UUID.
 * Tenant + conversation scope is required: provider IDs are not globally unique.
 */
export async function lookupInternalIdByMetaId(
  metaId: string,
  conversationId: string,
  accountId: string
): Promise<string | null> {
  if (!metaId || !conversationId || !accountId) return null;
  const db = getAdminClient();
  for (const idCol of ['message_id', 'provider_message_id']) {
    try {
      const { data, error } = await db
        .from('messages')
        .select('id')
        .eq(idCol, metaId)
        .eq('conversation_id', conversationId)
        .eq('account_id', accountId)
        .maybeSingle();
      if (!error && data?.id) return data.id;
    } catch {
      // Column may not exist on this schema; try the next identifier.
    }
  }
  return null;
}

/**
 * If an inbound message's sender is on a still-unreplied broadcast_recipients row,
 * flip it to replied so the count advances.
 */
export async function flagBroadcastReplyIfAny(
  accountId: string,
  contactId: string,
  isButtonClicked = false
) {
  try {
    const { data: recs, error } = await getAdminClient()
      .from('broadcast_recipients')
      .select('id, status, broadcast_id, broadcasts!inner(account_id)')
      .eq('contact_id', contactId)
      .eq('broadcasts.account_id', accountId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !recs || recs.length === 0) return;

    const row = recs[0];
    const updatePayload: Record<string, unknown> = {
      status: 'replied',
      replied_at: new Date().toISOString(),
    };

    if (isButtonClicked) {
      updatePayload.button_clicked = true;
      updatePayload.clicked_at = new Date().toISOString();
    }

    const { error: updErr } = await getAdminClient()
      .from('broadcast_recipients')
      .update(updatePayload)
      .eq('id', row.id);

    if (updErr) {
      console.error('Error marking broadcast recipient replied:', updErr);
    }
  } catch (err) {
    console.error('flagBroadcastReplyIfAny failed:', err);
  }
}
