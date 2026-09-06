'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { Conversation, ConversationStatus } from '@/types';
import {
  Search,
  ChevronDown,
  SquarePen,
  MessageSquarePlus,
  AlertCircle,
  RefreshCw,
  X,
  Filter,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendOutboundModal } from '@/components/contacts/send-outbound-modal';

import { useAuth } from '@/hooks/use-auth';
import {
  isHiddenWhatsAppInboxChat,
  parseWhatsAppSenderPreview,
  whatsappChatKind,
  whatsappChatKindLabel,
  whatsappContactDisplayName,
} from '@/core/whatsapp/group-identity';
import { WhatsAppChatAvatar } from '@/components/inbox/whatsapp-chat-avatar';

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  resyncToken?: number;
  onStartConversation?: () => void;
  onSelectById?: (conversationId: string) => void;
}

const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: '',
  pending: 'bg-amber-500',
  closed: 'bg-muted-foreground',
};

export type InboxFilter =
  | 'all'
  | 'unread'
  | 'mine'
  | 'ai'
  | 'attention'
  | 'open'
  | 'pending'
  | 'closed';

const FILTER_OPTIONS: { label: string; value: InboxFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Assigned to me', value: 'mine' },
  { label: 'AI Handled', value: 'ai' },
  { label: 'Needs Attention', value: 'attention' },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Closed', value: 'closed' },
];

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
  onStartConversation,
  onSelectById,
}: ConversationListProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  // Keep the latest callback and conversations in refs so the fetch effect below can
  // have a stable, empty-dep identity and avoid redundant state updates.
  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  const conversationsRef = useRef(conversations);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
    conversationsRef.current = conversations;
  });

  useEffect(() => {
    let cancelled = false;

    const areConvsEqual = (a: Conversation[], b: Conversation[]): boolean => {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (
          a[i].id !== b[i].id ||
          (a[i].unread_count ?? 0) !== (b[i].unread_count ?? 0) ||
          a[i].last_message_text !== b[i].last_message_text ||
          a[i].last_message_at !== b[i].last_message_at ||
          a[i].status !== b[i].status ||
          a[i].assigned_agent_id !== b[i].assigned_agent_id ||
          a[i].ai_chat_enabled !== b[i].ai_chat_enabled ||
          (a[i].ai_handoff_required ?? false) !==
            (b[i].ai_handoff_required ?? false)
        ) {
          return false;
        }
      }
      return true;
    };

    const fetchConvs = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
        const res = await fetch('/api/inbox/conversations', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg =
            errData.error || `HTTP ${res.status}: Failed to load conversations`;
          if (!isBackground) {
            console.error('Failed to fetch conversations:', errMsg);
            setFetchError(errMsg);
          }
          return;
        }

        const json = await res.json();
        const convs = (
          Array.isArray(json) ? json : (json.conversations ?? [])
        ) as Conversation[];

        if (isBackground && areConvsEqual(convs, conversationsRef.current)) {
          // No changes detected, skip updating parent state to prevent UI jitter
          return;
        }

        onConversationsLoadedRef.current(convs);
        setFetchError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (!isBackground) {
          console.error('Unexpected error fetching conversations:', msg);
          setFetchError(msg);
        }
      } finally {
        if (!cancelled && !isBackground) {
          setLoading(false);
        }
      }
    };

    void fetchConvs(false);

    // Periodic safety-net poll every 60 seconds (Realtime handles instant updates)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchConvs(true);
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [resyncToken, retryCounter]);

  // Tab counts
  const counts = useMemo(() => {
    let unread = 0;
    let mine = 0;
    let ai = 0;
    let attention = 0;

    for (const c of conversations) {
      if ((c.unread_count ?? 0) > 0) unread++;
      if (user?.id && c.assigned_agent_id === user.id) mine++;
      if (c.status === 'open' && !c.assigned_agent_id) ai++;
      if (
        c.status === 'pending' ||
        (c.unread_count ?? 0) > 0 ||
        c.ai_handoff_required
      ) {
        attention++;
      }
    }

    return { unread, mine, ai, attention, total: conversations.length };
  }, [conversations, user?.id]);

  const filtered = useMemo(() => {
    let result = conversations.filter(
      (c) => !isHiddenWhatsAppInboxChat(c.contact?.phone, c.contact?.metadata)
    );

    if (filter === 'unread') {
      result = result.filter((c) => (c.unread_count ?? 0) > 0);
    } else if (filter === 'mine') {
      result = result.filter(
        (c) => user?.id && c.assigned_agent_id === user.id
      );
    } else if (filter === 'ai') {
      result = result.filter(
        (c) => c.status === 'open' && !c.assigned_agent_id
      );
    } else if (filter === 'attention') {
      result = result.filter(
        (c) =>
          c.status === 'pending' ||
          (c.unread_count ?? 0) > 0 ||
          c.ai_handoff_required === true
      );
    } else if (filter !== 'all') {
      result = result.filter((c) => c.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? '';
        const phone = c.contact?.phone?.toLowerCase() ?? '';
        const lastMsg = c.last_message_text?.toLowerCase() ?? '';
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q);
      });
    }

    // Sort by last_message_at descending
    return [...result].sort((a, b) => {
      const timeA = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : 0;
      const timeB = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : 0;
      return timeB - timeA;
    });
  }, [conversations, filter, search, user?.id]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, []);

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect]
  );

  const handleOpenStartChat = useCallback(() => {
    if (onStartConversation) {
      onStartConversation();
    } else {
      setStartModalOpen(true);
    }
  }, [onStartConversation]);

  const handleConversationCreated = useCallback(
    (newConvId?: string) => {
      setStartModalOpen(false);
      setRetryCounter((c) => c + 1);
      if (newConvId && onSelectById) {
        onSelectById(newConvId);
      }
    },
    [onSelectById]
  );

  const activeFilter = FILTER_OPTIONS.find((o) => o.value === filter);

  return (
    <div className="border-border bg-card flex h-full w-full min-w-0 flex-col overflow-hidden border-r lg:w-80">
      {/* Header with Title and New Message button */}
      <div className="border-border flex items-center justify-between border-b px-3.5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-foreground text-sm font-semibold">Messages</h2>
          {conversations.length > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
              {conversations.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleOpenStartChat}
          className="h-7 gap-1.5 px-2.5 text-xs font-medium shadow-xs"
        >
          <SquarePen className="h-3.5 w-3.5" />
          <span>New Message</span>
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="border-border space-y-2.5 border-b p-3">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={handleSearchChange}
            aria-label="Search conversations"
            placeholder="Search messages by name or phone..."
            className="border-border bg-muted text-foreground placeholder-muted-foreground focus:border-primary/50 pr-8 pl-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-xs p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex scrollbar-none items-center gap-1 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">{counts.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            aria-pressed={filter === 'unread'}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
              filter === 'unread'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>Unread</span>
            {counts.unread > 0 && (
              <span className="py-0.2 rounded-full bg-emerald-500/30 px-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                {counts.unread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('mine')}
            aria-pressed={filter === 'mine'}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
              filter === 'mine'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>Assigned</span>
            {counts.mine > 0 && (
              <span className="text-[10px] opacity-75">{counts.mine}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('ai')}
            aria-pressed={filter === 'ai'}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
              filter === 'ai'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>AI Replied</span>
            {counts.ai > 0 && (
              <span className="text-[10px] opacity-75">{counts.ai}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('attention')}
            aria-pressed={filter === 'attention'}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors',
              filter === 'attention'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span>Attention</span>
            {counts.attention > 0 && (
              <span className="text-[10px] opacity-75">{counts.attention}</span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Filter conversations by status"
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-6 items-center justify-center gap-1 rounded-md px-1.5 text-[11px]"
            >
              <Filter className="mr-0.5 h-3 w-3 opacity-70" />
              <span>Status: {activeFilter?.label ?? 'All'}</span>
              <ChevronDown className="ml-0.5 h-3 w-3 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="border-border bg-popover"
            >
              {FILTER_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    'text-xs',
                    filter === opt.value
                      ? 'text-primary font-medium'
                      : 'text-popover-foreground'
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conversation Items */}
      <ScrollArea className="min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:w-full [&_[data-slot=scroll-area-viewport]>div]:min-w-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center">
            <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-muted-foreground text-xs">
              Loading conversations...
            </p>
          </div>
        ) : fetchError ? (
          <div className="space-y-3 px-4 py-12 text-center">
            <div className="bg-destructive/10 text-destructive mx-auto flex h-10 w-10 items-center justify-center rounded-full">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-foreground text-sm font-medium">
              Unable to load conversations
            </p>
            <p className="text-muted-foreground mx-auto max-w-[220px] text-xs leading-relaxed">
              {fetchError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryCounter((c) => c + 1)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="space-y-3 px-4 py-12 text-center">
            {search.trim() ? (
              <>
                <div className="bg-muted text-muted-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-foreground text-sm font-medium">
                  No conversations found
                </p>
                <p className="text-muted-foreground text-xs">
                  No matches for &ldquo;{search}&rdquo;
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="text-xs"
                >
                  Clear search
                </Button>
              </>
            ) : filter !== 'all' ? (
              <>
                <div className="bg-muted text-muted-foreground mx-auto flex h-10 w-10 items-center justify-center rounded-full">
                  <Filter className="h-5 w-5" />
                </div>
                <p className="text-foreground text-sm font-medium">
                  No {filter} conversations
                </p>
                <p className="text-muted-foreground text-xs">
                  No conversations in this status.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="text-xs"
                >
                  View all conversations
                </Button>
              </>
            ) : (
              <>
                <div className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-2xl">
                  <MessageSquarePlus className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">
                    No customer conversations yet
                  </p>
                  <p className="text-muted-foreground mx-auto mt-1 max-w-[210px] text-xs leading-relaxed">
                    Once someone messages your WhatsApp number, their
                    conversation will appear here.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenStartChat}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  <SquarePen className="h-3.5 w-3.5" />
                  Start Conversation
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex w-full min-w-0 flex-col overflow-hidden">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Standalone Start Conversation Modal if not triggered via parent */}
      <SendOutboundModal
        open={startModalOpen}
        onOpenChange={setStartModalOpen}
        onSuccess={handleConversationCreated}
      />
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const chatKind = whatsappChatKind(contact?.phone, contact?.metadata);
  const displayName =
    whatsappContactDisplayName(contact?.name, contact?.phone) ||
    whatsappChatKindLabel(chatKind) ||
    'Chat';
  const preview = parseWhatsAppSenderPreview(conversation.last_message_text);
  const previewBody = preview.body || conversation.last_message_text || '';

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  let timeAgo = '';
  if (conversation.last_message_at) {
    try {
      const d = new Date(conversation.last_message_at);
      if (!isNaN(d.getTime())) {
        timeAgo = formatDistanceToNow(d, { addSuffix: false });
      }
    } catch {
      timeAgo = '';
    }
  }

  const isUnread = (conversation.unread_count ?? 0) > 0 && !isActive;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'hover:bg-muted/50 flex w-full max-w-full min-w-0 items-start gap-3 overflow-hidden px-3 py-3 text-left transition-colors',
        isActive && 'border-primary bg-muted/70 border-l-2'
      )}
    >
      <WhatsAppChatAvatar
        kind={chatKind}
        name={displayName}
        avatarUrl={contact?.avatar_url}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm',
              isUnread
                ? 'text-foreground font-bold'
                : 'text-foreground font-medium'
            )}
          >
            {displayName}
          </span>
          <span
            className={cn(
              'shrink-0 text-[10px]',
              isUnread
                ? 'font-bold text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            )}
          >
            {timeAgo}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-xs',
              isUnread
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground'
            )}
          >
            {preview.sender ? (
              <>
                <span className="text-foreground/80">{preview.sender}: </span>
                {previewBody || 'No messages yet'}
              </>
            ) : (
              previewBody || 'No messages yet'
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isUnread && (
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full bg-emerald-500 font-bold text-white shadow-sm',
                  (conversation.unread_count ?? 0) > 1
                    ? 'h-4 min-w-4 px-1 text-[10px]'
                    : 'h-2.5 w-2.5'
                )}
                title={`${conversation.unread_count} unread message${conversation.unread_count === 1 ? '' : 's'}`}
              >
                {(conversation.unread_count ?? 0) > 1
                  ? conversation.unread_count
                  : null}
              </span>
            )}
            {conversation.status !== 'open' &&
              STATUS_COLORS[conversation.status] && (
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    STATUS_COLORS[conversation.status]
                  )}
                  title={`Status: ${conversation.status}`}
                />
              )}
          </div>
        </div>

        {/* Status / Assignment metadata footer */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {conversation.ai_handoff_required ? (
            <span className="inline-flex animate-pulse items-center gap-1 rounded border border-red-500/30 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              ⚠️ Human Handoff
            </span>
          ) : conversation.assigned_agent_id ? (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Assigned
            </span>
          ) : conversation.status === 'open' ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              AI Copilot
            </span>
          ) : null}

          {conversation.status === 'pending' &&
            !conversation.ai_handoff_required && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400">
                Needs Attention
              </span>
            )}
        </div>
      </div>
    </button>
  );
}
