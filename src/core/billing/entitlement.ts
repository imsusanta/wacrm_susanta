import type { SubscriptionStatus, WorkspaceSubscription } from './types';

type EntitlementPeriod = Pick<
  WorkspaceSubscription,
  'status' | 'currentPeriodStart' | 'currentPeriodEnd'
>;

/**
 * Entitlements are valid on [start, end), independent of the expiry worker.
 * Invalid and future periods fail closed. This is a read-time decision, not
 * a write to billing state, so a delayed worker cannot extend paid access.
 */
export function getEffectiveSubscriptionStatus(
  subscription: EntitlementPeriod,
  now = Date.now()
): SubscriptionStatus {
  const { status } = subscription;
  if (status !== 'ACTIVE' && status !== 'TRIAL') return status;

  const start = Date.parse(subscription.currentPeriodStart);
  const end = Date.parse(subscription.currentPeriodEnd);
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start >= end ||
    now < start
  ) {
    return 'INCOMPLETE';
  }
  if (now >= end) return status === 'TRIAL' ? 'TRIAL_EXPIRED' : 'EXPIRED';
  return status;
}

export function hasCurrentEntitlement(
  subscription: EntitlementPeriod,
  now = Date.now()
): boolean {
  const status = getEffectiveSubscriptionStatus(subscription, now);
  return status === 'ACTIVE' || status === 'TRIAL';
}
