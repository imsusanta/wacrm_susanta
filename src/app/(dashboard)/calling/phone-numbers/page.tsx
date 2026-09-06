'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  Plus,
  Bot,
  ShieldCheck,
  PhoneIncoming,
  PhoneOutgoing,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CallingNav } from '@/components/calling/calling-nav';
import { toast } from 'sonner';

interface PhoneNumberItem {
  id: string;
  phone_number: string;
  provider: string;
  provider_phone_number_id?: string;
  assigned_agent_id?: string;
  inbound_enabled: boolean;
  outbound_enabled: boolean;
  status: string;
  created_at: string;
  calling_agents?: { id: string; name: string } | null;
}

interface AgentOption {
  id: string;
  name: string;
}

export default function PhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumberItem[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [provider, setProvider] = useState('elevenlabs');
  const [assignedAgentId, setAssignedAgentId] = useState<string>('none');
  const [inboundEnabled, setInboundEnabled] = useState(true);
  const [outboundEnabled, setOutboundEnabled] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [phonesRes, agentsRes] = await Promise.all([
        fetch('/api/voice/phone-numbers'),
        fetch('/api/voice/agents'),
      ]);

      if (phonesRes.ok) {
        const data = await phonesRes.json();
        setPhoneNumbers(data.phoneNumbers || []);
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch phone numbers';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddNumber = async () => {
    if (!phoneInput.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/voice/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneInput.trim(),
          provider,
          assigned_agent_id: assignedAgentId === 'none' ? null : assignedAgentId,
          inbound_enabled: inboundEnabled,
          outbound_enabled: outboundEnabled,
          status: 'active',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add phone number');

      toast.success('Phone number configured successfully');
      setAddModalOpen(false);
      setPhoneInput('');
      setAssignedAgentId('none');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding phone number';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Phone className="w-7 h-7 text-primary" />
            Phone Numbers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage inbound and outbound telephony routes and assign dedicated AI calling agents.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setAddModalOpen(true)}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Phone Number
        </Button>
      </div>

      <CallingNav />

      {/* Overview Info Banner */}
      <div className="p-4 rounded-xl border bg-card/60 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground text-sm">
            Telephony & SIP Trunking
          </div>
          <p>
            Outbound calls use configured carrier SIP trunks and verified caller IDs. Inbound calls are immediately answered by the assigned AI Calling Agent.
          </p>
        </div>
      </div>

      {/* Phone Numbers Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs">Phone Number</TableHead>
              <TableHead className="text-xs">Carrier / Provider</TableHead>
              <TableHead className="text-xs">Capabilities</TableHead>
              <TableHead className="text-xs">Assigned Agent</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Configured At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                  Loading phone numbers...
                </TableCell>
              </TableRow>
            ) : phoneNumbers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                  No phone numbers registered yet. Click &quot;Add Phone Number&quot; to configure your first inbound or outbound line.
                </TableCell>
              </TableRow>
            ) : (
              phoneNumbers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {p.phone_number}
                  </TableCell>
                  <TableCell className="text-xs capitalize font-medium">
                    {p.provider}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                      {p.inbound_enabled && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0 text-blue-600 bg-blue-50/50 border-blue-200">
                          <PhoneIncoming className="w-2.5 h-2.5" /> Inbound
                        </Badge>
                      )}
                      {p.outbound_enabled && (
                        <Badge variant="outline" className="text-[10px] gap-1 py-0 text-emerald-600 bg-emerald-50/50 border-emerald-200">
                          <PhoneOutgoing className="w-2.5 h-2.5" /> Outbound
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.calling_agents?.name ? (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Bot className="w-3.5 h-3.5 text-primary" /> {p.calling_agents.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === 'active' ? 'default' : 'secondary'}
                      className="text-[10px] capitalize font-normal"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Number Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Configure Phone Number
            </DialogTitle>
            <DialogDescription>
              Add a phone number to bind with an AI Calling Agent for inbound and outbound calls.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pn-input">Phone Number (E.164 Format) <span className="text-destructive">*</span></Label>
              <Input
                id="pn-input"
                placeholder="+919876543210"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(val) => setProvider(val || 'elevenlabs')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs">ElevenLabs SIP Trunking</SelectItem>
                  <SelectItem value="twilio">Twilio Voice</SelectItem>
                  <SelectItem value="custom_sip">Custom SIP Gateway</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned Calling Agent</Label>
              <Select value={assignedAgentId} onValueChange={(val) => setAssignedAgentId(val || 'none')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Route dynamically)</SelectItem>
                  {agents.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label htmlFor="inbound-toggle" className="text-xs">Enable Inbound Calls</Label>
                <Switch id="inbound-toggle" checked={inboundEnabled} onCheckedChange={setInboundEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="outbound-toggle" className="text-xs">Enable Outbound Calls</Label>
                <Switch id="outbound-toggle" checked={outboundEnabled} onCheckedChange={setOutboundEnabled} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAddNumber} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save Number
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
