import { NextResponse } from 'next/server';
import { checkSuperAdmin } from '@/lib/auth/admin';
import { getAdminClient } from '@/lib/db/server';

function assertResult(
  error: { message?: string } | null | undefined,
  operation: string
): void {
  if (error) throw new Error(`${operation}: ${error.message || 'database error'}`);
}

function normalizeStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export async function GET() {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const db = getAdminClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const [accounts, contacts, profiles, subscriptions, usage] =
      await Promise.all([
        db.from('accounts').select('id', { count: 'exact', head: true }),
        db.from('contacts').select('id', { count: 'exact', head: true }),
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('subscriptions').select('status, plan:plans(name)'),
        db
          .from('usage_tracking')
          .select('ai_requests, whatsapp_messages')
          .eq('month', currentMonth),
      ]);

    assertResult(accounts.error, 'Failed to count accounts');
    assertResult(contacts.error, 'Failed to count contacts');
    assertResult(profiles.error, 'Failed to count users');
    assertResult(subscriptions.error, 'Failed to load subscriptions');
    assertResult(usage.error, 'Failed to load monthly usage');

    let active = 0;
    let trial = 0;
    let expired = 0;
    const planBreakdown: Record<string, number> = {};

    for (const subscription of subscriptions.data || []) {
      const status = normalizeStatus(subscription.status);
      if (status === 'active') active++;
      else if (['trial', 'trialing'].includes(status)) trial++;
      else expired++;

      const relation = Array.isArray(subscription.plan)
        ? subscription.plan[0]
        : subscription.plan;
      const planName = String(
        (relation as Record<string, unknown> | null)?.name || 'unassigned'
      );
      planBreakdown[planName] = (planBreakdown[planName] || 0) + 1;
    }

    const usageTotals = (usage.data || []).reduce(
      (totals, row) => ({
        aiRequests: totals.aiRequests + Number(row.ai_requests || 0),
        whatsappMessages:
          totals.whatsappMessages + Number(row.whatsapp_messages || 0),
      }),
      { aiRequests: 0, whatsappMessages: 0 }
    );

    return NextResponse.json({
      totalAccounts: accounts.count ?? accounts.data?.length ?? 0,
      totalContacts: contacts.count ?? contacts.data?.length ?? 0,
      totalUsers: profiles.count ?? profiles.data?.length ?? 0,
      subscriptions: {
        active,
        trial,
        expired,
        total: subscriptions.data?.length || 0,
        planBreakdown,
      },
      usage: { month: currentMonth, ...usageTotals },
    });
  } catch (error) {
    console.error(
      '[GET /api/admin/metrics] failed:',
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: 'Platform metrics are temporarily unavailable' },
      { status: 503 }
    );
  }
}
