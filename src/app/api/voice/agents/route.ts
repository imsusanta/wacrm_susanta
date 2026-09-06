import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';

export async function GET() {
  try {
    const ctx = await requireRole('viewer');
    const db = getAdminClient();

    // 1. Fetch calling agents for this account
    const { data: agents, error: agentsErr } = await db
      .from('calling_agents')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false });

    if (agentsErr) throw agentsErr;

    // 2. Fetch calls metrics per agent for real dashboard stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: calls } = await db
      .from('calls')
      .select('calling_agent_id, external_agent_id, created_at, status')
      .eq('account_id', ctx.accountId);

    const callsByAgent: Record<string, { totalCalls: number; callsToday: number; lastCallAt: string | null }> = {};

    for (const call of calls || []) {
      const agentKey = (call.calling_agent_id || call.external_agent_id) as string;
      if (!agentKey) continue;

      if (!callsByAgent[agentKey]) {
        callsByAgent[agentKey] = { totalCalls: 0, callsToday: 0, lastCallAt: null };
      }

      callsByAgent[agentKey].totalCalls++;
      if (new Date(call.created_at).getTime() >= today.getTime()) {
        callsByAgent[agentKey].callsToday++;
      }

      if (
        !callsByAgent[agentKey].lastCallAt ||
        new Date(call.created_at).getTime() > new Date(callsByAgent[agentKey].lastCallAt!).getTime()
      ) {
        callsByAgent[agentKey].lastCallAt = call.created_at;
      }
    }

    const enrichedAgents = (agents || []).map((agent) => {
      const stats = callsByAgent[agent.id] || { totalCalls: 0, callsToday: 0, lastCallAt: null };
      return {
        ...agent,
        callsToday: stats.callsToday,
        totalCalls: stats.totalCalls,
        lastCallAt: stats.lastCallAt,
      };
    });

    return NextResponse.json({ agents: enrichedAgents });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    const db = getAdminClient();

    const body = await request.json();
    const {
      name,
      description,
      status = 'active',
      phone_number,
      stt_provider = 'sarvam',
      tts_provider = 'sarvam',
      voice_id = 'shubh',
      language = 'en-IN',
      llm_provider = 'openrouter',
      llm_model = 'google/gemini-2.5-flash',
      system_instructions,
      greeting,
      knowledge_base_enabled = true,
      tools_config,
      business_hours,
      call_rules,
      transfer_number,
      recording_enabled = false,
      elevenlabs_agent_id,
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_NAME', message: 'Agent name is required' },
        { status: 400 }
      );
    }

    const { data: newAgent, error } = await db
      .from('calling_agents')
      .insert({
        account_id: ctx.accountId,
        name: name.trim(),
        description: description?.trim() || null,
        status,
        phone_number: phone_number?.trim() || null,
        stt_provider,
        tts_provider,
        voice_id,
        language,
        llm_provider,
        llm_model,
        system_instructions: system_instructions?.trim() || null,
        greeting: greeting?.trim() || null,
        knowledge_base_enabled: Boolean(knowledge_base_enabled),
        tools_config: tools_config || {
          searchKnowledge: true,
          findContact: true,
          createLead: true,
          updateLead: true,
          transferToHuman: true,
          endCall: true,
        },
        business_hours: business_hours || null,
        call_rules: call_rules || null,
        transfer_number: transfer_number?.trim() || null,
        recording_enabled: Boolean(recording_enabled),
        elevenlabs_agent_id: elevenlabs_agent_id?.trim() || null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
