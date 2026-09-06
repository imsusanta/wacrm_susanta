'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Sparkles,
  ShieldCheck,
  Key,
  Webhook,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CallingNav } from '@/components/calling/calling-nav';
import { toast } from 'sonner';

interface ProviderConfig {
  configured: boolean;
  apiKeyMasked: string | null;
  status: string;
}

export default function CallingSettingsPage() {
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});
  const [webhooks, setWebhooks] = useState<Record<string, string>>({});

  // Sarvam Form
  const [sarvamApiKey, setSarvamApiKey] = useState('');
  const [savingSarvam, setSavingSarvam] = useState(false);

  // ElevenLabs Form
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('');
  const [elevenlabsWebhookSecret, setElevenlabsWebhookSecret] = useState('');
  const [elevenlabsAgentId, setElevenlabsAgentId] = useState('');
  const [savingElevenlabs, setSavingElevenlabs] = useState(false);

  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/settings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch settings');

      setProviders(data.providers || {});
      setWebhooks(data.webhooks || {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching voice settings';
      toast.error(msg);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSarvam = async () => {
    if (!sarvamApiKey.trim()) {
      toast.error('Sarvam API subscription key is required');
      return;
    }

    try {
      setSavingSarvam(true);
      const res = await fetch('/api/voice/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'sarvam',
          apiKey: sarvamApiKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save Sarvam settings');

      toast.success('Sarvam AI credentials encrypted & saved successfully');
      setSarvamApiKey('');
      fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save Sarvam API key';
      toast.error(msg);
    } finally {
      setSavingSarvam(false);
    }
  };

  const handleSaveElevenlabs = async () => {
    if (!elevenlabsApiKey.trim()) {
      toast.error('ElevenLabs API key is required');
      return;
    }

    try {
      setSavingElevenlabs(true);
      const res = await fetch('/api/voice/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'elevenlabs',
          apiKey: elevenlabsApiKey.trim(),
          webhookSecret: elevenlabsWebhookSecret.trim() || undefined,
          agentId: elevenlabsAgentId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to save ElevenLabs settings');

      toast.success('ElevenLabs credentials encrypted & saved successfully');
      setElevenlabsApiKey('');
      setElevenlabsWebhookSecret('');
      setElevenlabsAgentId('');
      fetchSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save ElevenLabs settings';
      toast.error(msg);
    } finally {
      setSavingElevenlabs(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    const fullUrl = `${window.location.origin}${text}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedWebhook(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedWebhook(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-primary" />
          Voice & Telephony Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage AES-256 encrypted voice provider credentials, Sarvam AI regional models, and webhook endpoints.
        </p>
      </div>

      <CallingNav />

      {/* Security Assurance Banner */}
      <div className="p-4 rounded-xl border bg-card/60 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground text-sm flex items-center gap-2">
            Zero Plaintext Security Architecture
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
              AES-256-GCM Encrypted
            </Badge>
          </div>
          <p>
            All provider API tokens are encrypted server-side with tenant isolation. Keys are never exposed to the client and are resolved just-in-time during voice sessions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sarvam AI Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sarvam AI</CardTitle>
                    <CardDescription className="text-xs">
                      Speech-to-Text (`saaras:v3`) & Text-to-Speech (`bulbul:v3`)
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant={providers.sarvam?.configured ? 'default' : 'secondary'}
                  className="text-xs capitalize"
                >
                  {providers.sarvam?.configured ? (
                    <span className="flex items-center gap-1 text-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Configured
                    </span>
                  ) : (
                    'Not Configured'
                  )}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border text-xs space-y-1.5 text-muted-foreground">
                <div className="font-medium text-foreground">Capabilities Included:</div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <span>• 11 Indian Languages + English</span>
                  <span>• saaras:v3 real-time STT</span>
                  <span>• bulbul:v3 expressive voices</span>
                  <span>• Automatic dialect detection</span>
                </div>
              </div>

              {providers.sarvam?.apiKeyMasked && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Active Key</Label>
                  <div className="p-2 font-mono text-xs bg-muted/40 rounded border text-foreground">
                    {providers.sarvam.apiKeyMasked}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="sarvam-key" className="text-xs">
                  {providers.sarvam?.configured ? 'Rotate Sarvam API Subscription Key' : 'Sarvam API Subscription Key'}
                </Label>
                <Input
                  id="sarvam-key"
                  type="password"
                  placeholder="Enter your Sarvam API subscription key..."
                  value={sarvamApiKey}
                  onChange={(e) => setSarvamApiKey(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </CardContent>
          </div>

          <div className="p-6 pt-0 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveSarvam}
              disabled={savingSarvam || !sarvamApiKey.trim()}
              className="gap-1.5"
            >
              {savingSarvam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Save Sarvam Key
            </Button>
          </div>
        </Card>

        {/* ElevenLabs Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">ElevenLabs</CardTitle>
                    <CardDescription className="text-xs">
                      Conversational Voice Agent & Native SIP Telephony
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant={providers.elevenlabs?.configured ? 'default' : 'secondary'}
                  className="text-xs capitalize"
                >
                  {providers.elevenlabs?.configured ? (
                    <span className="flex items-center gap-1 text-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Configured
                    </span>
                  ) : (
                    'Not Configured'
                  )}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0 space-y-4">
              {providers.elevenlabs?.apiKeyMasked && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current Active Key</Label>
                  <div className="p-2 font-mono text-xs bg-muted/40 rounded border text-foreground">
                    {providers.elevenlabs.apiKeyMasked}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="el-key" className="text-xs">
                  {providers.elevenlabs?.configured ? 'Rotate ElevenLabs API Key' : 'ElevenLabs API Key'}
                </Label>
                <Input
                  id="el-key"
                  type="password"
                  placeholder="xi-api-key..."
                  value={elevenlabsApiKey}
                  onChange={(e) => setElevenlabsApiKey(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="el-secret" className="text-xs">
                  Webhook Signing Secret
                </Label>
                <Input
                  id="el-secret"
                  placeholder="whsec_..."
                  value={elevenlabsWebhookSecret}
                  onChange={(e) => setElevenlabsWebhookSecret(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </CardContent>
          </div>

          <div className="p-6 pt-0 flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveElevenlabs}
              disabled={savingElevenlabs || !elevenlabsApiKey.trim()}
              className="gap-1.5"
            >
              {savingElevenlabs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Save ElevenLabs Key
            </Button>
          </div>
        </Card>
      </div>

      {/* Webhook Endpoints Card */}
      <Card>
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Telephony Webhook Endpoints</CardTitle>
              <CardDescription className="text-xs">
                Configure these webhook URLs in your ElevenLabs or SIP carrier console to stream real-time call states.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">ElevenLabs Post-Call & Transcript Webhook</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${webhooks.elevenlabs || '/api/webhooks/voice/elevenlabs'}`
                    : webhooks.elevenlabs || '/api/webhooks/voice/elevenlabs'
                }
                className="font-mono text-xs bg-muted/30"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs shrink-0"
                onClick={() =>
                  copyToClipboard(
                    webhooks.elevenlabs || '/api/webhooks/voice/elevenlabs',
                    'ElevenLabs Webhook'
                  )
                }
              >
                {copiedWebhook === 'ElevenLabs Webhook' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-semibold">Inbound Telephony Webhook</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${webhooks.inbound || '/api/webhooks/voice/inbound'}`
                    : webhooks.inbound || '/api/webhooks/voice/inbound'
                }
                className="font-mono text-xs bg-muted/30"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs shrink-0"
                onClick={() =>
                  copyToClipboard(
                    webhooks.inbound || '/api/webhooks/voice/inbound',
                    'Inbound Webhook'
                  )
                }
              >
                {copiedWebhook === 'Inbound Webhook' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
