'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  RefreshCw,
  PhoneIncoming,
  PhoneOutgoing,
  Eye,
  PhoneForwarded,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CallingNav } from '@/components/calling/calling-nav';
import { CallDetailsModal } from '@/components/calling/call-details-modal';
import { CallCustomerModal } from '@/components/calling/call-customer-modal';
import { toast } from 'sonner';

interface CallItem {
  id: string;
  account_id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  from_phone?: string;
  to_phone?: string;
  duration_seconds?: number;
  summary?: string;
  intent?: string;
  lead_score?: number;
  cost?: number;
  created_at: string;
  contacts?: { id: string; name: string; phone: string } | null;
  leads?: { id: string; name: string; stage: string } | null;
  calling_agents?: { id: string; name: string } | null;
}

interface AgentOption {
  id: string;
  name: string;
}

export default function CallsHistoryPage() {
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentOption[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modals
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [outboundModalOpen, setOutboundModalOpen] = useState(false);

  // Fetch agents for filter dropdown
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/voice/agents');
        const data = await res.json();
        if (res.ok && data.agents) {
          setAgents(data.agents);
        }
      } catch {
        // graceful
      }
    }
    loadAgents();
  }, []);

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String((page - 1) * limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (directionFilter !== 'all') params.set('direction', directionFilter);
      if (agentFilter !== 'all') params.set('agentId', agentFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/voice/calls?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch calls');
      setCalls(data.calls || []);
      setTotalCount(data.total || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching calls';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, directionFilter, agentFilter, search]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const handleOpenDetails = (id: string) => {
    setSelectedCallId(id);
    setDetailsModalOpen(true);
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <History className="w-7 h-7 text-primary" />
            Calls History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete audit trail of all AI telephony conversations, extracted insights, and lead scores.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setOutboundModalOpen(true)}
          className="gap-1.5 self-start sm:self-auto"
        >
          <PhoneForwarded className="w-4 h-4" />
          Make Phone Call
        </Button>
      </div>

      <CallingNav />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border bg-card/60 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search by customer phone, name, or keywords..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <Select
              value={directionFilter}
              onValueChange={(val) => {
                setDirectionFilter(val || 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[120px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val || 'all');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[125px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="busy">Busy / Unanswered</SelectItem>
              </SelectContent>
            </Select>

            {agents.length > 0 && (
              <Select
                value={agentFilter}
                onValueChange={(val) => {
                  setAgentFilter(val || 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="Calling Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchCalls}
              className="h-9 gap-1 text-xs text-muted-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs">Date / Time</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Direction</TableHead>
              <TableHead className="text-xs">Agent</TableHead>
              <TableHead className="text-xs">Duration</TableHead>
              <TableHead className="text-xs">Intent</TableHead>
              <TableHead className="text-xs">Lead Score</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                  Loading call history...
                </TableCell>
              </TableRow>
            ) : calls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground text-xs">
                  No call records found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              calls.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleOpenDetails(c.id)}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    <div>{new Date(c.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px]">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </TableCell>
                  <TableCell className="font-medium text-xs">
                    <div>{c.contacts?.name || c.to_phone || c.from_phone || 'Unknown'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {c.to_phone || c.from_phone || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-1">
                      {c.direction === 'inbound' ? (
                        <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span className="capitalize">{c.direction}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.calling_agents?.name || 'Default Agent'}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {formatDuration(c.duration_seconds)}
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {c.intent ? c.intent.replace(/_/g, ' ') : '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.lead_score !== undefined && c.lead_score !== null ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          c.lead_score >= 70
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : c.lead_score >= 40
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}
                      >
                        {c.lead_score}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === 'completed'
                          ? 'default'
                          : c.status === 'failed' || c.status === 'busy'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-[10px] capitalize font-normal"
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-muted-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetails(c.id);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <div>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} calls
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <span className="text-xs font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CallDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        callId={selectedCallId}
      />

      <CallCustomerModal
        open={outboundModalOpen}
        onOpenChange={setOutboundModalOpen}
        onCallInitiated={fetchCalls}
      />
    </div>
  );
}
