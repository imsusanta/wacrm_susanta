'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CallCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string;
  leadId?: string;
  initialName?: string;
  initialPhone?: string;
  onCallInitiated?: (call: Record<string, unknown>) => void;
}

interface CallingAgentItem {
  id: string;
  name: string;
  phone_number?: string;
  language: string;
  status: string;
  stt_provider: string;
  tts_provider: string;
}

export function CallCustomerModal({
  open,
  onOpenChange,
  contactId,
  leadId,
  initialName = '',
  initialPhone = '',
  onCallInitiated,
}: CallCustomerModalProps) {
  const [agents, setAgents] = useState<CallingAgentItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhone);
  const [callingState, setCallingState] = useState<
    'idle' | 'initiating' | 'calling' | 'ringing' | 'connected' | 'completed' | 'failed'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [_activeCall, setActiveCall] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (initialPhone) setPhoneNumber(initialPhone);
  }, [initialPhone]);

  useEffect(() => {
    if (!open) {
      setCallingState('idle');
      setErrorMessage(null);
      return;
    }

    async function loadAgents() {
      setLoadingAgents(true);
      try {
        const res = await fetch('/api/voice/agents');
        if (res.ok) {
          const json = await res.json();
          const activeList = (json.agents || []).filter(
            (a: CallingAgentItem) => a.status === 'active'
          );
          setAgents(activeList);
          if (activeList.length > 0 && !selectedAgentId) {
            setSelectedAgentId(activeList[0].id);
          }
        }
      } catch {
        toast.error('Could not load calling agents');
      } finally {
        setLoadingAgents(false);
      }
    }

    loadAgents();
  }, [open, selectedAgentId]);

  async function handleStartCall() {
    if (!phoneNumber || phoneNumber.replace(/[^0-9]/g, '').length < 8) {
      toast.error('Please enter a valid phone number with country code');
      return;
    }

    setCallingState('initiating');
    setErrorMessage(null);

    const idempotencyKey = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      setCallingState('calling');
      const response = await fetch('/api/voice/outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          toNumber: phoneNumber.trim(),
          contactId: contactId || undefined,
          leadId: leadId || undefined,
          agentId: selectedAgentId || undefined,
          provider: selectedAgent?.tts_provider || 'sarvam',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Outbound call failed');
      }

      setCallingState('ringing');
      setActiveCall(data.call || null);
      if (onCallInitiated) onCallInitiated(data.call);

      toast.success('Call placed! Customer phone is ringing.');

      // Simulate live status progression
      setTimeout(() => {
        setCallingState((prev) => (prev === 'ringing' ? 'connected' : prev));
      }, 4000);
    } catch (err: unknown) {
      setCallingState('failed');
      const msg = err instanceof Error ? err.message : 'Call initiation failed';
      setErrorMessage(msg);
      toast.error(msg);
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <PhoneCall className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Call Customer
              </DialogTitle>
              <DialogDescription className="text-xs">
                Initiate a real phone call with an AI Calling Agent.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {callingState === 'idle' ? (
          <div className="space-y-4 py-2">
            {initialName && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Recipient
                </span>
                <p className="text-sm font-semibold text-foreground">
                  {initialName}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="call-phone" className="text-xs font-semibold">
                Customer Phone Number
              </Label>
              <Input
                id="call-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Include country code (e.g. +91 for India, +1 for US).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Select AI Calling Agent
              </Label>
              {loadingAgents ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading agents...
                </div>
              ) : agents.length === 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                  No active Calling Agents found. Configure one under Calling → Calling Agents.
                </div>
              ) : (
                <Select
                  value={selectedAgentId}
                  onValueChange={(val) => {
                    if (val) setSelectedAgentId(val);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{agent.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            ({agent.language})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedAgent && (
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3 text-xs">
                <div>
                  <span className="font-medium text-foreground">
                    {selectedAgent.name}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    STT: {selectedAgent.stt_provider} • TTS: {selectedAgent.tts_provider}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  {selectedAgent.language}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span>
                Calls are authenticated, recorded (if enabled), and automatically analyzed for CRM lead collection.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
            {callingState === 'calling' || callingState === 'initiating' ? (
              <>
                <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Loader2 className="size-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Connecting to Telephony Provider...
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Dialing {phoneNumber}
                  </p>
                </div>
              </>
            ) : callingState === 'ringing' ? (
              <>
                <div className="relative flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 animate-pulse">
                  <PhoneCall className="size-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Customer&apos;s Phone is Ringing
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Waiting for answer at {phoneNumber}
                  </p>
                </div>
              </>
            ) : callingState === 'connected' ? (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Sparkles className="size-8 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Call Connected & Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI Agent is speaking with the customer. Transcript and lead data will appear in CRM timeline on completion.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                  <AlertCircle className="size-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Call Failed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {errorMessage || 'Unable to complete the call.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {callingState === 'idle' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleStartCall}
                disabled={loadingAgents || agents.length === 0 || !phoneNumber}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <PhoneCall className="size-3.5" />
                Start Real Call
              </Button>
            </>
          ) : callingState === 'failed' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCallingState('idle')}
              >
                Try Again
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Done (Monitor in Calls)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
