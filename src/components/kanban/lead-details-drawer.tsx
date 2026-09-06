'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Phone,
  Calendar,
  UserCheck,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  AlertCircle,
  PauseCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { LeadStageType } from '@/core/types';
import { useCan } from '@/hooks/use-can';
import { salesApi } from '@/lib/sales/api-client';
import { CallCustomerModal } from '@/components/calling/call-customer-modal';

interface LeadDetailsDrawerProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStageChange: (leadId: string, newStage: LeadStageType) => Promise<boolean>;
}

interface HydratedLeadDetails {
  lead: {
    id: string;
    title: string;
    stage: LeadStageType;
    value?: number;
    notes?: string;
    created_at: string;
    ai_lead_score?: string;
    ai_buying_intent?: string;
    ai_next_action?: string;
    ai_product_service?: string;
    ai_summary?: string;
    ai_score_numeric?: number | null;
    source?: string | null;
    channel?: string | null;
    service?: string | null;
    followup_status?: string | null;
    last_customer_reply_at?: string | null;
    next_follow_up_at?: string | null;
    reminder_count?: number | null;
    followup_stopped_reason?: string | null;
    contact?: {
      id: string;
      name?: string;
      phone: string;
      email?: string;
      address?: string;
    };
    assignee?: {
      full_name: string;
    };
  };
  consents: Array<{
    channel: string;
    status: 'opted_in' | 'opted_out' | 'pending';
    granted_at?: string;
  }>;
  appointments: Array<{
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    booking_source?: string;
  }>;
  stageHistory: Array<{
    id: string;
    previous_stage: string;
    next_stage: string;
    reason?: string;
    created_at: string;
    actor_type: string;
  }>;
  notes: Array<{
    id: string;
    note_text: string;
    created_at: string;
    author?: { full_name: string };
  }>;
  calls: Array<{
    id: string;
    provider: string;
    direction: string;
    status: string;
    duration_seconds?: number;
    summary?: string;
    transcript?: string;
    started_at: string;
  }>;
  messages: Array<{
    id: string;
    sender_type: string;
    content_type: string;
    content_text?: string;
    status: string;
    created_at: string;
  }>;
  followups: Array<{
    id: string;
    status: string;
    title?: string;
    due_at?: string;
    enrolled_at?: string;
    sequence?: { name: string };
  }>;
  leadFollowups?: Array<{
    id: string;
    status: string;
    followup_type?: string;
    scheduled_at?: string;
    sent_at?: string | null;
    cancelled_reason?: string | null;
  }>;
  role: string;
}

function formatFollowupStatus(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'waiting_for_reply':
      return 'Waiting for reply';
    case 'reminder_sent':
      return 'Reminder sent';
    case 'stopped':
      return 'Stopped';
    case 'human_takeover':
      return 'Human takeover';
    default:
      return 'No follow-up';
  }
}

const STAGES: { id: LeadStageType; label: string }[] = [
  { id: 'NEW', label: 'New Lead' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'QUALIFYING', label: 'Qualifying' },
  { id: 'QUALIFIED', label: 'Qualified' },
  { id: 'APPOINTMENT_OFFERED', label: 'Appointment Offered' },
  { id: 'BOOKED', label: 'Booked' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'FOLLOW_UP', label: 'Follow-up' },
  { id: 'ATTENDED', label: 'Attended' },
  { id: 'CONVERTED', label: 'Converted' },
  { id: 'LOST', label: 'Lost' },
];

export function LeadDetailsDrawer({
  leadId,
  open,
  onOpenChange,
  onStageChange,
}: LeadDetailsDrawerProps) {
  const canSendMessages = useCan('send-messages');
  const [details, setDetails] = useState<HydratedLeadDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [converting, setConverting] = useState(false);
  const [callCustomerModalOpen, setCallCustomerModalOpen] = useState(false);

  const loadDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await salesApi<HydratedLeadDetails>(
        `/api/leads/${id}/details`
      );
      setDetails(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Error loading lead details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && leadId) {
      loadDetails(leadId);
    } else {
      setDetails(null);
      setError(null);
    }
  }, [open, leadId, loadDetails]);

  const handleStageSelect = async (newStage: LeadStageType) => {
    if (!leadId || updatingStage) return;
    setUpdatingStage(true);
    const ok = await onStageChange(leadId, newStage);
    if (ok) {
      loadDetails(leadId);
    }
    setUpdatingStage(false);
  };

  const handleAddNote = async () => {
    if (!leadId || !newNoteText.trim() || savingNote) return;
    setSavingNote(true);
    try {
      await salesApi(`/api/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note_text: newNoteText.trim() }),
      });
      toast.success('Note added');
      setNewNoteText('');
      loadDetails(leadId);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!leadId || converting) return;
    setConverting(true);
    try {
      await salesApi(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        body: JSON.stringify({ createDeal: true }),
      });
      toast.success('Lead converted to Customer & Deal successfully!');
      loadDetails(leadId);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  const handleHumanHandoff = async () => {
    if (!leadId || !details?.lead?.id) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/handoff`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(
          'Human takeover activated. AI automated responses paused.'
        );
      } else {
        toast.error(json.error || 'Failed to activate human takeover.');
      }
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || 'Network error activating human takeover.'
      );
    }
  };

  const isOptedOut =
    details?.consents?.some((c) => c.status === 'opted_out') ?? false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-card border-border flex w-full flex-col border-l p-0 sm:max-w-xl"
      >
        {loading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <div className="space-y-3 p-8 text-center">
            <AlertCircle className="text-destructive mx-auto h-10 w-10" />
            <h3 className="text-foreground text-base font-semibold">
              Error Loading Lead
            </h3>
            <p className="text-muted-foreground text-xs">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => leadId && loadDetails(leadId)}
            >
              Retry
            </Button>
          </div>
        ) : details ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* 1. Header */}
            <SheetHeader className="bg-muted/20 border-border space-y-2 border-b p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-foreground text-lg font-bold">
                    {details.lead.contact?.name ||
                      details.lead.title ||
                      'Patient Inquiry'}
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground text-xs">
                    {details.lead.contact?.phone || 'No phone provided'} •
                    Service:{' '}
                    {details.lead.ai_product_service || details.lead.title}
                  </SheetDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-primary/10 border-primary/20 text-primary text-xs font-bold uppercase"
                >
                  {details.lead.stage}
                </Badge>
              </div>

              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {details.lead.ai_lead_score && (
                  <Badge
                    variant="secondary"
                    className="text-[11px] font-medium"
                  >
                    Score:{' '}
                    {details.lead.ai_score_numeric != null
                      ? `${details.lead.ai_score_numeric} · `
                      : ''}
                    {details.lead.ai_lead_score}
                  </Badge>
                )}
                {details.lead.followup_status &&
                  details.lead.followup_status !== 'none' && (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-medium"
                    >
                      Follow-up:{' '}
                      {formatFollowupStatus(details.lead.followup_status)}
                    </Badge>
                  )}
                {details.lead.assignee && (
                  <Badge variant="outline" className="text-[11px] font-medium">
                    Owner: {details.lead.assignee.full_name}
                  </Badge>
                )}
                {isOptedOut ? (
                  <Badge variant="destructive" className="gap-1 text-[11px]">
                    <ShieldAlert className="h-3 w-3" /> Opted Out
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-400"
                  >
                    <ShieldCheck className="h-3 w-3" /> Consent Verified
                  </Badge>
                )}
              </div>
            </SheetHeader>

            {/* 2. Quick Actions Bar */}
            <TooltipProvider>
              <div className="bg-muted/10 border-border flex flex-wrap items-center gap-2 border-b p-3">
                {/* Send WhatsApp */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canSendMessages || isOptedOut}
                        onClick={() =>
                          toast.info('Opening WhatsApp messaging thread...')
                        }
                        className="h-8 gap-1 text-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                        WhatsApp
                      </Button>
                    }
                  />
                  {(!canSendMessages || isOptedOut) && (
                    <TooltipContent>
                      {isOptedOut
                        ? 'Patient has opted out of messages.'
                        : 'Insufficient role permissions.'}
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Send SMS */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canSendMessages || isOptedOut}
                        onClick={() => toast.info('Opening SMS composer...')}
                        className="h-8 gap-1 text-xs"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                        SMS
                      </Button>
                    }
                  />
                  {(!canSendMessages || isOptedOut) && (
                    <TooltipContent>
                      {isOptedOut
                        ? 'Patient has opted out of messages.'
                        : 'Insufficient role permissions.'}
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Schedule Voice Call */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canSendMessages || isOptedOut}
                        onClick={() => setCallCustomerModalOpen(true)}
                        className="h-8 gap-1 text-xs"
                      >
                        <Phone className="h-3.5 w-3.5 text-purple-500" />
                        Call
                      </Button>
                    }
                  />
                  {(!canSendMessages || isOptedOut) && (
                    <TooltipContent>
                      {isOptedOut
                        ? 'Patient has opted out of calls.'
                        : 'Insufficient role permissions.'}
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Human Takeover */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleHumanHandoff}
                  className="h-8 gap-1 text-xs"
                >
                  <PauseCircle className="h-3.5 w-3.5 text-amber-500" />
                  Pause AI
                </Button>

                {/* Convert to Customer & Deal */}
                <Button
                  variant="default"
                  size="sm"
                  disabled={converting || details.lead.stage === 'CONVERTED'}
                  onClick={handleConvertToCustomer}
                  className="h-8 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  {details.lead.stage === 'CONVERTED'
                    ? 'Converted'
                    : 'Convert to Customer'}
                </Button>

                {/* Change Stage Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingStage}
                        className="ml-auto h-8 gap-1 text-xs"
                      >
                        Change Stage
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-48 text-xs">
                    {STAGES.map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => handleStageSelect(s.id)}
                      >
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipProvider>

            {/* 3. Main Content Tabs */}
            <Tabs
              defaultValue="overview"
              className="flex flex-1 flex-col overflow-hidden"
            >
              <TabsList className="border-border h-11 justify-start gap-4 border-b bg-transparent px-4 pt-2">
                <TabsTrigger value="overview" className="text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">
                  Notes ({details.notes.length})
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">
                  Timeline ({details.stageHistory.length})
                </TabsTrigger>
                <TabsTrigger value="conversations" className="text-xs">
                  Messages ({details.messages.length})
                </TabsTrigger>
                <TabsTrigger value="followups" className="text-xs">
                  Follow-ups
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-5">
                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="m-0 space-y-5">
                  <div className="bg-muted/30 border-border space-y-3 rounded-xl border p-4">
                    <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                      <UserCheck className="text-primary h-3.5 w-3.5" /> Contact
                      Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Full Name
                        </span>
                        <span className="text-foreground font-medium">
                          {details.lead.contact?.name || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Phone Number
                        </span>
                        <span className="text-foreground font-medium">
                          {details.lead.contact?.phone || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Email
                        </span>
                        <span className="text-foreground font-medium">
                          {details.lead.contact?.email || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Address
                        </span>
                        <span className="text-foreground font-medium">
                          {details.lead.contact?.address || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service & AI Insights */}
                  <div className="bg-muted/30 border-border space-y-3 rounded-xl border p-4">
                    <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                      <FileText className="text-primary h-3.5 w-3.5" /> Service
                      & Qualification
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Requested Service
                        </span>
                        <span className="text-foreground font-medium">
                          {details.lead.ai_product_service ||
                            details.lead.title}
                        </span>
                      </div>
                      {details.lead.ai_buying_intent && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Intent / Urgency
                          </span>
                          <span className="text-foreground font-medium">
                            {details.lead.ai_buying_intent}
                          </span>
                        </div>
                      )}
                      {details.lead.source && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Source
                          </span>
                          <span className="text-foreground font-medium capitalize">
                            {details.lead.source}
                            {details.lead.channel
                              ? ` · ${details.lead.channel}`
                              : ''}
                          </span>
                        </div>
                      )}
                      {details.lead.ai_summary && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            AI Summary
                          </span>
                          <span className="text-foreground font-medium">
                            {details.lead.ai_summary}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          Follow-up Status
                        </span>
                        <span className="text-foreground font-medium">
                          {formatFollowupStatus(
                            details.lead.followup_status || 'none'
                          )}
                        </span>
                      </div>
                      {details.lead.last_customer_reply_at && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Last Customer Reply
                          </span>
                          <span className="text-foreground font-medium">
                            {new Date(
                              details.lead.last_customer_reply_at
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {details.lead.next_follow_up_at && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Next Follow-up
                          </span>
                          <span className="text-foreground font-medium">
                            {new Date(
                              details.lead.next_follow_up_at
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {details.lead.ai_next_action && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">
                            Suggested Next Action
                          </span>
                          <span className="text-foreground font-medium">
                            {details.lead.ai_next_action}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appointments Summary */}
                  <div className="bg-muted/30 border-border space-y-3 rounded-xl border p-4">
                    <h4 className="text-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                      <Calendar className="text-primary h-3.5 w-3.5" />{' '}
                      Appointments ({details.appointments.length})
                    </h4>
                    {details.appointments.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No appointments booked yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {details.appointments.map((appt) => (
                          <div
                            key={appt.id}
                            className="border-border/50 flex items-center justify-between border-b pb-2 text-xs"
                          >
                            <div>
                              <span className="text-foreground font-semibold">
                                {appt.appointment_date} at{' '}
                                {appt.appointment_time}
                              </span>
                              <span className="text-muted-foreground block text-[10px]">
                                Source: {appt.booking_source || 'Direct AI'}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {appt.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* NOTES TAB */}
                <TabsContent value="notes" className="m-0 space-y-4">
                  <div className="space-y-2">
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add an internal note about this lead..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={!newNoteText.trim() || savingNote}
                        onClick={handleAddNote}
                        className="h-8 text-xs"
                      >
                        {savingNote ? 'Adding...' : 'Add Note'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {details.notes.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No notes added yet.
                      </p>
                    ) : (
                      details.notes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-muted/30 border-border space-y-1.5 rounded-xl border p-3 text-xs"
                        >
                          <p className="text-foreground whitespace-pre-wrap">
                            {note.note_text}
                          </p>
                          <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                            <span>
                              {note.author?.full_name || 'Team Member'}
                            </span>
                            <span>
                              {new Date(note.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* TIMELINE TAB */}
                <TabsContent value="timeline" className="m-0 space-y-4">
                  {details.stageHistory.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No stage transitions recorded yet.
                    </p>
                  ) : (
                    <div className="border-border relative ml-3 space-y-4 border-l-2 pl-4">
                      {details.stageHistory.map((hist) => (
                        <div
                          key={hist.id}
                          className="relative space-y-1 text-xs"
                        >
                          <span className="bg-primary ring-background absolute top-1 -left-[21px] h-2.5 w-2.5 rounded-full ring-4" />
                          <div className="text-foreground font-semibold">
                            Moved to{' '}
                            <span className="text-primary">
                              {hist.next_stage}
                            </span>{' '}
                            from {hist.previous_stage}
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                            <span>Actor: {hist.actor_type}</span> •{' '}
                            <span>
                              {new Date(hist.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* MESSAGES TAB */}
                <TabsContent value="conversations" className="m-0 space-y-3">
                  {details.messages.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No messages found for this lead.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {details.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`space-y-1 rounded-lg border p-3 text-xs ${
                            msg.sender_type === 'customer'
                              ? 'bg-muted/40 border-border text-foreground mr-8'
                              : 'bg-primary/10 border-primary/20 text-foreground ml-8'
                          }`}
                        >
                          <div className="text-muted-foreground flex items-center justify-between text-[10px]">
                            <span className="font-bold capitalize">
                              {msg.sender_type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p>{msg.content_text || '[Media Attachment]'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* FOLLOW-UPS TAB */}
                <TabsContent value="followups" className="m-0 space-y-4">
                  <div className="bg-muted/30 border-border space-y-3 rounded-xl border p-4">
                    <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                      Smart reminders ({(details.leadFollowups || []).length})
                    </h4>
                    {(details.leadFollowups || []).length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No scheduled WhatsApp reminders. At most one reminder is
                        sent within 7 days if the customer does not reply.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(details.leadFollowups || []).map((job) => (
                          <div
                            key={job.id}
                            className="border-border/50 flex items-center justify-between border-b pb-2 text-xs"
                          >
                            <div>
                              <span className="text-foreground font-semibold capitalize">
                                {job.followup_type || 'reminder'}
                              </span>
                              <span className="text-muted-foreground block text-[10px]">
                                {job.sent_at
                                  ? `Sent ${new Date(job.sent_at).toLocaleString()}`
                                  : job.scheduled_at
                                    ? `Scheduled ${new Date(job.scheduled_at).toLocaleString()}`
                                    : 'Pending'}
                                {job.cancelled_reason
                                  ? ` · ${job.cancelled_reason.replace(/_/g, ' ')}`
                                  : ''}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {job.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/30 border-border space-y-3 rounded-xl border p-4">
                    <h4 className="text-foreground text-xs font-bold tracking-wider uppercase">
                      Follow-up Sequences ({details.followups.length})
                    </h4>
                    {details.followups.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No active follow-up sequences enrolled.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {details.followups.map((fol) => (
                          <div
                            key={fol.id}
                            className="border-border/50 flex items-center justify-between border-b pb-2 text-xs"
                          >
                            <div>
                              <span className="text-foreground font-semibold">
                                {fol.sequence?.name || 'Automated Nurture'}
                              </span>
                              <span className="text-muted-foreground block text-[10px]">
                                Enrolled:{' '}
                                {fol.enrolled_at
                                  ? new Date(
                                      fol.enrolled_at
                                    ).toLocaleDateString()
                                  : 'Active'}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {fol.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
      <CallCustomerModal
        open={callCustomerModalOpen}
        onOpenChange={setCallCustomerModalOpen}
        leadId={details?.lead.id}
        contactId={details?.lead.contact?.id}
        initialName={details?.lead.contact?.name || details?.lead.title || ''}
        initialPhone={details?.lead.contact?.phone || ''}
        onCallInitiated={() => {
          if (leadId) loadDetails(leadId);
        }}
      />
    </Sheet>
  );
}
