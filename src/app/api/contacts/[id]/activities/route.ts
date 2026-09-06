import { NextRequest, NextResponse } from 'next/server';
import {
  ForbiddenError,
  UnauthorizedError,
  requireRole,
} from '@/lib/auth/account';
import { getAdminClient as getSupabaseAdminClient } from '@/lib/supabase/server';
import type { ActivityItem } from '@/types';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

function requestId(request: NextRequest): string {
  return request.headers.get('x-request-id') ?? crypto.randomUUID();
}

function errorResponse(
  status: number,
  code: string,
  correlationId: string
): NextResponse {
  return NextResponse.json(
    { error: code, requestId: correlationId },
    { status, headers: { ...PRIVATE_HEADERS, 'X-Request-Id': correlationId } }
  );
}

/**
 * Aggregates a multi-channel unified timeline for a given contact:
 * - Inbound & Outbound WhatsApp messages
 * - Internal notes & triage comments
 * - Appointments & OPD token bookings
 * - Deal stage transitions & activities
 * - Tasks & Follow-up reminders
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const correlationId = requestId(request);
  try {
    const { id: contactId } = await params;
    if (!contactId) {
      return errorResponse(400, 'INVALID_CONTACT_ID', correlationId);
    }

    const context = await requireRole('viewer');
    const supabase = getSupabaseAdminClient();

    // 1. Verify contact exists in current tenant
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('id, name, phone, account_id')
      .eq('id', contactId)
      .eq('account_id', context.accountId)
      .maybeSingle();

    if (contactErr || !contact) {
      return errorResponse(404, 'CONTACT_NOT_FOUND', correlationId);
    }

    // 2. Parallel queries across all event sources
    const [
      conversationsRes,
      notesRes,
      appointmentsRes,
      dealsRes,
      followupsRes,
      callsRes,
    ] = await Promise.all([
      // A. Conversations & Recent Messages
      supabase
        .from('conversations')
        .select('id, channel, status, ai_intent, ai_lead_score, created_at')
        .eq('account_id', context.accountId)
        .eq('contact_id', contactId),

      // B. Internal Notes
      supabase
        .from('contact_notes')
        .select('id, note_text, created_at, user_id')
        .eq('account_id', context.accountId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50),

      // C. Appointments
      supabase
        .from('appointments')
        .select('id, starts_at, status, notes, created_at')
        .eq('account_id', context.accountId)
        .eq('contact_id', contactId)
        .order('starts_at', { ascending: false })
        .limit(50),

      // D. Deals for this contact
      supabase
        .from('deals')
        .select('id, name, value, currency, status, created_at')
        .eq('account_id', context.accountId)
        .eq('contact_id', contactId),

      // E. Follow-ups
      supabase
        .from('hospital_followups')
        .select('id, followup_type, due_date, status, notes, created_at')
        .eq('account_id', context.accountId)
        .or(`patient_id.eq.${contactId},id.eq.${contactId}`)
        .order('created_at', { ascending: false })
        .limit(50),

      // F. Voice Calls
      supabase
        .from('calls')
        .select(
          'id, external_call_id, direction, status, duration_seconds, outcome, summary, transcript, lead_score, intent, recording_url, created_at, started_at'
        )
        .eq('account_id', context.accountId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const activities: ActivityItem[] = [];

    // Process Calls
    if (callsRes.data) {
      for (const call of callsRes.data) {
        const durationMin = call.duration_seconds
          ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
          : '0s';
        const intentText = call.intent ? ` • Intent: ${call.intent}` : '';
        const scoreText = call.lead_score ? ` • Score: ${call.lead_score}/100` : '';
        const summaryText =
          call.summary ||
          (call.status === 'completed'
            ? 'Call completed successfully.'
            : `Call status: ${call.status}`);

        activities.push({
          id: `call-${call.id}`,
          type: 'call',
          title: `AI Call (${call.direction === 'inbound' ? 'Inbound' : 'Outbound'}) — ${durationMin}`,
          description: `${summaryText}${intentText}${scoreText}`,
          created_at: call.started_at || call.created_at,
          metadata: {
            callId: call.id,
            externalCallId: call.external_call_id,
            duration: call.duration_seconds,
            leadScore: call.lead_score,
            intent: call.intent,
            outcome: call.outcome,
            transcript: call.transcript,
            recordingUrl: call.recording_url,
          },
        });
      }
    }


    // Process Notes
    if (notesRes.data) {
      for (const note of notesRes.data) {
        activities.push({
          id: `note-${note.id}`,
          type: 'note',
          title: 'Internal Note Added',
          description: note.note_text,
          created_at: note.created_at,
          metadata: { noteId: note.id },
        });
      }
    }

    // Process Appointments
    if (appointmentsRes.data) {
      for (const appt of appointmentsRes.data) {
        activities.push({
          id: `appt-${appt.id}`,
          type: 'appointment',
          title: `Appointment ${appt.status ? appt.status.toUpperCase() : 'SCHEDULED'}`,
          description: appt.notes
            ? `Notes: ${appt.notes}`
            : `Scheduled for ${new Date(appt.starts_at).toLocaleString()}`,
          created_at: appt.created_at || appt.starts_at,
          metadata: {
            appointmentId: appt.id,
            startsAt: appt.starts_at,
            status: appt.status,
          },
        });
      }
    }

    // Process Follow-ups / Tasks
    if (followupsRes.data) {
      for (const fu of followupsRes.data) {
        activities.push({
          id: `fu-${fu.id}`,
          type: 'task',
          title: `Follow-up: ${fu.followup_type || 'Task'}`,
          description: `Due: ${fu.due_date} | Status: ${fu.status}${fu.notes ? ` — ${fu.notes}` : ''}`,
          created_at: fu.created_at,
          metadata: {
            followupId: fu.id,
            dueDate: fu.due_date,
            status: fu.status,
          },
        });
      }
    }

    // Process Messages from Conversations
    if (conversationsRes.data && conversationsRes.data.length > 0) {
      const convIds = conversationsRes.data.map((c) => c.id);
      const { data: messages } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_type, content, created_at, status')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messages) {
        for (const msg of messages) {
          const isOutbound =
            msg.sender_type === 'user' ||
            msg.sender_type === 'agent' ||
            msg.sender_type === 'ai';
          activities.push({
            id: `msg-${msg.id}`,
            type: isOutbound ? 'whatsapp_outbound' : 'whatsapp_inbound',
            title: isOutbound
              ? msg.sender_type === 'ai'
                ? 'AI Reply Sent'
                : 'WhatsApp Message Sent'
              : 'Inbound WhatsApp Message',
            description: msg.content || '(Media message)',
            created_at: msg.created_at,
            metadata: {
              messageId: msg.id,
              senderType: msg.sender_type,
              status: msg.status,
            },
          });
        }
      }
    }

    // Process Deals Activities
    if (dealsRes.data && dealsRes.data.length > 0) {
      const dealIds = dealsRes.data.map((d) => d.id);
      const { data: dealActs } = await supabase
        .from('deal_activities')
        .select('id, deal_id, activity_type, description, created_at')
        .in('deal_id', dealIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (dealActs) {
        for (const da of dealActs) {
          activities.push({
            id: `deal-act-${da.id}`,
            type: 'deal_stage',
            title: `Deal Activity (${da.activity_type})`,
            description: da.description,
            created_at: da.created_at,
            metadata: { dealId: da.deal_id },
          });
        }
      }
    }

    // Sort all activities in descending chronological order
    activities.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(
      { data: activities, requestId: correlationId },
      { headers: { ...PRIVATE_HEADERS, 'X-Request-Id': correlationId } }
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return errorResponse(401, 'AUTH_REQUIRED', correlationId);
    }
    if (error instanceof ForbiddenError) {
      return errorResponse(403, 'ACCOUNT_MEMBERSHIP_REQUIRED', correlationId);
    }
    console.error('[activities] Aggregation error:', error);
    return errorResponse(500, 'ACTIVITIES_FETCH_FAILED', correlationId);
  }
}
