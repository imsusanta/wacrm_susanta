'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Plus,
  Play,
  PhoneForwarded,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallingNav } from '@/components/calling/calling-nav';
import { AgentEditorModal, type CallingAgentData } from '@/components/calling/agent-editor-modal';
import { TestAgentModal } from '@/components/calling/test-agent-modal';
import { CallCustomerModal } from '@/components/calling/call-customer-modal';
import { toast } from 'sonner';

interface AgentItem extends CallingAgentData {
  id: string;
  callsToday?: number;
  totalCalls?: number;
  lastCallAt?: string | null;
  created_at?: string;
}

export default function CallingAgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedAgentForEdit, setSelectedAgentForEdit] = useState<AgentItem | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedAgentForTest, setSelectedAgentForTest] = useState<AgentItem | null>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/voice/agents');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch agents');
      setAgents(data.agents || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching agents';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleToggleStatus = async (agent: AgentItem) => {
    const newStatus = agent.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/voice/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Agent ${agent.name} set to ${newStatus}`);
      fetchAgents();
    } catch {
      toast.error('Could not update agent status');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this calling agent?')) {
      return;
    }
    try {
      setDeletingId(agentId);
      const res = await fetch(`/api/voice/agents/${agentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete agent');
      toast.success('Agent removed successfully');
      fetchAgents();
    } catch {
      toast.error('Failed to delete agent');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(search.toLowerCase())) ||
      a.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-primary" />
            Calling Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage specialized AI voice personas for customer support, admissions, lead generation, and follow-ups.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setSelectedAgentForEdit(null);
            setEditorOpen(true);
          }}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Calling Agent
        </Button>
      </div>

      <CallingNav />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAgents}
            className="h-9 gap-1 text-xs text-muted-foreground"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-xl border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="p-12 rounded-xl border border-dashed text-center space-y-3 bg-muted/10">
          <Bot className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <div className="space-y-1">
            <div className="font-semibold text-base">No Calling Agents Found</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? 'No agents matched your search query. Try clearing filters.'
                : 'Create your first voice agent persona with customized greeting, knowledge base rules, and regional language support.'}
            </p>
          </div>
          {!search && (
            <Button
              size="sm"
              onClick={() => {
                setSelectedAgentForEdit(null);
                setEditorOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Agent
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader className="p-5 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={agent.status === 'active' ? 'default' : 'secondary'}
                      className="text-[10px] capitalize cursor-pointer"
                      onClick={() => handleToggleStatus(agent)}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          agent.status === 'active' ? 'bg-emerald-400' : 'bg-muted-foreground'
                        }`}
                      />
                      {agent.status}
                    </Badge>

                    {agent.knowledge_base_enabled && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/5 gap-1">
                        <ShieldCheck className="w-3 h-3" /> Grounded
                      </Badge>
                    )}
                  </div>

                  <span className="text-[11px] font-mono uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    {agent.language}
                  </span>
                </div>

                <div>
                  <CardTitle className="text-lg font-bold truncate">
                    {agent.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
                    {agent.description || 'Voice AI representative'}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Voice & Specs */}
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/25 border text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Voice Model</span>
                    <span className="font-semibold text-foreground capitalize">
                      {agent.voice_id} ({agent.tts_provider})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Speech Engine</span>
                    <span className="font-medium text-foreground capitalize">
                      STT: {agent.stt_provider}
                    </span>
                  </div>
                  {agent.phone_number && (
                    <div className="flex items-center justify-between text-muted-foreground pt-1 border-t">
                      <span>Assigned Phone</span>
                      <span className="font-mono text-foreground font-medium">
                        {agent.phone_number}
                      </span>
                    </div>
                  )}
                </div>

                {/* Call Metrics */}
                <div className="grid grid-cols-2 gap-2 text-center py-1">
                  <div className="p-2 rounded bg-muted/15 border">
                    <span className="text-[10px] text-muted-foreground block">Today&apos;s Calls</span>
                    <span className="text-sm font-bold text-foreground">{agent.callsToday ?? 0}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/15 border">
                    <span className="text-[10px] text-muted-foreground block">Total Volume</span>
                    <span className="text-sm font-bold text-foreground">{agent.totalCalls ?? 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1"
                    onClick={() => {
                      setSelectedAgentForTest(agent);
                      setTestModalOpen(true);
                    }}
                  >
                    <Play className="w-3 h-3 text-primary" /> Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1"
                    onClick={() => setCallModalOpen(true)}
                  >
                    <PhoneForwarded className="w-3 h-3 text-emerald-600" /> Call
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => {
                      setSelectedAgentForEdit(agent);
                      setEditorOpen(true);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === agent.id}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteAgent(agent.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <AgentEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agent={selectedAgentForEdit}
        onSaved={fetchAgents}
      />

      <TestAgentModal
        open={testModalOpen}
        onOpenChange={setTestModalOpen}
        agent={selectedAgentForTest}
      />

      <CallCustomerModal
        open={callModalOpen}
        onOpenChange={setCallModalOpen}
        onCallInitiated={fetchAgents}
      />
    </div>
  );
}
