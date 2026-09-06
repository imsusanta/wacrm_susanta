import { getAdminClient } from '@/lib/db/server';
import { findPlanBySlug } from '@/core/billing/plans';
import {
  getEffectiveSubscriptionStatus,
  hasCurrentEntitlement,
} from '@/core/billing/entitlement';
import type {
  FeatureAccessResult,
  SubscriptionPlan,
  UsageLimitCheckResult,
  WorkspaceSubscription,
} from '@/core/billing/types';

export type PlanLimitKey =
  | 'max_users'
  | 'max_contacts'
  | 'max_ai_requests'
  | 'whatsapp_messages'
  | 'automations';

function requireAccountId(accountId: string): string {
  const value = accountId?.trim();
  if (!value) throw new Error('accountId is required');
  if (value.length > 128) throw new Error('accountId is invalid');
  return value;
}

function assertDatabaseResult(
  error: { message?: string } | null | undefined,
  operation: string
): void {
  if (error)
    throw new Error(`${operation}: ${error.message || 'database error'}`);
}

function relationRecord(value: unknown): Record<string, unknown> | null {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === 'object'
    ? (relation as Record<string, unknown>)
    : null;
}

function resultRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return resultRecord(value[0]);
  return relationRecord(value);
}

function normalizeSubscriptionStatus(
  raw: unknown
): WorkspaceSubscription['status'] {
  switch (
    String(raw || '')
      .trim()
      .toUpperCase()
  ) {
    case 'TRIAL':
    case 'TRIALING':
      return 'TRIAL';
    case 'ACTIVE':
      return 'ACTIVE';
    case 'PAST_DUE':
      return 'PAST_DUE';
    case 'PAUSED':
      return 'PAUSED';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'TRIAL_EXPIRED':
      return 'TRIAL_EXPIRED';
    case 'PENDING_PAYMENT':
      return 'PENDING_PAYMENT';
    default:
      return 'INCOMPLETE';
  }
}

function deniedLimit(reason: string): UsageLimitCheckResult {
  return {
    allowed: false,
    currentUsage: 0,
    limit: 0,
    remaining: 0,
    percentageUsed: 100,
    warningLevel: '100%',
    reason,
  };
}

function validUsage(value: unknown): number {
  const usage = Number(value);
  if (!Number.isFinite(usage) || usage < 0) {
    throw new Error('Stored usage is invalid');
  }
  return usage;
}

export async function getWorkspaceSubscription(
  accountId: string
): Promise<{ subscription: WorkspaceSubscription; plan: SubscriptionPlan }> {
  const workspaceId = requireAccountId(accountId);
  const { data: subscriptionRow, error } = await getAdminClient()
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('account_id', workspaceId)
    .maybeSingle();
  assertDatabaseResult(error, 'Failed to load subscription');
  if (!subscriptionRow) throw new Error('Subscription not found');

  const planRelation = relationRecord(subscriptionRow.plan);
  const planIdentifier = String(
    subscriptionRow.plan_slug ||
      planRelation?.slug ||
      planRelation?.name ||
      planRelation?.id ||
      subscriptionRow.plan_id ||
      ''
  ).trim();
  if (!planIdentifier) throw new Error('Subscription plan is missing');

  const plan = await findPlanBySlug(planIdentifier);
  if (!plan || !plan.isActive) {
    throw new Error('Subscription plan is unknown or inactive');
  }

  const id = String(subscriptionRow.id || '').trim();
  const periodStart = String(
    subscriptionRow.start_date || subscriptionRow.current_period_start || ''
  ).trim();
  const periodEnd = String(
    subscriptionRow.end_date || subscriptionRow.current_period_end || ''
  ).trim();
  if (!id || !periodStart || !periodEnd) {
    throw new Error('Subscription record is incomplete');
  }

  const status = getEffectiveSubscriptionStatus({
    status: normalizeSubscriptionStatus(subscriptionRow.status),
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  });

  return {
    subscription: {
      id,
      workspaceId,
      planId: plan.id,
      planSlug: plan.slug,
      status,
      billingCycle:
        subscriptionRow.billing_cycle === 'yearly' ? 'yearly' : 'monthly',
      setupFeePaid: subscriptionRow.setup_fee_paid === true,
      setupFeeAmount: Number(subscriptionRow.setup_fee_amount || 0),
      monthlyAmount: Number(subscriptionRow.monthly_amount || 0),
      currency: String(subscriptionRow.currency || plan.currency),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscriptionRow.cancel_at_period_end === true,
      cancelledAt: subscriptionRow.cancelled_at || undefined,
      paymentProvider: String(subscriptionRow.payment_provider || ''),
      createdAt: String(subscriptionRow.created_at || periodStart),
      updatedAt: String(subscriptionRow.updated_at || periodStart),
    },
    plan,
  };
}

export async function checkFeatureAccess(
  accountId: string,
  featureKey: string
): Promise<FeatureAccessResult> {
  const normalizedFeature = featureKey?.trim();
  if (!normalizedFeature) {
    return {
      allowed: false,
      featureKey: '',
      reason: 'Feature key is required.',
    };
  }

  try {
    const { subscription, plan } = await getWorkspaceSubscription(accountId);
    if (!hasCurrentEntitlement(subscription)) {
      return {
        allowed: false,
        featureKey: normalizedFeature,
        requiredPlan: plan.name,
        reason: `Your subscription is ${subscription.status.toLowerCase().replace(/_/g, ' ')}. Please activate or renew your plan to access this feature.`,
      };
    }

    const allowed =
      plan.features.includes(normalizedFeature) ||
      plan.features.includes('all');
    return allowed
      ? { allowed: true, featureKey: normalizedFeature }
      : {
          allowed: false,
          featureKey: normalizedFeature,
          requiredPlan: 'Growth ⭐ or Pro',
          reason: `The feature "${normalizedFeature}" is not included in your ${plan.name} plan. Upgrade to unlock this feature.`,
        };
  } catch {
    console.error('[checkFeatureAccess] Entitlement verification failed');
    return {
      allowed: false,
      featureKey: normalizedFeature,
      reason: 'Unable to verify your subscription. Please try again.',
    };
  }
}

export async function checkPlanLimits(
  accountId: string,
  limitKey: PlanLimitKey
): Promise<UsageLimitCheckResult> {
  try {
    const workspaceId = requireAccountId(accountId);
    const db = getAdminClient();
    const { subscription, plan } = await getWorkspaceSubscription(workspaceId);
    if (!hasCurrentEntitlement(subscription)) {
      return deniedLimit(
        `Your subscription is ${subscription.status.toLowerCase().replace(/_/g, ' ')}. Please renew before using this resource.`
      );
    }

    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    let currentUsage: number;
    let limit: number;

    if (limitKey === 'max_users') {
      limit = plan.usageLimits.teamMembers;
      const result = await db
        .from('account_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('account_id', workspaceId)
        .eq('active', true);
      assertDatabaseResult(result.error, 'Failed to count members');
      currentUsage = validUsage(result.count ?? 0);
    } else if (limitKey === 'max_contacts') {
      limit = plan.usageLimits.contacts;
      const result = await db
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', workspaceId);
      assertDatabaseResult(result.error, 'Failed to count contacts');
      currentUsage = validUsage(result.count ?? 0);
    } else if (limitKey === 'max_ai_requests') {
      limit = plan.usageLimits.aiMessages;
      const result = await db
        .from('usage_tracking')
        .select('ai_requests')
        .eq('account_id', workspaceId)
        .eq('month', currentMonth)
        .maybeSingle();
      assertDatabaseResult(result.error, 'Failed to load AI usage');
      currentUsage = validUsage(result.data?.ai_requests ?? 0);
    } else if (limitKey === 'whatsapp_messages') {
      limit = plan.usageLimits.whatsappMessages;
      const result = await db
        .from('usage_tracking')
        .select('whatsapp_messages')
        .eq('account_id', workspaceId)
        .eq('month', currentMonth)
        .maybeSingle();
      assertDatabaseResult(result.error, 'Failed to load WhatsApp usage');
      currentUsage = validUsage(result.data?.whatsapp_messages ?? 0);
    } else {
      limit = plan.usageLimits.automations || 0;
      const result = await db
        .from('automations')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', workspaceId);
      assertDatabaseResult(result.error, 'Failed to count automations');
      currentUsage = validUsage(result.count ?? 0);
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      return deniedLimit(
        'This resource is not available on your current plan.'
      );
    }

    const remaining = Math.max(0, limit - currentUsage);
    const percentageUsed = Math.min(
      100,
      Math.round((currentUsage / limit) * 100)
    );
    const allowed = currentUsage < limit;
    let warningLevel: '80%' | '90%' | '100%' | undefined;
    if (percentageUsed >= 100) warningLevel = '100%';
    else if (percentageUsed >= 90) warningLevel = '90%';
    else if (percentageUsed >= 80) warningLevel = '80%';

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
      percentageUsed,
      warningLevel,
      reason: allowed
        ? undefined
        : `Your monthly ${limitKey.replace(/_/g, ' ')} limit (${limit}) has been reached. Please upgrade your plan to continue.`,
    };
  } catch {
    console.error('[checkPlanLimits] Limit verification failed');
    return deniedLimit('Unable to verify usage limits. Please try again.');
  }
}

export async function incrementUsage(
  accountId: string,
  metric: 'ai_requests' | 'whatsapp_messages',
  quantity = 1
): Promise<void> {
  const workspaceId = requireAccountId(accountId);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100_000) {
    throw new Error('Usage quantity is invalid');
  }

  const { data, error } = await getAdminClient().rpc(
    'increment_usage_tracking',
    {
      p_account_id: workspaceId,
      p_metric: metric,
      p_quantity: quantity,
    }
  );
  assertDatabaseResult(error, 'Failed to increment usage');
  if (!resultRecord(data)?.ok) throw new Error('Failed to increment usage');
}

export async function expireStaleTrials(): Promise<{
  expiredTrialsCount: number;
  expiredSubsCount: number;
}> {
  const db = getAdminClient();
  const now = new Date().toISOString();
  const trialsResult = await db
    .from('subscriptions')
    .select('id, account_id')
    .eq('status', 'trial')
    .lte('end_date', now);
  assertDatabaseResult(trialsResult.error, 'Failed to load stale trials');

  const subscriptionsResult = await db
    .from('subscriptions')
    .select('id, account_id')
    .eq('status', 'active')
    .lte('end_date', now);
  assertDatabaseResult(
    subscriptionsResult.error,
    'Failed to load expired subscriptions'
  );

  let expiredTrialsCount = 0;
  for (const trial of trialsResult.data || []) {
    // Recheck eligibility at the write so a concurrent renewal wins safely.
    const result = await db
      .from('subscriptions')
      .update({ status: 'expired', updated_at: now })
      .eq('id', trial.id)
      .eq('account_id', trial.account_id)
      .eq('status', 'trial')
      .lte('end_date', now)
      .select('id');
    assertDatabaseResult(result.error, 'Failed to expire trial');
    expiredTrialsCount += result.data?.length ?? 0;
  }

  let expiredSubsCount = 0;
  for (const subscription of subscriptionsResult.data || []) {
    const result = await db
      .from('subscriptions')
      .update({ status: 'expired', updated_at: now })
      .eq('id', subscription.id)
      .eq('account_id', subscription.account_id)
      .eq('status', 'active')
      .lte('end_date', now)
      .select('id');
    assertDatabaseResult(result.error, 'Failed to expire subscription');
    expiredSubsCount += result.data?.length ?? 0;
  }

  return { expiredTrialsCount, expiredSubsCount };
}
