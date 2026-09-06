'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  Bot,
  Sparkles,
  PhoneForwarded,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Play,
  Volume2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CallingNav } from '@/components/calling/calling-nav';
import { CallCustomerModal } from '@/components/calling/call-customer-modal';
import { TestAgentModal } from '@/components/calling/test-agent-modal';
import { AgentEditorModal, type CallingAgentData } from '@/components/calling/agent-editor-modal';
import { CallDetailsModal } from '@/components/calling/call-details-modal';
import { toast } from 'sonner';

interface DashboardMetrics {
  totalCalls: number;
  callsToday: number;
  avgDurationSeconds: number;
  avgLeadScore: number;
  answerRate: number;
}

interface CallRow {
  id: string;
  direction: 'inbound' | 'outbound';
  status: string;
  from_phone?: string;
  to_phone?: string;
  duration_seconds?: number;
  intent?: string;
  lead_score?: number;
  created_at: string;
  contacts?: { id: string; name: string; phone: string } | null;
  calling_agents?: { id: string; name: string } | null;
}

interface AgentItem extends CallingAgentData {
  id: string;
  callsToday?: number;
  totalCalls?: number;
  lastCallAt?: string | null;
}

export default function CallingOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCalls: 0,
    callsToday: 0,
    avgDurationSeconds: 0,
    avgLeadScore: 0,
    answerRate: 0,
  });
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallRow[]>([]);
  const [settingsStatus, setSettingsStatus] = useState<{
    sarvamConfigured: boolean;
    elevenlabsConfigured: boolean;
  }>({ sarvamConfigured: false, elevenlabsConfigured: false });

  // Modals state
  const [outboundModalOpen, setOutboundModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedAgentForTest, setSelectedAgentForTest] = useState<{ id: string; name: string } | null>(null);
  const [agentEditorOpen, setAgentEditorOpen] = useState(false);
  const [selectedAgentForEdit, setSelectedAgentForEdit] = useState<AgentItem | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [callsRes, agentsRes, settingsRes] = await Promise.all([
        fetch('/api/voice/calls?limit=10'),
        fetch('/api/voice/agents'),
        fetch('/api/voice/settings'),
      ]);

      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setRecentCalls(callsData.calls || []);
        if (callsData.stats) {
          setMetrics(callsData.stats);
        }
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettingsStatus({
          sarvamConfigured: Boolean(settingsData.providers?.sarvam?.configured),
          elevenlabsConfigured: Boolean(settingsData.providers?.elevenlabs?.configured),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch voice data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenTestModal = (agent?: { id: string; name: string }) => {
    if (agent) {
      setSelectedAgentForTest(agent);
    } else if (agents.length > 0) {
      setSelectedAgentForTest({ id: agents[0].id, name: agents[0].name });
    } else {
      setSelectedAgentForTest(null);
    }
    setTestModalOpen(true);
  };

  const handleOpenEditModal = (agent: AgentItem) => {
    setSelectedAgentForEdit(agent);
    setAgentEditorOpen(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedAgentForEdit(null);
    setAgentEditorOpen(true);
  };

  const handleOpenDetails = (callId: string) => {
    setSelectedCallId(callId);
    setDetailsModalOpen(true);
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <PhoneCall className="w-7 h-7 text-primary" />
            AI Voice & Calling
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indian multi-lingual voice calling powered by Sarvam AI & ElevenLabs with automatic CRM lead capture.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenTestModal()}
            className="gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-primary" />
            Test Agent Simulator
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setOutboundModalOpen(true)}
            className="gap-1.5"
          >
            <PhoneForwarded className="w-3.5 h-3.5 text-emerald-600" />
            Place Phone Call
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Calling Agent
          </Button>
        </div>
      </div>

      <CallingNav />

      {/* Provider Connectivity Banner */}
      <div className="p-4 rounded-xl border bg-card/60 backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              Voice Provider Infrastructure
              <Badge variant="outline" className="text-[10px] font-normal">
                Multi-Tenant Encrypted
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    settingsStatus.sarvamConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                Sarvam AI ({settingsStatus.sarvamConfigured ? 'Connected' : 'Default Bootstrap'})
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    settingsStatus.elevenlabsConfigured ? 'bg-emerald-500' : 'bg-muted-foreground'
                  }`}
                />
                ElevenLabs ({settingsStatus.elevenlabsConfigured ? 'Active' : 'Optional'})
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/calling/settings"
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1 self-end sm:self-center"
        >
          Manage API Keys <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            Total Calls
            <PhoneCall className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{loading ? '...' : metrics.totalCalls}</div>
          <div className="text-[11px] text-muted-foreground">All time workspace volume</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            Calls Today
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">{loading ? '...' : metrics.callsToday}</div>
          <div className="text-[11px] text-muted-foreground">Active outbound/inbound</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            Answer Rate
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold">{loading ? '...' : `${metrics.answerRate}%`}</div>
          <div className="text-[11px] text-muted-foreground">Completed conversations</div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            Avg Duration
            <Volume2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold">
            {loading ? '...' : formatDuration(metrics.avgDurationSeconds)}
          </div>
          <div className="text-[11px] text-muted-foreground">Per completed call</div>
        </Card>

        <Card className="p-4 space-y-1 col-span-2 lg:col-span-1">
          <div className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            Avg Lead Score
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            {loading ? '...' : metrics.avgLeadScore > 0 ? `${metrics.avgLeadScore}/100` : '—'}
          </div>
          <div className="text-[11px] text-muted-foreground">AI qualification index</div>
        </Card>
      </div>

      {/* Active Calling Agents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Active Calling Agents</h2>
            <p className="text-xs text-muted-foreground">
              Autonomous voice personas with custom knowledge base grounding and CRM actions.
            </p>
          </div>
          <Link
            href="/calling/agents"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            View All ({agents.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed text-center space-y-3 bg-muted/10">
            <Bot className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <div className="space-y-1">
              <div className="font-semibold text-sm">No Calling Agents Created Yet</div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create your first agent to start making automated phone calls with Indian language support and lead qualification.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenCreateModal} className="gap-1.5">
              <Plus className="w-4 h-4" /> Create First Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.slice(0, 3).map((agent) => (
              <Card key={agent.id} className="flex flex-col justify-between hover:shadow-sm transition-shadow">
                <CardHeader className="p-4 pb-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={agent.status === 'active' ? 'default' : 'secondary'}
                      className="text-[10px] capitalize"
                    >
                      {agent.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground uppercase font-mono">
                      {agent.language}
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold truncate mt-1">
                    {agent.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                    {agent.description || 'General voice assistant'}
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y bg-muted/20 rounded px-2.5">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Today&apos;s Calls</span>
                      <span className="font-semibold text-foreground">{agent.callsToday ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Voice & Engine</span>
                      <span className="font-semibold text-foreground capitalize truncate block">
                        {agent.voice_id} ({agent.tts_provider})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1"
                      onClick={() => handleOpenTestModal(agent)}
                    >
                      <Play className="w-3 h-3 text-primary" /> Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1"
                      onClick={() => setOutboundModalOpen(true)}
                    >
                      <PhoneForwarded className="w-3 h-3 text-emerald-600" /> Call
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2.5"
                      onClick={() => handleOpenEditModal(agent)}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Calls Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent Phone Calls</h2>
            <p className="text-xs text-muted-foreground">
              Real-time log of inbound and outbound conversations with automated transcript analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              className="h-8 gap-1 text-xs text-muted-foreground"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
            <Link
              href="/calling/calls"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              All Calls <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    Loading calls...
                  </TableCell>
                </TableRow>
              ) : recentCalls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                    No call records recorded yet. Initiate an outbound call or run a browser test.
                  </TableCell>
                </TableRow>
              ) : (
                recentCalls.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => handleOpenDetails(c.id)}
                  >
                    <TableCell className="font-medium text-xs">
                      <div>{c.contacts?.name || c.to_phone || c.from_phone || 'Unknown'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {c.to_phone || c.from_phone || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs capitalize">
                      <span className="inline-flex items-center gap-1">
                        {c.direction === 'inbound' ? 'Inbound' : 'Outbound'}
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
      </div>

      {/* Modals */}
      <CallCustomerModal
        open={outboundModalOpen}
        onOpenChange={setOutboundModalOpen}
        onCallInitiated={() => {
          fetchData();
        }}
      />

      <TestAgentModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        agent={
          selectedAgentForTest
            ? {
                id: selectedAgentForTest.id,
                name: selectedAgentForTest.name,
                language: 'en-IN',
                stt_provider: 'sarvam',
                tts_provider: 'sarvam',
              }
            : null
        }
      />

      <AgentEditorModal
        open={agentEditorOpen}
        onOpenChange={setAgentEditorOpen}
        agent={selectedAgentForEdit}
        onSaved={() => {
          fetchData();
        }}
      />

      <CallDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        callId={selectedCallId}
      />
    </div>
  );
}
