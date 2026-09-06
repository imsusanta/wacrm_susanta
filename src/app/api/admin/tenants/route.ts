import { NextResponse } from 'next/server';
import { checkSuperAdmin } from '@/lib/auth/admin';
import { getAdminClient as getSupabaseAdminClient } from '@/lib/supabase/server';
import { findPlanBySlug, resolvePlanRowId } from '@/core/billing/plans';

function assertResult(
  error: { message?: string } | null | undefined,
  operation: string
): void {
  if (error) throw new Error(`${operation}: ${error.message || 'database error'}`);
}

export async function GET() {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const database = getSupabaseAdminClient();
    const [accountsResult, profilesResult, subscriptionsResult, contactsResult] =
      await Promise.all([
        database
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: false }),
        database.from('profiles').select('*'),
        database.from('subscriptions').select('*, plan:plans(id, name)'),
        database.from('contacts').select('id, account_id'),
      ]);

    assertResult(accountsResult.error, 'Failed to load accounts');
    assertResult(profilesResult.error, 'Failed to load profiles');
    assertResult(subscriptionsResult.error, 'Failed to load subscriptions');
    assertResult(contactsResult.error, 'Failed to load contacts');

    const profiles = profilesResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const contacts = contactsResult.data || [];

    const tenants = (accountsResult.data || []).map((account) => {
      const accountId = String(account.id);
      const accountProfiles = profiles.filter(
        (profile) => String(profile.account_id || '') === accountId
      );
      const owner =
        accountProfiles.find(
          (profile) =>
            String(profile.user_id || profile.id || '') ===
            String(account.owner_user_id || '')
        ) ||
        accountProfiles.find((profile) =>
          ['owner', 'admin'].includes(
            String(profile.account_role || profile.role || '').toLowerCase()
          )
        ) ||
        null;
      const subscription =
        subscriptions.find(
          (item) => String(item.account_id || '') === accountId
        ) || null;
      const relation = Array.isArray(subscription?.plan)
        ? subscription.plan[0]
        : subscription?.plan;
      const plan =
        relation && typeof relation === 'object'
          ? (relation as Record<string, unknown>)
          : null;

      return {
        id: accountId,
        name: String(account.name || accountId),
        created_at: account.created_at || null,
        owner: owner
          ? {
              full_name: String(owner.full_name || owner.name || ''),
              email: String(owner.email || ''),
            }
          : null,
        membersCount: accountProfiles.length,
        contactsCount: contacts.filter(
          (contact) => String(contact.account_id || '') === accountId
        ).length,
        subscription: subscription
          ? {
              status: String(subscription.status || 'incomplete'),
              end_date: subscription.end_date || null,
              plan: plan
                ? {
                    id: String(plan.id || subscription.plan_id || ''),
                    name: String(plan.name || 'unassigned'),
                  }
                : subscription.plan_id
                  ? {
                      id: String(subscription.plan_id),
                      name: 'unassigned',
                    }
                  : null,
            }
          : null,
        usage: null,
      };
    });

    return NextResponse.json(tenants);
  } catch {
    console.error('[GET /api/admin/tenants] Database query failed');
    return NextResponse.json(
      { error: 'Tenant data is temporarily unavailable' },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await checkSuperAdmin())) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      tenantId?: string;
      planId?: string;
      status?: string;
      endDate?: string;
    } | null;
    const tenantId = body?.tenantId?.trim();
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    const status = body?.status?.trim().toLowerCase();
    const allowedStatuses = new Set([
      'trial',
      'active',
      'cancelled',
      'expired',
    ]);
    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json(
        { error: 'Invalid subscription status' },
        { status: 400 }
      );
    }

    const endDate = body?.endDate?.trim();
    if (endDate && Number.isNaN(new Date(endDate).getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }

    const plan = body?.planId ? await findPlanBySlug(body.planId) : null;
    if (body?.planId && (!plan || !plan.isActive)) {
      return NextResponse.json(
        { error: 'Unknown or inactive plan' },
        { status: 400 }
      );
    }
    const planRowId = plan ? await resolvePlanRowId(plan) : null;
    if (plan && !planRowId) {
      return NextResponse.json(
        { error: 'Plan catalog is not provisioned' },
        { status: 409 }
      );
    }

    const database = getSupabaseAdminClient();
    const { data: account, error: accountError } = await database
      .from('accounts')
      .select('id')
      .eq('id', tenantId)
      .maybeSingle();
    assertResult(accountError, 'Failed to verify tenant');
    if (!account) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { data: existing, error: lookupError } = await database
      .from('subscriptions')
      .select('id')
      .eq('account_id', tenantId)
      .maybeSingle();
    assertResult(lookupError, 'Failed to load subscription');

    const now = new Date().toISOString();
    const changes: Record<string, unknown> = { updated_at: now };
    if (status) changes.status = status;
    if (endDate) changes.end_date = new Date(endDate).toISOString();
    if (planRowId) changes.plan_id = planRowId;

    if (Object.keys(changes).length === 1) {
      return NextResponse.json(
        { error: 'No subscription changes were provided' },
        { status: 400 }
      );
    }

    if (existing) {
      const { error } = await database
        .from('subscriptions')
        .update(changes)
        .eq('id', existing.id)
        .eq('account_id', tenantId);
      assertResult(error, 'Failed to update subscription');
    } else {
      if (!planRowId || !status || !endDate) {
        return NextResponse.json(
          { error: 'A new subscription requires planId, status, and endDate' },
          { status: 400 }
        );
      }
      const { error } = await database.from('subscriptions').insert({
        account_id: tenantId,
        plan_id: planRowId,
        status,
        start_date: now,
        end_date: new Date(endDate).toISOString(),
        created_at: now,
        updated_at: now,
      });
      assertResult(error, 'Failed to create subscription');
    }

    return NextResponse.json({ success: true });
  } catch {
    console.error('[PATCH /api/admin/tenants] Subscription update failed');
    return NextResponse.json(
      { error: 'Failed to update tenant subscription' },
      { status: 500 }
    );
  }
}
