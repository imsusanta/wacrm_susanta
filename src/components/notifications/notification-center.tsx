'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { InAppNotification } from '@/types';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  UserPlus,
  Clock,
  Calendar,
  Bot,
  DollarSign,
  AlertCircle,
  BellRing,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      console.warn('[NotificationCenter] Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    }, 60000); // Polling every 60s when visible
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator
    ) {
      setPushSupported(true);
      if (Notification.permission === 'granted') {
        setPushSubscribed(true);
      }
    }
  }, []);

  const handleEnablePush = async () => {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        toast.error('Push notifications are not supported by this browser.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission was denied.');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const options: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
          ...(vapidKey ? { applicationServerKey: vapidKey } : {}),
        };
        try {
          sub = await reg.pushManager.subscribe(options);
        } catch {
          // If server key is needed and missing in browser, fallback
        }
      }

      if (sub) {
        const subJson = sub.toJSON();
        await fetch('/api/notifications/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: subJson.keys?.p256dh || '',
              auth: subJson.keys?.auth || '',
            },
          }),
        });
      }
      setPushSubscribed(true);
      toast.success('Instant push alerts enabled.');
    } catch (err) {
      console.warn('[NotificationCenter] Push enable error:', err);
      toast.error('Could not activate push notifications.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  };

  const handleItemClick = async (notif: InAppNotification) => {
    if (!notif.is_read) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setOpen(false);
    // Only follow same-origin relative paths. A notification's link_url
    // is attacker-influenceable (any agent can POST /api/notifications),
    // so absolute/protocol-relative URLs must never be navigated to.
    if (
      notif.link_url &&
      notif.link_url.startsWith('/') &&
      !notif.link_url.startsWith('//')
    ) {
      router.push(notif.link_url);
    }
  };

  function getNotifIcon(type: InAppNotification['type']) {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="size-4 text-emerald-500" />;
      case 'lead':
        return <UserPlus className="size-4 text-blue-500" />;
      case 'task':
        return <Clock className="size-4 text-indigo-500" />;
      case 'appointment':
        return <Calendar className="size-4 text-amber-500" />;
      case 'ai_handoff':
        return <Bot className="size-4 text-purple-500" />;
      case 'payment':
        return <DollarSign className="size-4 text-emerald-600" />;
      default:
        return <AlertCircle className="text-muted-foreground size-4" />;
    }
  }

  function formatTime(dateStr: string) {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-IN', {
        timeStyle: 'short',
        dateStyle: 'short',
      }).format(date);
    } catch {
      return dateStr;
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="text-muted-foreground hover:text-foreground relative flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-slate-100 focus:outline-none"
        aria-label="Open notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="animate-in zoom-in absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="border-border bg-popover w-80 p-0 shadow-xl"
      >
        {/* Header */}
        <div className="border-border/60 flex items-center justify-between border-b px-3.5 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-foreground text-xs font-semibold">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-bold"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-primary flex items-center gap-1 text-[11px] font-medium hover:underline"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="divide-border/40 max-h-80 divide-y overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <Bell className="mx-auto size-6 opacity-30" />
              <p className="mt-2 text-xs font-medium">No notifications</p>
              <p className="text-muted-foreground text-[11px]">
                You are all caught up!
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`hover:bg-muted/60 flex cursor-pointer items-start gap-3 p-3 transition-colors ${
                  !n.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">{getNotifIcon(n.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`truncate text-xs ${!n.is_read ? 'text-foreground font-bold' : 'text-muted-foreground font-medium'}`}
                    >
                      {n.title}
                    </p>
                    <time className="text-muted-foreground shrink-0 font-mono text-[10px]">
                      {formatTime(n.created_at)}
                    </time>
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {n.body}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-border/60 flex flex-col gap-1 border-t p-2">
          {pushSupported && !pushSubscribed && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnablePush}
              className="border-primary/30 text-primary hover:bg-primary/10 h-7 w-full text-[11px] font-medium"
            >
              <BellRing className="mr-1.5 size-3" />
              Enable Push Notifications
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              router.push('/inbox');
            }}
            className="text-muted-foreground hover:text-foreground h-6 w-full text-[11px]"
          >
            Open Inbox & Activity
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
