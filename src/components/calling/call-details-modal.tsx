'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  User,
  Bot,
  Copy,
  Check,
  Loader2,
  Sparkles,
  TrendingUp,
  Tag,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CallDetailsModalProps {
  callId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CallDetailRecord {
  id: string;
  account_id: string;
  contact_id?: string | null;
  lead_id?: string | null;
  calling_agent_id?: string | null;
  external_call_id?: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  from_phone?: string | null;
  to_phone?: string | null;
  duration_seconds?: number | null;
  summary?: string | null;
  intent?: string | null;
  lead_score?: number | null;
  extracted_data?: Record<string, unknown> | null;
  transcript?: string | null;
  recording_url?: string | null;
  cost?: number | null;
  stt_provider?: string | null;
  tts_provider?: string | null;
  language?: string | null;
  created_at: string;
  contacts?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  } | null;
  leads?: {
    id: string;
    name: string;
    stage: string;
    value?: number;
  } | null;
  calling_agents?: {
    id: string;
    name: string;
    voice_id?: string;
    language?: string;
  } | null;
}

export function CallDetailsModal({
  callId,
  open,
  onOpenChange,
}: CallDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [call, setCall] = useState<CallDetailRecord | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; event_type: string; created_at: string; status: string }>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !callId) {
      setCall(null);
      setEvents([]);
      return;
    }

    let isMounted = true;
    async function loadCallDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/voice/calls/${callId}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Failed to fetch call details');
        }
        if (isMounted) {
          setCall(data.call);
          setEvents(data.events || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : 'Error fetching call';
          toast.error(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCallDetails();
    return () => {
      isMounted = false;
    };
  }, [callId, open]);

  const handleCopyTranscript = () => {
    if (!call?.transcript) return;
    navigator.clipboard.writeText(call.transcript);
    setCopied(true);
    toast.success('Transcript copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getScoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'bg-muted text-muted-foreground';
    if (score >= 70) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (score >= 40) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  };

  const parseTranscriptBubbles = (text?: string | null) => {
    if (!text) return [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const bubbles: Array<{ role: 'assistant' | 'user'; text: string }> = [];

    for (const line of lines) {
      if (line.toLowerCase().startsWith('ai:') || line.toLowerCase().startsWith('assistant:') || line.toLowerCase().startsWith('helpa:')) {
        bubbles.push({
          role: 'assistant',
          text: line.replace(/^(ai|assistant|helpa):\s*/i, ''),
        });
      } else if (line.toLowerCase().startsWith('user:') || line.toLowerCase().startsWith('customer:') || line.toLowerCase().startsWith('caller:')) {
        bubbles.push({
          role: 'user',
          text: line.replace(/^(user|customer|caller):\s*/i, ''),
        });
      } else {
        // Continuation or raw line
        if (bubbles.length > 0) {
          bubbles[bubbles.length - 1].text += ` ${line}`;
        } else {
          bubbles.push({ role: 'user', text: line });
        }
      }
    }
    return bubbles;
  };

  const bubbles = parseTranscriptBubbles(call?.transcript);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {call?.direction === 'inbound' ? (
                  <PhoneIncoming className="w-5 h-5" />
                ) : (
                  <PhoneOutgoing className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  Call Record
                  {call && (
                    <Badge
                      variant={
                        call.status === 'completed'
                          ? 'default'
                          : call.status === 'failed' || call.status === 'busy'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="capitalize text-xs font-normal"
                    >
                      {call.status}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {call?.created_at
                    ? new Date(call.created_at).toLocaleString()
                    : 'Call details and intelligence'}
                </DialogDescription>
              </div>
            </div>

            {call?.lead_score !== undefined && call?.lead_score !== null && (
              <div
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold text-sm ${getScoreColor(
                  call.lead_score
                )}`}
              >
                <TrendingUp className="w-4 h-4" />
                Score: {call.lead_score}/100
              </div>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !call ? (
          <div className="flex-1 p-8 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Call record not found</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Customer
                </div>
                <div className="font-semibold text-sm mt-1 truncate">
                  {call.contacts?.name || call.to_phone || call.from_phone || 'Unknown'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {call.to_phone || call.from_phone || '—'}
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" /> Calling Agent
                </div>
                <div className="font-semibold text-sm mt-1 truncate">
                  {call.calling_agents?.name || 'Default Agent'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {call.language || 'en-IN'}
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Duration
                </div>
                <div className="font-semibold text-sm mt-1">
                  {formatDuration(call.duration_seconds)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {call.cost ? `₹${call.cost.toFixed(2)}` : 'Standard'}
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Detected Intent
                </div>
                <div className="font-semibold text-sm mt-1 capitalize truncate">
                  {call.intent ? call.intent.replace(/_/g, ' ') : 'General'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {call.stt_provider || 'sarvam'} / {call.tts_provider || 'sarvam'}
                </div>
              </div>
            </div>

            {/* Audio Recording Player (if available) */}
            {call.recording_url && (
              <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Call Recording Audio</div>
                    <div className="text-xs text-muted-foreground">Stereo telephony capture</div>
                  </div>
                </div>
                <audio controls src={call.recording_url} className="h-9 max-w-[260px]" />
              </div>
            )}

            {/* AI Call Summary */}
            {call.summary && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Call Summary
                </div>
                <div className="p-3.5 rounded-lg border bg-muted/30 text-sm leading-relaxed text-foreground">
                  {call.summary}
                </div>
              </div>
            )}

            {/* Extracted Lead Intelligence */}
            {call.extracted_data && Object.keys(call.extracted_data).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  Extracted Lead Fields & Insights
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(call.extracted_data).map(([key, value]) => {
                    if (value === null || value === undefined || value === '') return null;
                    return (
                      <div key={key} className="p-2.5 rounded border bg-card text-xs space-y-0.5">
                        <div className="text-muted-foreground uppercase tracking-wider text-[10px]">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="font-medium text-foreground truncate">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full Transcript */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">Conversation Transcript</div>
                {call.transcript && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground"
                    onClick={handleCopyTranscript}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Transcript'}
                  </Button>
                )}
              </div>

              {bubbles.length > 0 ? (
                <div className="space-y-2.5 p-4 rounded-lg border bg-muted/10 max-h-[280px] overflow-y-auto">
                  {bubbles.map((b, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        b.role === 'assistant' ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div className="text-[10px] text-muted-foreground mb-0.5 px-1">
                        {b.role === 'assistant' ? 'Helpa AI' : 'Customer'}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          b.role === 'assistant'
                            ? 'bg-card border text-foreground rounded-tl-none'
                            : 'bg-primary text-primary-foreground rounded-tr-none'
                        }`}
                      >
                        {b.text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border rounded-lg text-xs text-muted-foreground">
                  No transcript available for this call.
                </div>
              )}
            </div>

            {/* Provider Events Audit */}
            {events.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Provider Telephony Events ({events.length})
                </div>
                <div className="space-y-1">
                  {events.slice(0, 5).map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between text-xs p-2 rounded bg-muted/20 border"
                    >
                      <span className="font-mono text-muted-foreground">{evt.event_type}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(evt.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
