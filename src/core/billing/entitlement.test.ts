import { describe, expect, it } from 'vitest';
import {
  getEffectiveSubscriptionStatus,
  hasCurrentEntitlement,
} from './entitlement';
import type { SubscriptionStatus } from './types';

const start = '2026-09-01T00:00:00.000Z';
const end = '2026-10-01T00:00:00.000Z';
const now = Date.parse('2026-09-05T17:00:00.000Z');
const period = (status: SubscriptionStatus = 'ACTIVE') => ({
  status,
  currentPeriodStart: start,
  currentPeriodEnd: end,
});

describe('subscription entitlement period', () => {
  it.each(['ACTIVE', 'TRIAL'] as const)(
    'allows a current %s period',
    (status) => {
      expect(hasCurrentEntitlement(period(status), now)).toBe(true);
    }
  );

  it('includes the start boundary and excludes the end boundary', () => {
    expect(hasCurrentEntitlement(period(), Date.parse(start) - 1)).toBe(false);
    expect(hasCurrentEntitlement(period(), Date.parse(start))).toBe(true);
    expect(hasCurrentEntitlement(period(), Date.parse(end) - 1)).toBe(true);
    expect(hasCurrentEntitlement(period(), Date.parse(end))).toBe(false);
  });

  it('expires access without waiting for the housekeeping job', () => {
    const afterEnd = Date.parse(end) + 1;
    expect(getEffectiveSubscriptionStatus(period(), afterEnd)).toBe('EXPIRED');
    expect(getEffectiveSubscriptionStatus(period('TRIAL'), afterEnd)).toBe(
      'TRIAL_EXPIRED'
    );
  });

  it.each([
    ['invalid start', 'invalid', end],
    ['invalid end', start, 'invalid'],
    ['empty start', '', end],
    ['empty end', start, ''],
    ['reversed period', end, start],
    ['zero-length period', start, start],
    ['future period', end, '2026-11-01T00:00:00.000Z'],
  ])('fails closed for %s', (_name, currentPeriodStart, currentPeriodEnd) => {
    const subscription = { ...period(), currentPeriodStart, currentPeriodEnd };
    expect(hasCurrentEntitlement(subscription, now)).toBe(false);
    expect(getEffectiveSubscriptionStatus(subscription, now)).toBe(
      'INCOMPLETE'
    );
  });

  it.each([
    'CANCELLED',
    'PAST_DUE',
    'PAUSED',
    'PENDING_PAYMENT',
    'EXPIRED',
    'TRIAL_EXPIRED',
    'INCOMPLETE',
    'TRIALING',
  ] as const)(
    'does not reactivate %s because its dates are current',
    (status) => {
      expect(hasCurrentEntitlement(period(status), now)).toBe(false);
      expect(getEffectiveSubscriptionStatus(period(status), now)).toBe(status);
    }
  );

  it('compares timezone-aware instants rather than date strings', () => {
    const subscription = {
      ...period(),
      currentPeriodStart: '2026-09-05T22:30:00+05:30',
      currentPeriodEnd: '2026-09-05T23:30:00+05:30',
    };
    expect(hasCurrentEntitlement(subscription, now)).toBe(true);
    expect(hasCurrentEntitlement(subscription, now + 3_600_000)).toBe(false);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'fails closed when the clock is invalid (%s)',
    (clock) => expect(hasCurrentEntitlement(period(), clock)).toBe(false)
  );

  it('does not mutate persisted billing state', () => {
    const subscription = Object.freeze(period());
    getEffectiveSubscriptionStatus(subscription, Date.parse(end));
    expect(subscription.status).toBe('ACTIVE');
  });
});
