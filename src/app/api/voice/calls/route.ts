import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRole('viewer');
    const db = getAdminClient();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const agentId = searchParams.get('agentId');
    const direction = searchParams.get('direction');
    const search = searchParams.get('search');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    let query = db
      .from('calls')
      .select(
        '*, contacts(id, name, phone, email), leads(id, name, stage, value), calling_agents(id, name)',
        { count: 'exact' }
      )
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (agentId && agentId !== 'all') {
      query = query.or(`calling_agent_id.eq.${agentId},external_agent_id.eq.${agentId}`);
    }
    if (direction && direction !== 'all') {
      query = query.eq('direction', direction);
    }
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`from_phone.ilike.%${s}%,to_phone.ilike.%${s}%,patient_phone.ilike.%${s}%,summary.ilike.%${s}%`);
    }

    const { data: calls, count, error } = await query;
    if (error) throw error;

    // Compute overview stats from recent calls for this workspace
    const { data: allCalls } = await db
      .from('calls')
      .select('status, duration_seconds, lead_score, created_at')
      .eq('account_id', ctx.accountId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalCalls = 0;
    let callsToday = 0;
    let totalDurationSeconds = 0;
    let totalScoreSum = 0;
    let scoredCallsCount = 0;
    let completedCallsCount = 0;

    for (const c of allCalls || []) {
      totalCalls++;
      if (new Date(c.created_at).getTime() >= today.getTime()) {
        callsToday++;
      }
      if (c.duration_seconds) {
        totalDurationSeconds += Number(c.duration_seconds);
      }
      if (c.status === 'completed') {
        completedCallsCount++;
      }
      if (typeof c.lead_score === 'number' && c.lead_score > 0) {
        totalScoreSum += c.lead_score;
        scoredCallsCount++;
      }
    }

    const avgDurationSeconds = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0;
    const avgLeadScore = scoredCallsCount > 0 ? Math.round(totalScoreSum / scoredCallsCount) : 0;
    const answerRate = totalCalls > 0 ? Math.round((completedCallsCount / totalCalls) * 100) : 0;

    return NextResponse.json({
      calls: calls || [],
      total: count || 0,
      stats: {
        totalCalls,
        callsToday,
        avgDurationSeconds,
        avgLeadScore,
        answerRate,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
