import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';
import { VoiceAgentRuntime, VoiceTurn } from '@/core/voice/voice-agent-runtime';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    const { agentId } = await params;
    const db = getAdminClient();

    const { data: agent, error } = await db
      .from('calling_agents')
      .select('*')
      .eq('id', agentId)
      .eq('account_id', ctx.accountId)
      .maybeSingle();

    if (error || !agent) {
      return NextResponse.json(
        { error: 'AGENT_NOT_FOUND', message: 'Calling agent not found' },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      userText?: string;
      userAudioBase64?: string;
      userAudioMimeType?: string;
      history?: VoiceTurn[];
      generateAudio?: boolean;
    };

    let userAudioBuffer: Buffer | undefined;
    if (body.userAudioBase64) {
      try {
        userAudioBuffer = Buffer.from(body.userAudioBase64, 'base64');
      } catch {
        // Fall back to text if invalid base64
      }
    }

    const result = await VoiceAgentRuntime.executeTurn({
      accountId: ctx.accountId,
      agentConfig: {
        name: agent.name,
        systemInstructions: agent.system_instructions,
        greeting: agent.greeting,
        language: agent.language || 'en-IN',
        sttProvider: agent.stt_provider,
        ttsProvider: agent.tts_provider,
        voiceId: agent.voice_id,
        llmProvider: agent.llm_provider,
        llmModel: agent.llm_model,
        knowledgeBaseEnabled: agent.knowledge_base_enabled,
        transferNumber: agent.transfer_number,
        toolsConfig: agent.tools_config,
      },
      history: body.history || [],
      userText: body.userText,
      userAudioBuffer,
      userAudioMimeType: body.userAudioMimeType,
      generateAudioResponse: body.generateAudio ?? true,
    });

    const audioBase64 = result.audioResult?.audioBuffer
      ? result.audioResult.audioBuffer.toString('base64')
      : undefined;

    return NextResponse.json({
      isTestSession: true,
      userTranscript: result.userTranscript,
      aiResponseText: result.aiResponseText,
      audioBase64,
      audioMimeType: result.audioResult?.mimeType || 'audio/wav',
      transferToHuman: result.transferToHuman,
      endCall: result.endCall,
      history: result.history,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
