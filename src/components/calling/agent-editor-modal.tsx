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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Volume2,
  Brain,
  Wrench,
  Loader2,
  Sparkles,
  PhoneForwarded,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export interface CallingAgentData {
  id?: string;
  name: string;
  description?: string | null;
  status: 'active' | 'inactive' | 'draft';
  phone_number?: string | null;
  stt_provider: string;
  tts_provider: string;
  voice_id: string;
  language: string;
  llm_provider: string;
  llm_model: string;
  system_instructions?: string | null;
  greeting?: string | null;
  knowledge_base_enabled: boolean;
  tools_config?: {
    searchKnowledge?: boolean;
    findContact?: boolean;
    createLead?: boolean;
    updateLead?: boolean;
    transferToHuman?: boolean;
    endCall?: boolean;
  };
  transfer_number?: string | null;
  recording_enabled: boolean;
  elevenlabs_agent_id?: string | null;
}

export interface AgentEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: CallingAgentData | null;
  onSaved?: (agent: CallingAgentData) => void;
}

const DEFAULT_GREETING =
  'Namaste! I am calling from Helpa. How may I assist you today?';

const DEFAULT_INSTRUCTIONS =
  'You are Helpa AI, a polite, professional, and knowledgeable voice assistant. Your goal is to understand the customer requirements, answer questions using our verified knowledge base, collect contact/budget details, and schedule follow-ups. Always speak concisely and naturally.';

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi-IN', name: 'Hindi (हिंदी)' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'mr-IN', name: 'Marathi (मराठी)' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
  { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'od-IN', name: 'Odia (ଓଡ଼ିଆ)' },
];

const SARVAM_PRESET_VOICES = [
  { id: 'shubh', name: 'Shubh (Male - Natural Hindi/Indian English)' },
  { id: 'aditi', name: 'Aditi (Female - Professional & Warm)' },
  { id: 'arjun', name: 'Arjun (Male - Conversational)' },
  { id: 'kavya', name: 'Kavya (Female - Expressive)' },
  { id: 'rohan', name: 'Rohan (Male - Formal)' },
  { id: 'diya', name: 'Diya (Female - Clear & Friendly)' },
  { id: 'tanmay', name: 'Tanmay (Male - Deep & Confident)' },
  { id: 'ananya', name: 'Ananya (Female - Engaging)' },
  { id: 'priya', name: 'Priya (Female - Soft & Polite)' },
  { id: 'dhruv', name: 'Dhruv (Male - Energetic)' },
];

const ELEVENLABS_PRESET_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Female - Calm & Professional)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Female - Empathetic)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Female - Soft & Friendly)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Male - Well-rounded)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (Female - Youthful)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Male - Casual & Deep)' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Male - Resonant)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Male - Conversational)' },
];

export function AgentEditorModal({
  open,
  onOpenChange,
  agent,
  onSaved,
}: AgentEditorModalProps) {
  const isEditing = Boolean(agent?.id);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'draft'>('active');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sttProvider, setSttProvider] = useState('sarvam');
  const [ttsProvider, setTtsProvider] = useState('sarvam');
  const [voiceId, setVoiceId] = useState('shubh');
  const [language, setLanguage] = useState('en-IN');
  const [llmProvider, setLlmProvider] = useState('openrouter');
  const [llmModel, setLlmModel] = useState('google/gemini-2.5-flash');
  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [systemInstructions, setSystemInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [knowledgeBaseEnabled, setKnowledgeBaseEnabled] = useState(true);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [transferNumber, setTransferNumber] = useState('');
  const [elevenlabsAgentId, setElevenlabsAgentId] = useState('');

  // Tools Config
  const [tools, setTools] = useState({
    searchKnowledge: true,
    findContact: true,
    createLead: true,
    updateLead: true,
    transferToHuman: true,
    endCall: true,
  });

  // Sync state on open/edit change
  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setDescription(agent.description || '');
      setStatus(agent.status || 'active');
      setPhoneNumber(agent.phone_number || '');
      setSttProvider(agent.stt_provider || 'sarvam');
      setTtsProvider(agent.tts_provider || 'sarvam');
      setVoiceId(agent.voice_id || 'shubh');
      setLanguage(agent.language || 'en-IN');
      setLlmProvider(agent.llm_provider || 'openrouter');
      setLlmModel(agent.llm_model || 'google/gemini-2.5-flash');
      setGreeting(agent.greeting || DEFAULT_GREETING);
      setSystemInstructions(agent.system_instructions || DEFAULT_INSTRUCTIONS);
      setKnowledgeBaseEnabled(agent.knowledge_base_enabled ?? true);
      setRecordingEnabled(agent.recording_enabled ?? false);
      setTransferNumber(agent.transfer_number || '');
      setElevenlabsAgentId(agent.elevenlabs_agent_id || '');
      setTools({
        searchKnowledge: agent.tools_config?.searchKnowledge ?? true,
        findContact: agent.tools_config?.findContact ?? true,
        createLead: agent.tools_config?.createLead ?? true,
        updateLead: agent.tools_config?.updateLead ?? true,
        transferToHuman: agent.tools_config?.transferToHuman ?? true,
        endCall: agent.tools_config?.endCall ?? true,
      });
    } else {
      setName('');
      setDescription('');
      setStatus('active');
      setPhoneNumber('');
      setSttProvider('sarvam');
      setTtsProvider('sarvam');
      setVoiceId('shubh');
      setLanguage('en-IN');
      setLlmProvider('openrouter');
      setLlmModel('google/gemini-2.5-flash');
      setGreeting(DEFAULT_GREETING);
      setSystemInstructions(DEFAULT_INSTRUCTIONS);
      setKnowledgeBaseEnabled(true);
      setRecordingEnabled(false);
      setTransferNumber('');
      setElevenlabsAgentId('');
      setTools({
        searchKnowledge: true,
        findContact: true,
        createLead: true,
        updateLead: true,
        transferToHuman: true,
        endCall: true,
      });
    }
  }, [agent, open]);

  // Adjust default voice if TTS provider changes
  const handleTtsProviderChange = (provider: string) => {
    setTtsProvider(provider);
    if (provider === 'sarvam' && !SARVAM_PRESET_VOICES.some((v) => v.id === voiceId)) {
      setVoiceId('shubh');
    } else if (provider === 'elevenlabs' && !ELEVENLABS_PRESET_VOICES.some((v) => v.id === voiceId)) {
      setVoiceId('21m00Tcm4TlvDq8ikWAM');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Agent name is required');
      setActiveTab('general');
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || null,
        status,
        phone_number: phoneNumber.trim() || null,
        stt_provider: sttProvider,
        tts_provider: ttsProvider,
        voice_id: voiceId,
        language,
        llm_provider: llmProvider,
        llm_model: llmModel,
        system_instructions: systemInstructions.trim() || null,
        greeting: greeting.trim() || null,
        knowledge_base_enabled: knowledgeBaseEnabled,
        tools_config: tools,
        transfer_number: transferNumber.trim() || null,
        recording_enabled: recordingEnabled,
        elevenlabs_agent_id: elevenlabsAgentId.trim() || null,
      };

      const url = isEditing && agent?.id ? `/api/voice/agents/${agent.id}` : '/api/voice/agents';
      const method = isEditing && agent?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to save calling agent');
      }

      toast.success(isEditing ? 'Calling Agent updated' : 'Calling Agent created successfully');
      if (onSaved && data.agent) {
        onSaved(data.agent);
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save agent';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const currentVoiceOptions =
    ttsProvider === 'elevenlabs' ? ELEVENLABS_PRESET_VOICES : SARVAM_PRESET_VOICES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isEditing ? `Edit Agent: ${agent?.name}` : 'Create New AI Calling Agent'}
              </DialogTitle>
              <DialogDescription>
                Configure voice personality, regional languages, knowledge retrieval, and tool permissions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-2 border-b">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Bot className="w-3.5 h-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Volume2 className="w-3.5 h-3.5" /> Voice & Lang
              </TabsTrigger>
              <TabsTrigger value="prompt" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Brain className="w-3.5 h-3.5" /> Prompt & Greeting
              </TabsTrigger>
              <TabsTrigger value="tools" className="flex items-center gap-1.5 text-xs sm:text-sm">
                <Wrench className="w-3.5 h-3.5" /> Grounding & Tools
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Tab: General */}
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="agent-name">
                  Agent Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="agent-name"
                  placeholder="e.g. Maya - Admissions Voice Assistant"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-desc">Description</Label>
                <Input
                  id="agent-desc"
                  placeholder="e.g. Handles incoming course inquiries, qualifies leads, and schedules campus visits"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(val) => {
                      if (val) setStatus(val as 'active' | 'inactive' | 'draft');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Ready for Calls)</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft (Testing Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-phone">Caller ID / Outbound Number</Label>
                  <Input
                    id="agent-phone"
                    placeholder="e.g. +919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 text-muted-foreground border">
                <div className="font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Multi-Tenant Calling Guarantee
                </div>
                <p>
                  This agent is strictly bounded to your Helpa tenant. All CRM records created during phone conversations are automatically attributed to this agent.
                </p>
              </div>
            </TabsContent>

            {/* Tab: Voice & Language */}
            <TabsContent value="voice" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>TTS (Text-to-Speech) Provider</Label>
                  <Select
                    value={ttsProvider}
                    onValueChange={(val) => {
                      if (val) handleTtsProviderChange(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sarvam">
                        Sarvam AI (Bulbul v3 - Indian Voices)
                      </SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs (High Fidelity)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>STT (Speech-to-Text) Provider</Label>
                  <Select
                    value={sttProvider}
                    onValueChange={(val) => {
                      if (val) setSttProvider(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sarvam">
                        Sarvam AI (Saaras v3 - 11 Indian Langs)
                      </SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs Scribe</SelectItem>
                      <SelectItem value="whisper">Whisper OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <Select
                    value={language}
                    onValueChange={(val) => {
                      if (val) setLanguage(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voice Personality</Label>
                  <Select
                    value={voiceId}
                    onValueChange={(val) => {
                      if (val) setVoiceId(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentVoiceOptions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {ttsProvider === 'elevenlabs' && (
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="el-agent-id">
                    Optional: ElevenLabs Conversational Agent ID
                  </Label>
                  <Input
                    id="el-agent-id"
                    placeholder="e.g. agnt_1234567890"
                    value={elevenlabsAgentId}
                    onChange={(e) => setElevenlabsAgentId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, native ElevenLabs SIP trunking will bind directly to this remote agent for zero-latency turn taking.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab: Prompt & Greeting */}
            <TabsContent value="prompt" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="agent-greeting">
                  Opening Greeting Line <span className="text-muted-foreground text-xs">(Spoken when call is answered)</span>
                </Label>
                <Input
                  id="agent-greeting"
                  placeholder="Namaste! I am calling from Helpa..."
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="agent-instructions">
                    System Instructions & Behavior Directives
                  </Label>
                  <Badge variant="outline" className="text-xs font-normal">
                    Grounding Protected
                  </Badge>
                </div>
                <Textarea
                  id="agent-instructions"
                  rows={6}
                  placeholder="Define role, tone, qualification questions, and policies..."
                  value={systemInstructions}
                  onChange={(e) => setSystemInstructions(e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                />
                <p className="text-xs text-muted-foreground">
                  The agent will synthesize answers using your knowledge base and will never hallucinate details outside your provided business context.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>LLM Provider</Label>
                  <Select
                    value={llmProvider}
                    onValueChange={(val) => {
                      if (val) setLlmProvider(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openrouter">OpenRouter (Gemini / Claude / DeepSeek)</SelectItem>
                      <SelectItem value="gemini">Google Gemini Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model Engine</Label>
                  <Select
                    value={llmModel}
                    onValueChange={(val) => {
                      if (val) setLlmModel(val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/gemini-2.5-flash">
                        Gemini 2.5 Flash (Ultra Fast & Balanced)
                      </SelectItem>
                      <SelectItem value="google/gemini-2.5-pro">
                        Gemini 2.5 Pro (Deep Reasoning)
                      </SelectItem>
                      <SelectItem value="anthropic/claude-3.5-haiku">
                        Claude 3.5 Haiku (Low Latency)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Grounding & Tools */}
            <TabsContent value="tools" className="space-y-4 mt-0">
              <div className="p-4 rounded-lg border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Knowledge Base Grounding
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Retrieve verified business docs & FAQs dynamically during conversation turns.
                    </p>
                  </div>
                  <Switch
                    checked={knowledgeBaseEnabled}
                    onCheckedChange={setKnowledgeBaseEnabled}
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Call Recording & Audio Retention</Label>
                    <p className="text-xs text-muted-foreground">
                      Record audio for post-call quality review and dispute resolution.
                    </p>
                  </div>
                  <Switch
                    checked={recordingEnabled}
                    onCheckedChange={setRecordingEnabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Active CRM Tools</Label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded border bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={tools.findContact}
                      onChange={(e) => setTools({ ...tools, findContact: e.target.checked })}
                    />
                    <span>Contact Lookup</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded border bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={tools.createLead}
                      onChange={(e) => setTools({ ...tools, createLead: e.target.checked })}
                    />
                    <span>Auto-Create Leads</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded border bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={tools.updateLead}
                      onChange={(e) => setTools({ ...tools, updateLead: e.target.checked })}
                    />
                    <span>Update CRM Stage & Notes</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded border bg-muted/30 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={tools.endCall}
                      onChange={(e) => setTools({ ...tools, endCall: e.target.checked })}
                    />
                    <span>Graceful Call Termination</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-1.5">
                  <PhoneForwarded className="w-4 h-4 text-primary" />
                  <Label htmlFor="transfer-phone" className="text-sm font-semibold">
                    Human Escalation Transfer Number
                  </Label>
                </div>
                <Input
                  id="transfer-phone"
                  placeholder="e.g. +919876543210 (Supervisor phone)"
                  value={transferNumber}
                  onChange={(e) => setTransferNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If the customer requests to speak to a human or becomes frustrated, the agent transfers the call immediately.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              'Update Agent'
            ) : (
              'Create Agent'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
