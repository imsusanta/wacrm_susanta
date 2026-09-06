'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ActivityItem } from '@/types';
import {
  MessageSquare,
  Calendar,
  FileText,
  Clock,
  Bot,
  DollarSign,
  Loader2,
  RefreshCw,
  PhoneCall,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ContactActivityTimelineProps {
  contactId: string;
}

export function ContactActivityTimeline({
  contactId,
}: ContactActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchActivities = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/activities`);
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch contact activities:', err);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filteredActivities = activities.filter((act) => {
    if (filterType === 'all') return true;
    if (filterType === 'calls') return act.type === 'call';
    if (filterType === 'messages')
      return (
        act.type === 'whatsapp_inbound' || act.type === 'whatsapp_outbound'
      );
    if (filterType === 'notes') return act.type === 'note';
    if (filterType === 'appointments') return act.type === 'appointment';
    if (filterType === 'tasks') return act.type === 'task';
    if (filterType === 'deals') return act.type === 'deal_stage';
    return true;
  });

  function getActivityIcon(type: ActivityItem['type']) {
    switch (type) {
      case 'whatsapp_inbound':
        return <MessageSquare className="size-4 text-emerald-500" />;
      case 'whatsapp_outbound':
        return <MessageSquare className="size-4 text-sky-500" />;
      case 'ai_interaction':
        return <Bot className="size-4 text-purple-500" />;
      case 'note':
        return <FileText className="size-4 text-amber-500" />;
      case 'appointment':
        return <Calendar className="size-4 text-blue-500" />;
      case 'task':
        return <CheckCircle2 className="size-4 text-indigo-500" />;
      case 'deal_stage':
        return <DollarSign className="size-4 text-emerald-600" />;
      case 'call':
        return <PhoneCall className="size-4 text-teal-500" />;
      default:
        return <Activity className="text-muted-foreground size-4" />;
    }
  }

  function getActivityBadge(type: ActivityItem['type']) {
    switch (type) {
      case 'whatsapp_inbound':
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600"
          >
            Inbound WhatsApp
          </Badge>
        );
      case 'whatsapp_outbound':
        return (
          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-600"
          >
            Outbound WhatsApp
          </Badge>
        );
      case 'ai_interaction':
        return (
          <Badge
            variant="outline"
            className="border-purple-500/30 bg-purple-500/10 text-[10px] text-purple-600"
          >
            AI Auto-Reply
          </Badge>
        );
      case 'note':
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600"
          >
            Internal Note
          </Badge>
        );
      case 'appointment':
        return (
          <Badge
            variant="outline"
            className="border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-600"
          >
            Appointment
          </Badge>
        );
      case 'task':
        return (
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-[10px] text-indigo-600"
          >
            Task / Follow-up
          </Badge>
        );
      case 'deal_stage':
        return (
          <Badge
            variant="outline"
            className="border-emerald-600/30 bg-emerald-600/10 text-[10px] text-emerald-700"
          >
            Deal Activity
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            Activity
          </Badge>
        );
    }
  }

  function formatActivityDate(dateString: string) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return dateString;
    }
  }

  return (
    <div className="flex h-full flex-col space-y-3 p-4">
      {/* Top Filter Bar */}
      <div className="border-border/50 flex items-center justify-between gap-2 border-b pb-2">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'calls', label: 'AI Calls' },
              { id: 'messages', label: 'WhatsApp' },
              { id: 'notes', label: 'Notes' },
              { id: 'appointments', label: 'Appointments' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'deals', label: 'Deals' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filterType === t.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7 shrink-0"
          onClick={fetchActivities}
          disabled={loading}
          title="Refresh Timeline"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Activity Timeline List */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
            <Loader2 className="text-primary size-6 animate-spin" />
            <span className="mt-2 text-xs">Loading activity timeline...</span>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
            <Clock className="size-8 opacity-40" />
            <p className="mt-2 text-xs font-medium">
              No activity records found
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              New messages, notes, appointments, and deal updates will appear
              here automatically.
            </p>
          </div>
        ) : (
          <div className="before:bg-border/60 relative space-y-4 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-[2px]">
            {filteredActivities.map((act) => (
              <div key={act.id} className="group relative">
                {/* Timeline node icon */}
                <div className="border-border bg-background absolute -left-6 mt-1 flex size-5 items-center justify-center rounded-full border shadow-xs">
                  {getActivityIcon(act.type)}
                </div>

                <div className="border-border/70 bg-card hover:border-primary/40 rounded-lg border p-3 shadow-xs transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground text-xs font-semibold">
                        {act.title}
                      </span>
                      {getActivityBadge(act.type)}
                    </div>
                    <time className="text-muted-foreground font-mono text-[11px]">
                      {formatActivityDate(act.created_at)}
                    </time>
                  </div>
                  <p className="text-muted-foreground/90 mt-1.5 text-xs whitespace-pre-wrap">
                    {act.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
