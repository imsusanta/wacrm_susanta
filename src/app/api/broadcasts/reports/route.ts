import { NextRequest, NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { getAdminClient as getSupabaseAdminClient } from '@/lib/supabase/server';
import {
  aggregateBroadcasts,
  resolveReportRange,
  type ReportRangePreset,
} from '@/lib/marketing/campaign-reports';
import type { Broadcast } from '@/types';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
};

/**
 * Server-side campaign performance report.
 *
 * All filtering happens here — the client never receives more rows than
 * the requested window contains. Every metric derives from the
 * trigger-maintained counters on `broadcasts`; nothing is estimated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const context = await requireRole('viewer');
    const supabase = getSupabaseAdminClient();
    const { searchParams } = request.nextUrl;

    const preset = (searchParams.get('range') || 'last_30_days') as
      ReportRangePreset | string;
    const customFrom = searchParams.get('from');
    const customTo = searchParams.get('to');

    // 'all' skips the time window; presets/custom resolve to a range.
    let fromIso: string | null = null;
    let toIso: string | null = null;

    if (preset !== 'all') {
      const range = resolveReportRange(preset, customFrom, customTo);
      if (!range) {
        return NextResponse.json(
          { error: 'Invalid date range' },
          { status: 400, headers: PRIVATE_HEADERS }
        );
      }
      fromIso = range.from.toISOString();
      toIso = range.to.toISOString();
    }

    let query = supabase
      .from('broadcasts')
      .select('*')
      .eq('account_id', context.accountId)
      .order('created_at', { ascending: false });

    if (fromIso) query = query.gte('created_at', fromIso);
    if (toIso) query = query.lte('created_at', toIso);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: PRIVATE_HEADERS }
      );
    }

    const broadcasts = (data ?? []) as Broadcast[];

    // Compute live conversion and revenue attribution from appointments and invoices
    const campaignIds = broadcasts.map((b) => b.id);
    const apptsByCampaign: Record<string, number> = {};
    const apptIds: string[] = [];

    if (campaignIds.length > 0) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, campaign_id')
        .in('campaign_id', campaignIds);

      if (appts) {
        for (const a of appts) {
          if (a.campaign_id) {
            apptsByCampaign[a.campaign_id] =
              (apptsByCampaign[a.campaign_id] || 0) + 1;
            apptIds.push(a.id);
          }
        }
      }
    }

    const revenueByCampaign: Record<string, number> = {};
    if (apptIds.length > 0) {
      const { data: invoices } = await supabase
        .from('billing_invoices')
        .select('appointment_id, amount, status')
        .in('appointment_id', apptIds)
        .eq('status', 'paid');

      if (invoices) {
        const apptToCamp = new Map<string, string>();
        if (campaignIds.length > 0) {
          const { data: appts } = await supabase
            .from('appointments')
            .select('id, campaign_id')
            .in('campaign_id', campaignIds);
          for (const a of appts || []) {
            if (a.campaign_id) apptToCamp.set(a.id, a.campaign_id);
          }
        }
        for (const inv of invoices) {
          const campId = inv.appointment_id
            ? apptToCamp.get(inv.appointment_id)
            : undefined;
          if (campId) {
            revenueByCampaign[campId] =
              (revenueByCampaign[campId] || 0) + Number(inv.amount || 0);
          }
        }
      }
    }

    const enrichedBroadcasts = broadcasts.map((b) => {
      const liveConversions = apptsByCampaign[b.id] || 0;
      const liveRevenue = revenueByCampaign[b.id] || 0;
      return {
        ...b,
        conversions_count: Math.max(b.conversions_count || 0, liveConversions),
        attributed_revenue: Math.max(
          Number(b.attributed_revenue || 0),
          liveRevenue
        ),
      };
    });

    const summary = aggregateBroadcasts(enrichedBroadcasts);

    return NextResponse.json(
      {
        data: {
          campaigns: enrichedBroadcasts,
          summary,
          range:
            preset === 'all'
              ? { preset: 'all' }
              : { preset, from: fromIso, to: toIso },
        },
      },
      { headers: PRIVATE_HEADERS }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
