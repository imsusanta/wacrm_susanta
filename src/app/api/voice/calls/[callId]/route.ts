import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient } from '@/lib/db/server';
import { STORAGE_BUCKETS } from '@/lib/storage/buckets';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const ctx = await requireRole('viewer');
    const { callId } = await params;
    const db = getAdminClient();

    // Query by id OR external_call_id
    const { data: call, error } = await db
      .from('calls')
      .select('*, contacts(*), leads(*), calling_agents(id, name, voice_id, language)')
      .eq('account_id', ctx.accountId)
      .or(`id.eq.${callId},external_call_id.eq.${callId}`)
      .maybeSingle();

    if (error || !call) {
      return NextResponse.json(
        { error: 'CALL_NOT_FOUND', message: 'Call record not found' },
        { status: 404 }
      );
    }

    // Load transcript if stored in storage bucket
    let resolvedTranscript = call.transcript || '';
    if (!resolvedTranscript && call.transcript_reference) {
      try {
        const { data: fileData } = await db.storage
          .from(STORAGE_BUCKETS.voiceTranscripts)
          .download(call.transcript_reference);
        if (fileData) {
          resolvedTranscript = await fileData.text();
        }
      } catch {
        // Fallback gracefully
      }
    }

    // Load audit provider events for this call
    const { data: events } = await db
      .from('provider_events')
      .select('id, event_type, created_at, status')
      .eq('account_id', ctx.accountId)
      .ilike('external_event_id', `%${call.external_call_id}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      call: {
        ...call,
        transcript: resolvedTranscript,
      },
      events: events || [],
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
