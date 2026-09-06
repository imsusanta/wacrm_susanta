'use client';

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createClient } from '@/lib/db/client';
import { useAuth } from '@/hooks/use-auth';
import {
  parseWhatsAppSenderPreview,
  whatsappChatKind,
  formatWhatsAppDisplayPhone,
  whatsappChatKindLabel,
  whatsappContactDisplayName,
} from '@/core/whatsapp/group-identity';
import { WhatsAppChatAvatar } from '@/components/inbox/whatsapp-chat-avatar';
import { cn } from '@/lib/utils';
import type {
  Conversation,
  Message,
  MessageReaction,
  Contact,
  ConversationStatus,
  MessageTemplate,
  Profile,
} from '@/types';
import {
  MessageSquare,
  ChevronDown,
  UserPlus,
  Check,
  Clock,
  ArrowLeft,
  RefreshCw,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  SquarePen,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MessageBubble } from './message-bubble';
import { MessageActions } from './message-actions';
import {
  MessageComposer,
  CHAT_MEDIA_BUCKET,
  type InsertedComposerReply,
  type SendMediaPayload,
} from './message-composer';
import { deleteAccountMedia } from '@/lib/storage/upload-media';
import { TemplatePicker } from './template-picker';
import { buildReplyPreview } from './reply-quote';
import { toast } from 'sonner';
import { mergeMessages } from '@/lib/inbox/merge';
import { conversationMessagesCache } from '@/lib/inbox/client-cache';

let cachedMembersList: Profile[] | null = null;

interface ReplyDraft {
  id: string;
  authorLabel: string;
  preview: string;
}

function applyPersistedSend(
  onUpdateMessage: (id: string, updates: Partial<Message>) => void,
  tempId: string,
  payload: {
    id?: unknown;
    message_id?: unknown;
    status?: unknown;
    persist_error?: unknown;
  }
) {
  if (payload.status === 'sent_meta_reconciliation_pending') {
    const detail =
      typeof payload.persist_error === 'string' && payload.persist_error
        ? payload.persist_error
        : 'the inbox could not save the message';
    toast.error(`WhatsApp delivered, but ${detail}`);
  }
  const localId =
    typeof payload.id === 'string' && payload.id ? payload.id : null;
  const providerId =
    typeof payload.message_id === 'string' ? payload.message_id : undefined;
  onUpdateMessage(tempId, {
    status: 'sent',
    ...(localId ? { id: localId } : {}),
    ...(providerId ? { message_id: providerId } : {}),
  });
}

function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, raw) => {
    const idx = Number(raw) - 1;
    return params[idx] ?? `{{${raw}}}`;
  });
}

interface MessageThreadProps {
  conversation: Conversation | null;
  contact: Contact | null;
  messages: Message[];
  onMessagesLoaded: (messages: Message[]) => void;
  onNewMessage: (message: Message) => void;
  onUpdateMessage: (id: string, updates: Partial<Message>) => void;
  onStatusChange: (conversationId: string, status: ConversationStatus) => void;
  onAssignChange: (
    conversationId: string,
    assignedAgentId: string | null
  ) => void;
  onConversationUpdate?: (
    conversationId: string,
    updates: Partial<Conversation>
  ) => void;
  /**
   * On mobile, the thread is shown full-screen with the conversation list
   * hidden. This callback lets the page deselect the active conversation
   * and reveal the list again. Rendered as a back-arrow in the header on
   * mobile only.
   */
  onBack?: () => void;
  /**
   * Increment to force the messages + reactions fetch effects to refire.
   * Parent bumps this on realtime reconnect / tab visibility → visible
   * so the open thread catches up on any events sent while the WS was
   * disconnected or the tab was throttled. Optional so existing callers
   * keep working.
   */
  resyncToken?: number;
  /**
   * Fired by the manual-refresh button in the thread header. The parent
   * typically bumps the same `resyncToken` it controls — this gives the
   * user a way to force a refetch when they suspect realtime missed an
   * event (or they're impatient). Optional so existing callers keep
   * working; the button is only rendered when this is provided.
   */
  onRefresh?: () => void;
  /**
   * Desktop-only contact-panel toggle. The page owns the open/closed
   * state (it's the one that renders the sidebar), so the thread just
   * reflects it and asks the page to flip it. Both optional so existing
   * callers keep working; the toggle button only renders when
   * `onToggleContactPanel` is wired up.
   */
  contactPanelOpen?: boolean;
  onToggleContactPanel?: () => void;
  insertedReply?: InsertedComposerReply | null;
  onStartConversation?: () => void;
}

function formatDateSeparator(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Today';
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  } catch {
    return 'Today';
  }
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    let day = 'Today';
    try {
      const d = new Date(msg.created_at);
      day = isNaN(d.getTime()) ? 'Today' : format(d, 'yyyy-MM-dd');
    } catch {
      day = 'Today';
    }

    if (day !== currentDate) {
      currentDate = day;
      groups.push({ date: msg.created_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
}

const STATUS_OPTIONS: {
  label: string;
  value: ConversationStatus;
  color: string;
}[] = [
  { label: 'Open', value: 'open', color: 'text-primary' },
  { label: 'Pending', value: 'pending', color: 'text-amber-400' },
  { label: 'Closed', value: 'closed', color: 'text-muted-foreground' },
];

/**
 * WhatsApp-style doodle background applied to the chat area (both the
 * active thread and the empty state). The SVG tile lives at
 * `/public/inbox-doodle.svg`; the slate-950 colour sits underneath so
 * the doodles read as a subtle pattern rather than a stark grid.
 *
 * Defined once at module scope so the two render paths can't drift —
 * if we ever switch the asset, both spots update together.
 */
const DOODLE_BG_CLASSES =
  "bg-background bg-[url('/inbox-doodle.svg')] bg-repeat";

export function MessageThread({
  conversation,
  contact,
  messages,
  onMessagesLoaded,
  onNewMessage,
  onUpdateMessage,
  onStatusChange,
  onAssignChange,
  onConversationUpdate,
  onBack,
  resyncToken = 0,
  onRefresh,
  contactPanelOpen,
  onToggleContactPanel,
  insertedReply,
  onStartConversation,
}: MessageThreadProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reactions, setReactions] = useState<MessageReaction[]>([]);
  const [reactionsAvailable, setReactionsAvailable] = useState(true);
  // Purely visual spin state for the manual-refresh button. The actual
  // refetch is fire-and-forget through `onRefresh` (which bumps the
  // parent's resyncToken); the 700ms spin is just feedback so the click
  // doesn't feel like a no-op. Cleared via the timer ref on unmount.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);
  const handleRefreshClick = useCallback(() => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    onRefresh();
    refreshTimerRef.current = setTimeout(() => {
      setIsRefreshing(false);
      refreshTimerRef.current = null;
    }, 700);
  }, [isRefreshing, onRefresh]);
  const [replyTo, setReplyTo] = useState<ReplyDraft | null>(null);
  const [aiToggleDialogOpen, setAiToggleDialogOpen] = useState(false);

  // Cached members across conversation switches
  useEffect(() => {
    if (cachedMembersList !== null) {
      setProfiles(cachedMembersList);
      return;
    }
    let cancelled = false;
    fetch('/api/account/members', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((json) => {
        if (cancelled) return;
        const members = json.members || [];
        const profs = members.map(
          (m: {
            user_id?: string;
            full_name?: string;
            email?: string;
            avatar_url?: string;
            role?: string;
            joined_at?: string;
          }) => ({
            id: m.user_id,
            user_id: m.user_id,
            full_name: m.full_name,
            email: m.email,
            avatar_url: m.avatar_url,
            role: m.role,
            created_at: m.joined_at,
          })
        );
        cachedMembersList = profs as Profile[];
        setProfiles(profs as Profile[]);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to fetch members:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 24-hour session timer (disabled per request to never expire)
  const sessionInfo = useMemo(() => {
    return { expired: false, remaining: '' };
  }, []);

  // Store latest callback and messages in refs so fetchMessages doesn't need to
  // depend on `onMessagesLoaded` or trigger redundant re-render loops on poll.
  const onMessagesLoadedRef = useRef(onMessagesLoaded);
  const messagesRef = useRef(messages);
  useEffect(() => {
    onMessagesLoadedRef.current = onMessagesLoaded;
    messagesRef.current = messages;
  });

  const conversationId = conversation?.id;
  const hasUnread = (conversation?.unread_count ?? 0) > 0;

  // Fetch messages whenever the selected conversation changes. Kept
  // separate from the unread-reset effect so that incoming messages
  // arriving while the thread is open don't trigger a full refetch —
  // they only flip hasUnread, which only the reset effect listens to.
  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    // Check if we have cached messages for this conversation for 0ms instant display
    const cachedForConv = conversationMessagesCache.get(conversationId);
    if (cachedForConv && cachedForConv.length > 0) {
      onMessagesLoadedRef.current(cachedForConv);
      setLoading(false);
    } else {
      const existingInProps = messagesRef.current.filter(
        (m) => m.conversation_id === conversationId
      );
      if (existingInProps.length > 0) {
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    const areMessagesEqual = (a: Message[], b: Message[]): boolean => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (
          a[i].id !== b[i].id ||
          a[i].status !== b[i].status ||
          a[i].content_text !== b[i].content_text
        ) {
          return false;
        }
      }
      return true;
    };

    const fetchMsgs = async (isBackground = false) => {
      if (!isBackground && !conversationMessagesCache.has(conversationId)) {
        setLoading(true);
      }

      try {
        const res = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(conversationId)}/messages`,
          {
            credentials: 'include',
            cache: 'no-store',
          }
        );

        if (cancelled) return;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (!isBackground) {
            console.error(
              'Failed to fetch messages:',
              errData.error || `HTTP ${res.status}`
            );
          }
        } else {
          const json = await res.json();
          const msgs = (
            Array.isArray(json) ? json : (json.messages ?? [])
          ) as Message[];

          // The API response is a point-in-time snapshot. A realtime INSERT
          // or an optimistic outbound row can exist locally but be absent
          // from that snapshot, so replacing the array would make the bubble
          // disappear. Merge only rows for this conversation; the parent also
          // merges defensively when it receives the callback.
          const currentForConversation = messagesRef.current.filter(
            (message) => message.conversation_id === conversationId
          );
          const mergedMsgs = mergeMessages(currentForConversation, msgs);
          conversationMessagesCache.set(conversationId, mergedMsgs);

          if (
            isBackground &&
            areMessagesEqual(mergedMsgs, currentForConversation)
          ) {
            // Unchanged message list: skip setState to prevent scroll jumping and re-render lag
            return;
          }

          onMessagesLoadedRef.current(mergedMsgs);
        }
      } catch (err) {
        if (!cancelled && !isBackground) {
          console.error('Failed to fetch messages:', err);
        }
      } finally {
        if (!cancelled && !isBackground) setLoading(false);
      }
    };

    void fetchMsgs(Boolean(cachedForConv && cachedForConv.length > 0));

    // Periodic safety-net poll every 60 seconds for active thread (Realtime handles live messages)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchMsgs(true);
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // `resyncToken` is included so the parent can force a refetch when
    // the realtime channel reconnects or the tab regains focus —
    // realtime is best-effort and any message events sent while the WS
    // was disconnected or throttled are otherwise lost.
  }, [conversationId, resyncToken]);

  // Reactions fetch — pulls the current state from the DB. Kept separate
  // from the channel subscription below so a `resyncToken` bump just
  // refetches the rows without also tearing down and rebuilding the
  // realtime channel.
  useEffect(() => {
    if (!conversationId) {
      setReactions([]);
      return;
    }
    const appwrite = createClient();
    let cancelled = false;

    (async () => {
      const { data, error } = await appwrite
        .from('message_reactions')
        .select('*')
        .eq('conversation_id', conversationId);
      if (cancelled) return;
      if (error) {
        const missingTable =
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('message_reactions');
        if (missingTable) {
          setReactions([]);
          setReactionsAvailable(false);
          return;
        }
        console.error('Failed to fetch reactions:', error);
        return;
      }
      setReactionsAvailable(true);
      setReactions((data as MessageReaction[]) ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, resyncToken]);

  // Reactions realtime subscription per conversation. Subscribing here
  // (not at the page level) keeps the channel scoped to the visible
  // conversation and avoids cross-conversation chatter on a busy inbox.
  useEffect(() => {
    if (!conversationId) return;
    try {
      const appwrite = createClient();
      if (!appwrite || typeof appwrite.channel !== 'function') return;

      const channel = appwrite.channel(`reactions:${conversationId}`);
      if (!channel || typeof channel.on !== 'function') return;

      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_reactions',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: { new: object }) => {
            const row = payload.new as unknown as MessageReaction;
            setReactions((prev) => {
              if (prev.some((r) => r.id === row.id)) return prev;
              const tempIdx = prev.findIndex(
                (r) =>
                  r.id.startsWith('temp-') &&
                  r.message_id === row.message_id &&
                  r.actor_type === row.actor_type &&
                  r.actor_id === row.actor_id
              );
              if (tempIdx >= 0) {
                const copy = prev.slice();
                copy[tempIdx] = row;
                return copy;
              }
              return [...prev, row];
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'message_reactions',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: { new: object }) => {
            const row = payload.new as unknown as MessageReaction;
            setReactions((prev) =>
              prev.map((r) => (r.id === row.id ? row : r))
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'message_reactions',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: { old: object }) => {
            const old = payload.old as unknown as Partial<MessageReaction>;
            if (!old?.id) return;
            setReactions((prev) => prev.filter((r) => r.id !== old.id));
          }
        );

      if (typeof channel.subscribe === 'function') {
        channel.subscribe();
      }

      return () => {
        try {
          if (typeof appwrite?.removeChannel === 'function') {
            appwrite.removeChannel(channel);
          } else if (
            typeof (channel as { unsubscribe?: unknown })?.unsubscribe ===
            'function'
          ) {
            (channel as { unsubscribe: () => void }).unsubscribe();
          }
        } catch {
          // Ignore cleanup error
        }
      };
    } catch (err) {
      console.warn(
        '[reactions] failed to subscribe to reactions channel:',
        err
      );
    }
  }, [conversationId]);

  // Clear any in-progress reply draft when the active conversation changes —
  // a quote pulled from conversation A shouldn't bleed into conversation B.
  useEffect(() => {
    setReplyTo(null);
  }, [conversationId]);

  // Reset the server-side unread_count to 0 whenever an unread count
  // surfaces on the active conversation — covers both (a) opening a
  // conversation that had unread messages and (b) new messages arriving
  // while the user is already viewing the thread (webhook server-bumps
  // unread_count to N+1; the realtime UPDATE propagates it into the
  // client, which re-runs this effect and flips it back to 0).
  //
  // Guarding on hasUnread prevents the eq-update loop: once unread_count
  // is 0 the condition is false, so no further UPDATE is issued.
  useEffect(() => {
    if (!conversationId || !hasUnread) return;
    fetch(`/api/inbox/conversations/${encodeURIComponent(conversationId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ unread_count: 0 }),
    }).catch((err) => {
      console.error('Failed to reset unread_count:', err);
    });
  }, [conversationId, hasUnread]);

  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevConvIdRef = useRef<string | undefined>(conversationId);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottomBtn(!nearBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    if (smooth) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: 'smooth',
      });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  // Instant layout positioning on opening/switching conversations (Zero visual sliding)
  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    const isNewConv = prevConvIdRef.current !== conversationId;
    if (isNewConv) {
      prevConvIdRef.current = conversationId;
      prevMessagesLengthRef.current = messages.length;
      const el = scrollRef.current;
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
      setShowScrollBottomBtn(false);
    }
  }, [conversationId, messages]);

  // Instant Auto-scroll for new live incoming/outgoing messages (Zero animation)
  useEffect(() => {
    if (!scrollRef.current) return;
    const isNewConv = prevConvIdRef.current !== conversationId;
    if (isNewConv) return; // Handled synchronously by useLayoutEffect

    const msgCountIncreased = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (msgCountIncreased && isNearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [messages, conversationId, scrollToBottom]);

  const handleSend = useCallback(
    async (text: string, replyToId?: string) => {
      if (!conversation) return;

      const tempId = `temp-${crypto.randomUUID()}`;

      // Optimistic update — shows the message immediately with "sending" status
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_type: 'agent',
        content_type: 'text',
        content_text: text,
        status: 'sending',
        created_at: new Date().toISOString(),
        reply_to_message_id: replyToId,
      };
      onNewMessage(optimisticMsg);
      setReplyTo(null);

      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_type: 'text',
            content_text: text,
            reply_to_message_id: replyToId,
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const reason = payload?.error || `HTTP ${res.status}`;
          console.error('Failed to send message:', reason);
          toast.error(`Failed to send: ${reason}`);
          // Mark the optimistic bubble as failed so the user sees what happened
          onUpdateMessage(tempId, { status: 'failed' });
          return;
        }

        // Swap the temp id for the persisted row so a later refetch or
        // delivery-status UPDATE matches this bubble instead of leaving
        // a ghost "sending" message that never appears after reload.
        applyPersistedSend(onUpdateMessage, tempId, payload);
      } catch (err) {
        console.error('Failed to send message:', err);
        const reason = err instanceof Error ? err.message : 'network error';
        toast.error(`Failed to send: ${reason}`);
        onUpdateMessage(tempId, { status: 'failed' });
      }
    },
    [conversation, onNewMessage, onUpdateMessage]
  );

  const handleSendMedia = useCallback(
    async (payload: SendMediaPayload) => {
      if (!conversation) return;

      // Documents show their filename in our own bubble (and to the
      // recipient as the Meta caption when no caption was typed); other
      // kinds use the caption as-is. Audio carries no caption.
      const contentText =
        payload.kind === 'document'
          ? payload.caption || payload.filename || 'Document'
          : payload.caption;

      const tempId = `temp-${crypto.randomUUID()}`;
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_type: 'agent',
        content_type: payload.kind,
        content_text: contentText,
        media_url: payload.mediaUrl,
        status: 'sending',
        created_at: new Date().toISOString(),
        reply_to_message_id: payload.replyToId,
      };
      onNewMessage(optimisticMsg);
      setReplyTo(null);

      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_type: payload.kind,
            media_url: payload.mediaUrl,
            content_text: contentText,
            filename: payload.filename,
            reply_to_message_id: payload.replyToId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const reason = data?.error || `HTTP ${res.status}`;
          console.error('Failed to send media:', reason);
          toast.error(`Failed to send: ${reason}`);
          onUpdateMessage(tempId, { status: 'failed' });
          // The upload never reached the recipient — GC the orphaned
          // object rather than leaving it in the public bucket forever.
          void deleteAccountMedia(CHAT_MEDIA_BUCKET, payload.path).catch(
            () => {}
          );
          return;
        }

        applyPersistedSend(onUpdateMessage, tempId, data);
      } catch (err) {
        console.error('Failed to send media:', err);
        const reason = err instanceof Error ? err.message : 'network error';
        toast.error(`Failed to send: ${reason}`);
        onUpdateMessage(tempId, { status: 'failed' });
        void deleteAccountMedia(CHAT_MEDIA_BUCKET, payload.path).catch(
          () => {}
        );
      }
    },
    [conversation, onNewMessage, onUpdateMessage]
  );

  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!conversation) return;

      try {
        await fetch(
          `/api/inbox/conversations/${encodeURIComponent(conversation.id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status }),
          }
        );
      } catch (err) {
        console.error('Failed to update status:', err);
      }

      onStatusChange(conversation.id, status);
    },
    [conversation, onStatusChange]
  );

  const handleToggleAiChat = useCallback(async () => {
    if (!conversation) return;
    const nextState = !conversation.ai_chat_enabled;

    try {
      const res = await fetch(
        `/api/inbox/conversations/${encodeURIComponent(conversation.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ai_chat_enabled: nextState }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      if (onConversationUpdate) {
        onConversationUpdate(conversation.id, {
          ai_chat_enabled: nextState,
          ...(nextState ? { ai_handoff_required: false } : {}),
        });
      }
      toast.success(`AI Chat mode turned ${nextState ? 'ON' : 'OFF'}`);
    } catch (error) {
      console.error('Failed to update AI chat mode:', error);
      toast.error('Failed to update AI chat mode');
    }
  }, [conversation, onConversationUpdate]);

  const handleOpenTemplates = useCallback(() => {
    setTemplateModalOpen(true);
  }, []);

  const handleSendTemplate = useCallback(
    async (
      template: MessageTemplate,
      values: {
        body: string[];
        headerText?: string;
        buttonParams?: Record<number, string>;
      }
    ) => {
      if (!conversation) return;

      const renderedBody = renderTemplateBody(template.body_text, values.body);
      const tempId = `temp-${crypto.randomUUID()}`;

      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: conversation.id,
        sender_type: 'agent',
        content_type: 'template',
        content_text: renderedBody,
        template_name: template.name,
        status: 'sending',
        created_at: new Date().toISOString(),
      };
      onNewMessage(optimisticMsg);

      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_type: 'template',
            template_name: template.name,
            template_language: template.language,
            // Structured params drive the new send-builder path
            // (header media + URL button substitution). Body values
            // are mirrored under both shapes so the route can fall
            // back if the template row isn't found locally.
            template_message_params: {
              body: values.body,
              headerText: values.headerText,
              buttonParams: values.buttonParams,
            },
            template_params: values.body,
            content_text: renderedBody,
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const reason = payload?.error || `HTTP ${res.status}`;
          console.error('Failed to send template:', reason);
          toast.error(`Failed to send template: ${reason}`);
          onUpdateMessage(tempId, { status: 'failed' });
          return;
        }

        applyPersistedSend(onUpdateMessage, tempId, payload);
      } catch (err) {
        console.error('Failed to send template:', err);
        const reason = err instanceof Error ? err.message : 'network error';
        toast.error(`Failed to send template: ${reason}`);
        onUpdateMessage(tempId, { status: 'failed' });
      }
    },
    [conversation, onNewMessage, onUpdateMessage]
  );

  // Build a quick id → Message map so reply quotes can be rendered without
  // an extra fetch — the thread already holds the full conversation.
  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  // Bucket reactions by their target message_id for O(1) per-bubble lookup.
  const reactionsByMessageId = useMemo(() => {
    const map = new Map<string, MessageReaction[]>();
    for (const r of reactions) {
      const bucket = map.get(r.message_id);
      if (bucket) bucket.push(r);
      else map.set(r.message_id, [r]);
    }
    return map;
  }, [reactions]);

  const contactDisplayName = contact?.name || contact?.phone || 'Customer';
  const threadChatKind = whatsappChatKind(contact?.phone, contact?.metadata);

  // Author label for a quoted message: "You" when we sent the parent,
  // contact name when the customer sent it. Group/channel quotes use the
  // participant name WhatsApp prefixes onto the stored body.
  const authorLabelFor = useCallback(
    (m: Message): string => {
      const isAgentMsg = m.sender_type === 'agent' || m.sender_type === 'bot';
      if (isAgentMsg) return 'You';
      if (threadChatKind === 'group' || threadChatKind === 'channel') {
        const preview = parseWhatsAppSenderPreview(m.content_text);
        if (preview.sender) return preview.sender;
      }
      return contactDisplayName;
    },
    [contactDisplayName, threadChatKind]
  );

  const handleStartReply = useCallback(
    (msg: Message) => {
      setReplyTo({
        id: msg.id,
        authorLabel: authorLabelFor(msg),
        preview: buildReplyPreview(msg),
      });
    },
    [authorLabelFor]
  );

  // Single reaction-set primitive. emoji === "" removes; otherwise adds/swaps.
  // The "toggle" semantic (pill click) is computed at the call site where the
  // current reactions for the bubble are already in scope — keeps this
  // function dependency-free w.r.t. the reaction list.
  const postReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id || !conversation) {
        console.warn('[reactions] missing user or conversation');
        return;
      }
      if (messageId.startsWith('temp-')) {
        toast.error('Wait for the message to finish sending');
        return;
      }

      const convId = conversation.id;
      const userId = user.id;
      let snapshot: MessageReaction[] = [];

      // Functional updater — captures the freshest reactions list, never a
      // stale closure. Snapshot stored for rollback on POST failure.
      setReactions((prev) => {
        snapshot = prev;
        const own = prev.find(
          (r) =>
            r.message_id === messageId &&
            r.actor_type === 'agent' &&
            r.actor_id === userId
        );
        if (emoji === '') return own ? prev.filter((r) => r !== own) : prev;
        if (own) return prev.map((r) => (r === own ? { ...own, emoji } : r));
        return [
          ...prev,
          {
            id: `temp-${crypto.randomUUID()}`,
            message_id: messageId,
            conversation_id: convId,
            actor_type: 'agent',
            actor_id: userId,
            emoji,
            created_at: new Date().toISOString(),
          },
        ];
      });

      try {
        const res = await fetch('/api/whatsapp/react', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: messageId, emoji }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `HTTP ${res.status}`);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'network error';
        toast.error(`Reaction failed: ${reason}`);
        setReactions(snapshot);
      }
    },
    [conversation, user?.id]
  );

  const handleAssignChange = useCallback(
    async (agentId: string | null) => {
      if (!conversation) return;

      // Route through the guarded API (agent+ role, rate limiting,
      // updated_at rollup) instead of a direct client write so the
      // assignment path matches the same authorization rules as
      // every other conversation mutation.
      const res = await fetch(`/api/inbox/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assigned_agent_id: agentId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.error(
          'Failed to update assignment:',
          payload?.error || res.status
        );
        toast.error(
          res.status === 403
            ? 'Assignment requires agent role or higher'
            : 'Failed to update assignment'
        );
        return;
      }

      onAssignChange(conversation.id, agentId);
    },
    [conversation, onAssignChange]
  );

  // Empty state — same WhatsApp-style doodle background as the active
  // thread below, so swapping between empty/selected doesn't change the
  // pattern under the user's eye.
  if (!conversation) {
    return (
      <div
        className={cn(
          'flex flex-1 flex-col items-center justify-center p-6 text-center',
          DOODLE_BG_CLASSES
        )}
      >
        <div className="bg-card/90 border-border/80 flex max-w-sm flex-col items-center rounded-2xl border p-8 shadow-lg backdrop-blur-xs">
          <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h3 className="text-foreground text-base font-semibold">
            Select a conversation
          </h3>
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            Choose a conversation from the left to start messaging, or start a
            new WhatsApp conversation with any patient or contact.
          </p>
          {onStartConversation && (
            <Button
              onClick={onStartConversation}
              className="mt-5 h-8.5 gap-2 px-4 text-xs font-medium shadow-xs"
            >
              <SquarePen className="h-3.5 w-3.5" />
              Start New Conversation
            </Button>
          )}
        </div>
      </div>
    );
  }

  const effectiveContact: Contact =
    contact ||
    conversation.contact ||
    ({
      id: conversation.contact_id || 'unknown',
      name: 'Contact',
      phone: '',
      account_id: '',
      user_id: '',
      created_at: conversation.created_at || new Date().toISOString(),
      updated_at: conversation.updated_at || new Date().toISOString(),
    } as Contact);

  const chatKind = whatsappChatKind(
    effectiveContact.phone,
    effectiveContact.metadata
  );
  const displayName =
    whatsappContactDisplayName(effectiveContact.name, effectiveContact.phone) ||
    whatsappChatKindLabel(chatKind) ||
    'Chat';
  const displaySubtitle =
    whatsappChatKindLabel(chatKind) ||
    formatWhatsAppDisplayPhone(effectiveContact.phone) ||
    effectiveContact.phone;
  const messageGroups = groupMessagesByDate(messages);
  const currentStatus = STATUS_OPTIONS.find(
    (s) => s.value === conversation.status
  );
  const assignedAgentId = conversation.assigned_agent_id ?? null;
  const currentAssignee = profiles.find((p) => p.user_id === assignedAgentId);
  const assignLabel = assignedAgentId
    ? (currentAssignee?.full_name ?? 'Assigned')
    : 'Assign';

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col', DOODLE_BG_CLASSES)}>
      {/* Header — solid card surface sits on top of the doodle so the
          name/avatar/dropdowns stay legible. */}
      <div className="border-border bg-card flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Back-to-list button — mobile only. Hidden on lg+ where the
              conversation list is always visible next to the thread. */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <WhatsAppChatAvatar
            kind={chatKind}
            name={displayName}
            avatarUrl={effectiveContact.avatar_url}
            size="sm"
          />
          <div className="min-w-0">
            <h2 className="text-foreground truncate text-sm font-semibold">
              {displayName}
            </h2>
            {displaySubtitle ? (
              <p className="text-muted-foreground truncate text-xs">
                {displaySubtitle}
              </p>
            ) : null}
          </div>
          {/* Session timer badge — hidden on the narrowest phones so
              the name + back arrow keep their room. */}
          {sessionInfo.remaining && (
            <Badge
              variant="outline"
              className={cn(
                'border-border ml-1 hidden gap-1 text-[10px] sm:ml-2 sm:inline-flex',
                sessionInfo.expired ? 'text-red-400' : 'text-primary'
              )}
            >
              <Clock className="h-3 w-3" />
              {sessionInfo.remaining}
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          {/* Contact-panel toggle — desktop only. The contact sidebar
              eats a chunk of horizontal width that crowds the thread on
              smaller laptops; this lets agents reclaim it when they just
              want to read and reply. Hidden on mobile, where the sidebar
              never renders as a permanent panel anyway. Issue #258. */}
          {onToggleContactPanel && (
            <button
              type="button"
              onClick={onToggleContactPanel}
              aria-label={
                contactPanelOpen ? 'Hide contact panel' : 'Show contact panel'
              }
              aria-pressed={contactPanelOpen}
              title={contactPanelOpen ? 'Hide contact' : 'Show contact'}
              className={cn(
                'hover:bg-muted hover:text-foreground hidden h-7 w-7 items-center justify-center rounded-md transition-colors lg:inline-flex',
                contactPanelOpen ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {contactPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Manual refresh — forces a refetch of the messages + the
              conversation list (the parent bumps its resyncToken). Useful
              when realtime missed an event or the agent just wants to be
              sure nothing's stale. Only rendered when the parent wires
              up `onRefresh`. */}
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              aria-label="Refresh conversation"
              title="Refresh"
              className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-60 sm:inline-flex"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')}
              />
            </button>
          )}

          {/* AI Chat Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleAiChat}
            aria-pressed={conversation.ai_chat_enabled}
            aria-label={
              conversation.ai_chat_enabled
                ? 'AI assistant on. Pause AI'
                : 'AI assistant off. Resume AI'
            }
            title={
              conversation.ai_chat_enabled
                ? 'Disable AI Assistant'
                : 'Enable AI Assistant'
            }
            className={cn(
              'inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-all duration-200 sm:px-2.5',
              conversation.ai_chat_enabled
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Sparkles
              className={cn(
                'h-3 w-3 text-emerald-600 dark:text-emerald-400',
                conversation.ai_chat_enabled && 'animate-pulse'
              )}
            />
            <span className="hidden sm:inline">
              AI {conversation.ai_chat_enabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Status dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Conversation status"
              className={cn(
                'hover:bg-muted inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs',
                currentStatus?.color ?? 'text-muted-foreground'
              )}
            >
              {currentStatus?.label ?? 'Status'}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-border bg-popover"
            >
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={cn('text-sm', opt.color)}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Assign conversation"
              className={cn(
                'hover:bg-muted inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs',
                assignedAgentId ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <UserPlus className="h-3 w-3" />
              <span className="hidden sm:inline">{assignLabel}</span>
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-border bg-popover"
            >
              {
                /* Only agent+ can be assignees — viewers cannot send
                   messages, so assigning a chat to them would park it. */
                profiles.filter((p) => p.role !== 'viewer').length === 0 ? (
                  <DropdownMenuItem
                    disabled
                    className="text-muted-foreground text-sm"
                  >
                    No teammates available
                  </DropdownMenuItem>
                ) : (
                  profiles
                    .filter((p) => p.role !== 'viewer')
                    .map((p) => {
                      const isSelected = p.user_id === assignedAgentId;
                      return (
                        <DropdownMenuItem
                          key={p.id}
                          onClick={() => handleAssignChange(p.user_id)}
                          className={cn(
                            'text-sm',
                            isSelected
                              ? 'text-primary'
                              : 'text-popover-foreground'
                          )}
                        >
                          <span className="flex-1">
                            {p.full_name}
                            {p.user_id === user?.id ? ' (me)' : ''}
                          </span>
                          {isSelected && <Check className="ml-2 h-3 w-3" />}
                        </DropdownMenuItem>
                      );
                    })
                )
              }
              {assignedAgentId && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={() => handleAssignChange(null)}
                    className="text-muted-foreground text-sm"
                  >
                    Unassign
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs">
              Send a template to start the conversation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="mb-4 flex items-center justify-center">
                  <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-[10px] font-medium">
                    {formatDateSeparator(group.date)}
                  </span>
                </div>
                {/* Messages */}
                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const parent = msg.reply_to_message_id
                      ? messagesById.get(msg.reply_to_message_id)
                      : null;
                    const reply = parent
                      ? {
                          authorLabel: authorLabelFor(parent),
                          preview: buildReplyPreview(parent),
                        }
                      : null;
                    const msgReactions = reactionsByMessageId.get(msg.id);
                    // Toggle is computed at the call site — `msgReactions`
                    // and `user?.id` are already in scope, no extra hook.
                    const handlePillToggle = (emoji: string) => {
                      const own = msgReactions?.find(
                        (r) =>
                          r.actor_type === 'agent' &&
                          r.actor_id === (user?.id ?? '') &&
                          r.emoji === emoji
                      );
                      const next = own?.emoji === emoji ? '' : emoji;
                      void postReaction(msg.id, next);
                    };

                    return (
                      <MessageActions
                        key={msg.id}
                        message={msg}
                        onReply={() => handleStartReply(msg)}
                        onReact={
                          reactionsAvailable
                            ? (emoji) => {
                                if (emoji) void postReaction(msg.id, emoji);
                              }
                            : undefined
                        }
                      >
                        <MessageBubble
                          message={msg}
                          chatKind={chatKind}
                          reply={reply}
                          reactions={msgReactions}
                          currentUserId={user?.id}
                          onToggleReaction={
                            reactionsAvailable ? handlePillToggle : undefined
                          }
                        />
                      </MessageActions>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom(false)}
          className="bg-background/95 text-foreground border-border/80 hover:bg-accent absolute right-6 bottom-28 z-30 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur transition-all duration-200 hover:scale-110"
          title="Scroll to bottom"
          aria-label="Scroll to latest message"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* AI vs Staff Status Banner */}
      <div className="border-border/70 bg-card/95 flex items-center justify-between gap-3 border-t px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          {conversation.ai_chat_enabled ? (
            <>
              <span className="flex size-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-400">
                AI Receptionist is replying
              </span>
              <span className="text-muted-foreground hidden text-[11px] sm:inline">
                — New customer messages will be answered automatically.
              </span>
            </>
          ) : (
            <>
              <span className="flex size-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-blue-400">
                Staff is replying
              </span>
              <span className="text-muted-foreground hidden text-[11px] sm:inline">
                — AI automatic replies are paused for this conversation.
              </span>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setAiToggleDialogOpen(true)}
          className="border-border hover:bg-muted h-6 px-2 text-[11px] font-medium"
        >
          {conversation.ai_chat_enabled ? 'Pause AI' : 'Resume AI'}
        </Button>
      </div>

      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        sessionExpired={sessionInfo.expired}
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        onOpenTemplates={handleOpenTemplates}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        insertedReply={insertedReply}
      />

      <TemplatePicker
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        onSelect={handleSendTemplate}
      />

      {/* AI Pause / Resume Confirmation Dialog */}
      <Dialog open={aiToggleDialogOpen} onOpenChange={setAiToggleDialogOpen}>
        <DialogContent className="bg-popover text-popover-foreground border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-emerald-500" />
              {conversation.ai_chat_enabled
                ? 'Pause AI replies for this conversation?'
                : 'Resume AI replies?'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1 text-xs leading-relaxed">
              {conversation.ai_chat_enabled
                ? 'When paused, staff can reply manually without the AI responding to new messages from this customer.'
                : 'Helpa will automatically answer new customer messages again based on your business info and services.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAiToggleDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAiToggleDialogOpen(false);
                void handleToggleAiChat();
              }}
              className={`text-xs font-bold text-white ${
                conversation.ai_chat_enabled
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {conversation.ai_chat_enabled ? 'Pause AI' : 'Resume AI'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
