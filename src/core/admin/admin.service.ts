/**
 * Helpa Core Super Admin — truthful platform management service.
 */

import type { PlatformMetrics, TenantAdminView, UserAdminView } from './types';
import { getAdminClient } from '@/lib/db/server';
import { getPlanById } from '@/core/billing/plans';
import { logAdminAction } from './audit.service';

function assertDatabaseResult(
  error: { message?: string } | null | undefined,
  operation: string
): void {
  if (error) {
    throw new Error(`${operation}: ${error.message || 'database error'}`);
  }
}

function normalizeStatus(value: unknown): string {
  return String(value || 'incomplete')
    .trim()
    .toUpperCase();
}

function tenantStatus(
  suspended: boolean,
  subscriptionStatus: string
): TenantAdminView['tenantStatus'] {
  if (suspended) return 'Suspended';
  if (subscriptionStatus === 'ACTIVE') return 'Active';
  if (['TRIAL', 'TRIALING'].includes(subscriptionStatus)) return 'Trial';
  if (['CANCELLED', 'CANCELED'].includes(subscriptionStatus)) {
    return 'Cancelled';
  }
  return 'Expired';
}

function relatedPlan(row: Record<string, unknown> | null | undefined) {
  const relation = row?.plan;
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function finiteNonNegative(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function planIdentifier(
  account: Record<string, unknown>,
  subscription?: Record<string, unknown>
): string {
  const plan = relatedPlan(subscription);
  return String(
    subscription?.plan_slug ||
      plan?.slug ||
      plan?.name ||
      subscription?.plan_id ||
      account.subscription_plan ||
      ''
  ).trim();
}

function planDisplayName(
  account: Record<string, unknown>,
  subscription?: Record<string, unknown>
): string {
  const plan = relatedPlan(subscription);
  return String(
    plan?.name ||
      subscription?.plan_slug ||
      account.subscription_plan ||
      'unassigned'
  );
}

function createPlanAmountResolver() {
  const cache = new Map<string, Promise<number>>();

  return async (identifier: string): Promise<number> => {
    if (!identifier) return 0;
    let lookup = cache.get(identifier);
    if (!lookup) {
      lookup = getPlanById(identifier)
        .then((plan) => finiteNonNegative(plan.monthlyPrice) || 0)
        .catch(() => 0);
      cache.set(identifier, lookup);
    }
    return lookup;
  };
}

/** Returns only values persisted in the database or official plan catalog. */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const db = getAdminClient();
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

  const [
    accountsResult,
    profilesResult,
    subscriptionsResult,
    whatsappResult,
    usageResult,
    messagesResult,
  ] = await Promise.all([
    db.from('accounts').select('*'),
    db.from('profiles').select('id'),
    db.from('subscriptions').select('*, plan:plans(*)'),
    db.from('whatsapp_configs').select('account_id, status, connection_status'),
    db
      .from('usage_tracking')
      .select('account_id, ai_requests, whatsapp_messages')
      .eq('month', currentMonth),
    db.from('messages').select('id', { count: 'exact', head: true }),
  ]);

  assertDatabaseResult(accountsResult.error, 'Failed to load accounts');
  assertDatabaseResult(profilesResult.error, 'Failed to load profiles');
  assertDatabaseResult(
    subscriptionsResult.error,
    'Failed to load subscriptions'
  );
  assertDatabaseResult(
    whatsappResult.error,
    'Failed to load WhatsApp accounts'
  );
  assertDatabaseResult(usageResult.error, 'Failed to load usage');
  assertDatabaseResult(messagesResult.error, 'Failed to count messages');

  const accounts = (accountsResult.data || []) as Record<string, unknown>[];
  const subscriptions = (subscriptionsResult.data || []) as Record<
    string,
    unknown
  >[];
  const subscriptionByAccount = new Map(
    subscriptions.map((subscription) => [
      String(subscription.account_id || ''),
      subscription,
    ])
  );
  const resolvePlanAmount = createPlanAmountResolver();

  let activeTenants = 0;
  let trialTenants = 0;
  let paidTenants = 0;
  let suspendedTenants = 0;
  let pastDueSubscriptions = 0;
  let mrr = 0;
  const industryDistribution: Record<string, number> = {};
  const planDistribution: Record<string, number> = {};

  for (const account of accounts) {
    const accountId = String(account.id || '');
    const subscription = subscriptionByAccount.get(accountId);
    const status = normalizeStatus(
      subscription?.status || account.subscription_status
    );
    const suspended =
      account.is_suspended === true ||
      normalizeStatus(account.status) === 'SUSPENDED';

    if (suspended) {
      suspendedTenants++;
    } else if (status === 'ACTIVE') {
      activeTenants++;
      paidTenants++;
    } else if (['TRIAL', 'TRIALING'].includes(status)) {
      activeTenants++;
      trialTenants++;
    }

    if (status === 'PAST_DUE') pastDueSubscriptions++;

    const industry = String(account.industry || 'unassigned');
    industryDistribution[industry] = (industryDistribution[industry] || 0) + 1;

    const planName = planDisplayName(account, subscription);
    planDistribution[planName] = (planDistribution[planName] || 0) + 1;

    if (status === 'ACTIVE' && !suspended) {
      const plan = relatedPlan(subscription);
      const storedAmount = finiteNonNegative(
        subscription?.monthly_amount ??
          plan?.monthly_price ??
          account.monthly_amount
      );
      mrr +=
        storedAmount ??
        (await resolvePlanAmount(planIdentifier(account, subscription)));
    }
  }

  const usageTotals = (
    (usageResult.data || []) as Record<string, unknown>[]
  ).reduce<{ aiRequests: number; whatsappMessages: number }>(
    (totals, row) => ({
      aiRequests: totals.aiRequests + (finiteNonNegative(row.ai_requests) || 0),
      whatsappMessages:
        totals.whatsappMessages +
        (finiteNonNegative(row.whatsapp_messages) || 0),
    }),
    { aiRequests: 0, whatsappMessages: 0 }
  );

  const whatsappAccounts = (whatsappResult.data || []) as Record<
    string,
    unknown
  >[];

  return {
    totalTenants: accounts.length,
    activeTenants,
    trialTenants,
    paidTenants,
    suspendedTenants,
    totalUsers: profilesResult.data?.length || 0,
    activeSubscriptions: paidTenants + trialTenants,
    pastDueSubscriptions,
    totalWhatsAppAccounts: whatsappAccounts.length,
    connectedWhatsAppAccounts: whatsappAccounts.filter((config) =>
      ['CONNECTED', 'ACTIVE'].includes(
        normalizeStatus(config.connection_status || config.status)
      )
    ).length,
    totalAiRequests: usageTotals.aiRequests,
    totalMessages: messagesResult.count ?? messagesResult.data?.length ?? 0,
    monthlyRevenue: mrr,
    mrr,
    arr: mrr * 12,
    industryDistribution,
    planDistribution,
  };
}

/** Lists only persisted tenant records and their persisted relationships. */
export async function listAllTenants(filter?: {
  search?: string;
  industry?: string;
  plan?: string;
  status?: string;
}): Promise<TenantAdminView[]> {
  const db = getAdminClient();
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const [
    accountsResult,
    profilesResult,
    subscriptionsResult,
    contactsResult,
    whatsappResult,
    usageResult,
  ] = await Promise.all([
    db.from('accounts').select('*'),
    db.from('profiles').select('*'),
    db.from('subscriptions').select('*, plan:plans(*)'),
    db.from('contacts').select('id, account_id'),
    db.from('whatsapp_configs').select('*'),
    db
      .from('usage_tracking')
      .select('account_id, ai_requests, whatsapp_messages')
      .eq('month', currentMonth),
  ]);

  assertDatabaseResult(accountsResult.error, 'Failed to load accounts');
  assertDatabaseResult(profilesResult.error, 'Failed to load profiles');
  assertDatabaseResult(
    subscriptionsResult.error,
    'Failed to load subscriptions'
  );
  assertDatabaseResult(contactsResult.error, 'Failed to load contacts');
  assertDatabaseResult(
    whatsappResult.error,
    'Failed to load WhatsApp accounts'
  );
  assertDatabaseResult(usageResult.error, 'Failed to load usage');

  const accounts = (accountsResult.data || []) as Record<string, unknown>[];
  const profiles = (profilesResult.data || []) as Record<string, unknown>[];
  const subscriptions = (subscriptionsResult.data || []) as Record<
    string,
    unknown
  >[];
  const contacts = (contactsResult.data || []) as Record<string, unknown>[];
  const whatsapp = (whatsappResult.data || []) as Record<string, unknown>[];
  const usage = (usageResult.data || []) as Record<string, unknown>[];

  let tenants = await Promise.all(
    accounts.map(async (account): Promise<TenantAdminView> => {
      const accountId = String(account.id || '');
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
        );
      const subscription = subscriptions.find(
        (row) => String(row.account_id || '') === accountId
      );
      const config = whatsapp.find(
        (row) => String(row.account_id || '') === accountId
      );
      const usageRow = usage.find(
        (row) => String(row.account_id || '') === accountId
      );
      const subscriptionStatus = normalizeStatus(
        subscription?.status || account.subscription_status
      );
      const suspended =
        account.is_suspended === true ||
        normalizeStatus(account.status) === 'SUSPENDED';
      const configStatus = normalizeStatus(
        config?.connection_status || config?.status
      );
      const planName = planDisplayName(account, subscription);
      const identifier = planIdentifier(account, subscription);
      const plan = identifier
        ? await getPlanById(identifier).catch(() => null)
        : null;
      const aiRequests = finiteNonNegative(usageRow?.ai_requests) || 0;
      const whatsappMessages =
        finiteNonNegative(usageRow?.whatsapp_messages) || 0;
      const aiLimit = plan?.usageLimits.aiMessages || 0;
      const whatsappLimit = plan?.usageLimits.whatsappMessages || 0;

      return {
        id: accountId,
        name: String(account.name || accountId),
        industry: String(account.industry || 'unassigned'),
        plan: planName,
        subscriptionStatus,
        tenantStatus: tenantStatus(suspended, subscriptionStatus),
        ownerEmail: owner?.email ? String(owner.email) : undefined,
        ownerName: owner
          ? String(owner.full_name || owner.name || '') || undefined
          : undefined,
        membersCount: accountProfiles.length,
        contactsCount: contacts.filter(
          (contact) => String(contact.account_id || '') === accountId
        ).length,
        whatsAppStatus: ['CONNECTED', 'ACTIVE'].includes(configStatus)
          ? 'Connected'
          : config
            ? 'Pending'
            : 'Disconnected',
        whatsAppNumber: config?.display_phone_number
          ? String(config.display_phone_number)
          : config?.phone_number
            ? String(config.phone_number)
            : undefined,
        wabaId: config?.waba_id ? String(config.waba_id) : undefined,
        phoneNumberId: config?.phone_number_id
          ? String(config.phone_number_id)
          : undefined,
        aiUsagePercent: aiLimit
          ? Math.min(100, Math.round((aiRequests / aiLimit) * 100))
          : 0,
        whatsappUsagePercent: whatsappLimit
          ? Math.min(100, Math.round((whatsappMessages / whatsappLimit) * 100))
          : 0,
        createdAt: String(account.created_at || ''),
        lastActive: String(account.updated_at || account.created_at || ''),
      };
    })
  );

  if (filter?.search?.trim()) {
    const query = filter.search.trim().toLowerCase();
    tenants = tenants.filter(
      (tenant) =>
        tenant.name.toLowerCase().includes(query) ||
        tenant.id.toLowerCase().includes(query) ||
        tenant.ownerEmail?.toLowerCase().includes(query)
    );
  }
  if (filter?.industry?.trim()) {
    const industry = filter.industry.trim().toLowerCase();
    tenants = tenants.filter(
      (tenant) => tenant.industry.toLowerCase() === industry
    );
  }
  if (filter?.plan?.trim()) {
    const plan = filter.plan.trim().toLowerCase();
    tenants = tenants.filter((tenant) => tenant.plan.toLowerCase() === plan);
  }
  if (filter?.status?.trim()) {
    const status = filter.status.trim().toLowerCase();
    tenants = tenants.filter(
      (tenant) => tenant.tenantStatus.toLowerCase() === status
    );
  }

  return tenants;
}

async function requireAccount(workspaceId: string): Promise<void> {
  if (!workspaceId?.trim()) throw new Error('Tenant ID is required');
  const { data, error } = await getAdminClient()
    .from('accounts')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle();
  assertDatabaseResult(error, 'Failed to verify tenant');
  if (!data) throw new Error('Tenant not found');
}

export async function suspendTenant({
  actorEmail,
  workspaceId,
  reason,
}: {
  actorEmail: string;
  workspaceId: string;
  reason?: string;
}): Promise<boolean> {
  await requireAccount(workspaceId);
  const { error } = await getAdminClient()
    .from('accounts')
    .update({
      is_suspended: true,
      status: 'SUSPENDED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId);
  assertDatabaseResult(error, 'Failed to suspend tenant');

  await logAdminAction({
    actorEmail,
    action: 'tenant:suspended',
    targetType: 'tenant',
    targetId: workspaceId,
    workspaceId,
    metadata: { reason },
  });
  return true;
}

export async function reactivateTenant({
  actorEmail,
  workspaceId,
}: {
  actorEmail: string;
  workspaceId: string;
}): Promise<boolean> {
  await requireAccount(workspaceId);
  const { error } = await getAdminClient()
    .from('accounts')
    .update({
      is_suspended: false,
      status: 'ACTIVE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId);
  assertDatabaseResult(error, 'Failed to reactivate tenant');

  await logAdminAction({
    actorEmail,
    action: 'tenant:reactivated',
    targetType: 'tenant',
    targetId: workspaceId,
    workspaceId,
  });
  return true;
}

export async function extendTenantTrial({
  actorEmail,
  workspaceId,
  additionalDays = 7,
  reason,
}: {
  actorEmail: string;
  workspaceId: string;
  additionalDays?: number;
  reason?: string;
}): Promise<{ trialEnd: string }> {
  if (
    !Number.isInteger(additionalDays) ||
    additionalDays < 1 ||
    additionalDays > 365
  ) {
    throw new Error('Trial extension must be between 1 and 365 days');
  }
  await requireAccount(workspaceId);

  const db = getAdminClient();
  const { data: subscription, error: lookupError } = await db
    .from('subscriptions')
    .select('id, end_date')
    .eq('account_id', workspaceId)
    .maybeSingle();
  assertDatabaseResult(lookupError, 'Failed to load subscription');
  if (!subscription) throw new Error('Subscription not found');

  const currentEnd = subscription.end_date
    ? new Date(subscription.end_date).getTime()
    : 0;
  const base = Math.max(
    Date.now(),
    Number.isFinite(currentEnd) ? currentEnd : 0
  );
  const trialEnd = new Date(base + additionalDays * 86400 * 1000).toISOString();

  const { error } = await db
    .from('subscriptions')
    .update({
      status: 'trial',
      end_date: trialEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    .eq('account_id', workspaceId);
  assertDatabaseResult(error, 'Failed to extend trial');

  await logAdminAction({
    actorEmail,
    action: 'trial:extended',
    targetType: 'tenant',
    targetId: workspaceId,
    workspaceId,
    metadata: { additionalDays, trialEnd, reason },
  });
  return { trialEnd };
}

export async function listAllUsers(): Promise<UserAdminView[]> {
  const db = getAdminClient();
  const [profilesResult, accountsResult] = await Promise.all([
    db.from('profiles').select('*'),
    db.from('accounts').select('id, name, industry'),
  ]);
  assertDatabaseResult(profilesResult.error, 'Failed to load users');
  assertDatabaseResult(accountsResult.error, 'Failed to load accounts');

  const accounts = new Map(
    ((accountsResult.data || []) as Record<string, unknown>[]).map(
      (account) => [String(account.id || ''), account]
    )
  );

  return ((profilesResult.data || []) as Record<string, unknown>[]).map(
    (profile) => {
      const workspaceId = String(profile.account_id || '');
      const account = accounts.get(workspaceId);
      return {
        id: String(profile.id || profile.user_id || ''),
        name: String(profile.full_name || profile.name || ''),
        email: String(profile.email || ''),
        workspaceId,
        workspaceName: String(account?.name || ''),
        industry: String(account?.industry || 'unassigned'),
        role: String(
          profile.is_super_admin
            ? 'super_admin'
            : profile.account_role || profile.role || 'member'
        ),
        status: String(profile.status || 'Active'),
        createdAt: String(profile.created_at || ''),
        lastActive: profile.updated_at ? String(profile.updated_at) : undefined,
      };
    }
  );
}
