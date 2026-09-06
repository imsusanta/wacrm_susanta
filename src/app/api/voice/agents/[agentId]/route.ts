import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';

export async function GET(
  _request: Request,
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

    return NextResponse.json({ agent });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { agentId } = await params;
    const db = getAdminClient();

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.stt_provider !== undefined) updateData.stt_provider = body.stt_provider;
    if (body.tts_provider !== undefined) updateData.tts_provider = body.tts_provider;
    if (body.voice_id !== undefined) updateData.voice_id = body.voice_id;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.llm_provider !== undefined) updateData.llm_provider = body.llm_provider;
    if (body.llm_model !== undefined) updateData.llm_model = body.llm_model;
    if (body.system_instructions !== undefined) updateData.system_instructions = body.system_instructions;
    if (body.greeting !== undefined) updateData.greeting = body.greeting;
    if (body.knowledge_base_enabled !== undefined) updateData.knowledge_base_enabled = Boolean(body.knowledge_base_enabled);
    if (body.tools_config !== undefined) updateData.tools_config = body.tools_config;
    if (body.business_hours !== undefined) updateData.business_hours = body.business_hours;
    if (body.call_rules !== undefined) updateData.call_rules = body.call_rules;
    if (body.transfer_number !== undefined) updateData.transfer_number = body.transfer_number;
    if (body.recording_enabled !== undefined) updateData.recording_enabled = Boolean(body.recording_enabled);
    if (body.elevenlabs_agent_id !== undefined) updateData.elevenlabs_agent_id = body.elevenlabs_agent_id;

    const { data: updated, error } = await db
      .from('calling_agents')
      .update(updateData)
      .eq('id', agentId)
      .eq('account_id', ctx.accountId)
      .select('*')
      .maybeSingle();

    if (error || !updated) {
      return NextResponse.json(
        { error: 'AGENT_UPDATE_FAILED', message: 'Could not update calling agent' },
        { status: 400 }
      );
    }

    return NextResponse.json({ agent: updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const ctx = await requireRole('agent');
    const { agentId } = await params;
    const db = getAdminClient();

    const { error } = await db
      .from('calling_agents')
      .delete()
      .eq('id', agentId)
      .eq('account_id', ctx.accountId);

    if (error) throw error;

    return NextResponse.json({ success: true, agentId });
  } catch (err) {
    return toErrorResponse(err);
  }
}
