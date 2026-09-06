'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
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
import {
  Bot,
  User,
  Send,
  Loader2,
  Volume2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export interface TestAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: {
    id: string;
    name: string;
    language?: string;
    stt_provider?: string;
    tts_provider?: string;
    greeting?: string | null;
  } | null;
  initialAgentId?: string;
  initialAgentName?: string;
}

interface MessageTurn {
  role: 'user' | 'assistant';
  content: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export function TestAgentModal({
  open,
  onOpenChange,
  agent: propAgent,
  initialAgentId,
  initialAgentName,
}: TestAgentModalProps) {
  const agent = useMemo(() => {
    return (
      propAgent ||
      (initialAgentId
        ? {
            id: initialAgentId,
            name: initialAgentName || 'Calling Agent',
            language: 'en-IN',
            stt_provider: 'sarvam',
            tts_provider: 'sarvam',
          }
        : null)
    );
  }, [propAgent, initialAgentId, initialAgentName]);

  const [turns, setTurns] = useState<MessageTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Initialize with agent greeting
  useEffect(() => {
    if (open && agent) {
      setTurns([
        {
          role: 'assistant',
          content:
            agent.greeting ||
            `Hello! I am ${agent.name}. How can I help you today?`,
        },
      ]);
    } else {
      setTurns([]);
      setInputText('');
    }
  }, [open, agent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  function playAudio(base64Data: string, mimeType = 'audio/wav') {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audioUrl = `data:${mimeType};base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
    } catch {
      setIsPlayingAudio(false);
    }
  }

  async function handleSend(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || !agent || sending) return;

    const userTurn: MessageTurn = { role: 'user', content: text };
    setTurns((prev) => [...prev, userTurn]);
    setInputText('');
    setSending(true);

    try {
      const history = turns.map((t) => ({ role: t.role, content: t.content }));
      const res = await fetch(`/api/voice/agents/${agent.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: text,
          history,
          generateAudio: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Test turn failed');
      }

      const assistantTurn: MessageTurn = {
        role: 'assistant',
        content: data.aiResponseText,
        audioBase64: data.audioBase64,
        audioMimeType: data.audioMimeType,
      };

      setTurns((prev) => [...prev, assistantTurn]);

      if (data.audioBase64) {
        playAudio(data.audioBase64, data.audioMimeType);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to test agent');
    } finally {
      setSending(false);
    }
  }

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Test Agent: {agent.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Interactive dialogue simulator • Language: {agent.language}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                setTurns([
                  {
                    role: 'assistant',
                    content:
                      agent.greeting ||
                      `Hello! I am ${agent.name}. How can I help you today?`,
                  },
                ]);
              }}
              title="Reset Conversation"
            >
              <RotateCcw className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            <strong>Test Session:</strong> This is a browser dialogue test. No phone call is placed and no carrier charges occur.
          </span>
        </div>

        {/* Conversation turns list */}
        <div
          ref={scrollRef}
          className="h-64 overflow-y-auto space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3"
        >
          {turns.map((t, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 ${
                t.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {t.role === 'assistant' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-0.5">
                  <Bot className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-lg px-3 py-2 text-xs ${
                  t.role === 'user'
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-card border border-border/70 text-card-foreground shadow-xs'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">
                  {t.content}
                </p>
                {t.audioBase64 && (
                  <button
                    onClick={() => playAudio(t.audioBase64!, t.audioMimeType)}
                    className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:underline"
                  >
                    <Volume2 className={`size-3 ${isPlayingAudio ? 'animate-pulse text-emerald-500' : ''}`} />
                    {isPlayingAudio ? 'Playing voice audio...' : 'Replay Voice Audio'}
                  </button>
                )}
              </div>
              {t.role === 'user' && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground mt-0.5">
                  <User className="size-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>{agent.name} is thinking & synthesizing speech...</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {[
            'What are your services?',
            'What is your pricing?',
            'Can I speak with a human?',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              disabled={sending}
              className="rounded-md border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type customer reply..."
            className="text-xs"
            disabled={sending}
          />
          <Button
            type="submit"
            size="sm"
            disabled={sending || !inputText.trim()}
            className="gap-1 shrink-0"
          >
            {sending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Send
          </Button>
        </form>

        <DialogFooter className="sm:justify-between items-center text-[11px] text-muted-foreground">
          <span>
            STT: {agent.stt_provider} • TTS: {agent.tts_provider}
          </span>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
