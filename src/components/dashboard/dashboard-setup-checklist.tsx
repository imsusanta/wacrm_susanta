'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Smartphone, X } from 'lucide-react';

interface DashboardSetupChecklistProps {
  onResumeOnboarding?: () => void | Promise<void>;
}

interface ChecklistItem {
  id?: string;
  label: string;
  done: boolean;
  count?: number;
  href: string;
}

export function DashboardSetupChecklist({
  onResumeOnboarding,
}: DashboardSetupChecklistProps = {}) {
  const { account, accountId, accountRole } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [dynamicItems, setDynamicItems] = useState<ChecklistItem[] | null>(
    null
  );
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if dismissed in session
    if (typeof window !== 'undefined') {
      const isDismissed = window.sessionStorage.getItem(
        `dismiss_checklist_${accountId}`
      );
      if (isDismissed === 'true') {
        setDismissed(true);
      }
    }

    async function checkStatus() {
      try {
        const res = await fetch('/api/account/checklist-status');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.items)) {
            setDynamicItems(data.items);
            setHasWhatsApp(Boolean(data.whatsapp_done));
            return;
          }
        }
        // Fallback to whatsapp/config if checklist-status route is unavailable
        const waRes = await fetch('/api/whatsapp/config');
        if (waRes.ok) {
          const waData = await waRes.json();
          setHasWhatsApp(waData?.connected === true);
        }
      } catch {
        /* ignore fallback */
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, [accountId]);

  // Do not force workspace setup onto invited staff or unauthorized roles
  if (accountRole !== 'owner' && accountRole !== 'admin') return null;

  if (dismissed || loading) return null;

  const items: ChecklistItem[] = dynamicItems ?? [
    {
      label: 'Business Profile configured',
      done: Boolean(
        account?.name && account?.industry && account?.industry !== 'general'
      ),
      href: '/settings',
    },
    {
      label: 'Services & Pricing saved',
      done: false,
      href: '/knowledge-base',
    },
    {
      label: 'AI Receptionist configured',
      done: false,
      href: '/settings/ai',
    },
    {
      label: 'WhatsApp connected',
      done: hasWhatsApp,
      href: '/settings/whatsapp',
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  // If all completed, auto-hide
  if (completedCount === totalCount) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`dismiss_checklist_${accountId}`, 'true');
    }
  };

  return (
    <div className="bg-card relative mb-6 overflow-hidden rounded-2xl border border-emerald-500/30 p-5 shadow-sm">
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 rounded-md p-1 transition-colors"
        title="Dismiss checklist"
        aria-label="Dismiss setup checklist"
      >
        <X className="size-4" />
      </button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {completedCount}/{totalCount}
            </span>
            <h3 className="text-foreground text-sm font-bold">
              Get Started with Helpa
            </h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Finish your clinic setup, then test one complete patient journey.
          </p>

          {/* Progress bar */}
          <div className="bg-muted mt-2.5 h-1.5 w-48 overflow-hidden rounded-full">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onResumeOnboarding && accountRole === 'owner' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onResumeOnboarding}
              className="border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
              Resume Setup
            </Button>
          )}
          {!hasWhatsApp && (
            <Link href="/settings/whatsapp">
              <Button
                size="sm"
                className="bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Smartphone className="mr-1.5 size-3.5" /> Connect WhatsApp
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Checklist items */}
      <div className="border-border mt-4 grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id ?? item.href}
            href={item.href}
            className="text-muted-foreground hover:bg-muted hover:text-foreground group flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs transition-colors"
          >
            {item.done ? (
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="size-3.5 shrink-0 text-amber-400" />
            )}
            <span
              className={
                item.done
                  ? 'text-muted-foreground line-through opacity-75'
                  : 'text-foreground font-medium'
              }
            >
              {item.label}
              {typeof item.count === 'number' && item.count > 0
                ? ` (${item.count})`
                : ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
