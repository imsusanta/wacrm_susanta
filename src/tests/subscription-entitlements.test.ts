import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionPlan } from '@/core/billing/types';

const mocks = vi.hoisted(() => ({
  getAdminClient: vi.fn(),
  findPlanBySlug: vi.fn(),
}));
vi.mock('@/lib/db/server', () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock('@/core/billing/plans', () => ({
  findPlanBySlug: mocks.findPlanBySlug,
}));

import {
  checkFeatureAccess,
  checkPlanLimits,
  expireStaleTrials,
  getWorkspaceSubscription,
} from '@/lib/saas/subscription';

const NOW = '2026-09-05T17:00:00.000Z';
const ACCOUNT = 'account-a';
const PLAN: SubscriptionPlan = {
  id: 'plan_starter',
  name: 'Starter',
  slug: 'starter',
  description: '',
  setupFee: 7999,
  monthlyPrice: 3499,
  yearlyPrice: 34990,
  currency: 'INR',
  billingInterval: 'monthly',
  isRecommended: false,
  isActive: true,
  displayOrder: 1,
  features: ['core.inbox'],
  usageLimits: {
    aiMessages: 1500,
    whatsappMessages: 3000,
    teamMembers: 3,
    campaignMessages: 1000,
    contacts: 1500,
  },
};
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'subscription-a',
  account_id: ACCOUNT,
  plan_slug: 'starter',
  status: 'active',
  start_date: '2026-09-01T00:00:00.000Z',
  end_date: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

type Reply = {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
};
type Operation = { method: string; args: unknown[] };
type Query = { table: string; operations: Operation[] };
interface Builder extends PromiseLike<Reply> {
  select(...args: unknown[]): Builder;
  update(...args: unknown[]): Builder;
  eq(...args: unknown[]): Builder;
  lte(...args: unknown[]): Builder;
  maybeSingle(): Promise<Reply>;
}
const ok = (data: unknown, count?: number): Reply => ({
  data,
  error: null,
  count,
});

function database(replies: Reply[]) {
  const queries: Query[] = [];
  const queue = [...replies];
  const from = vi.fn((table: string) => {
    const reply = queue.shift();
    if (!reply) throw new Error('Unexpected database query');
    const query: Query = { table, operations: [] };
    queries.push(query);
    const record = (method: string, args: unknown[]) => {
      query.operations.push({ method, args });
      return builder;
    };
    const builder: Builder = {
      select: (...args) => record('select', args),
      update: (...args) => record('update', args),
      eq: (...args) => record('eq', args),
      lte: (...args) => record('lte', args),
      maybeSingle: async () => reply,
      then: (resolve, reject) => Promise.resolve(reply).then(resolve, reject),
    };
    return builder;
  });
  mocks.getAdminClient.mockReturnValue({ from });
  return queries;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.findPlanBySlug.mockResolvedValue(PLAN);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('subscription access verification', () => {
  it('allows an explicitly listed feature inside the paid period', async () => {
    database([ok(row())]);
    expect((await checkFeatureAccess(ACCOUNT, 'core.inbox')).allowed).toBe(
      true
    );
  });

  it.each(['active', 'trial'])(
    'denies expired %s access at the end boundary',
    async (status) => {
      database([ok(row({ status, end_date: NOW }))]);
      const result = await checkFeatureAccess(ACCOUNT, 'core.inbox');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    }
  );

  it('exposes the effective expired status without changing the database', async () => {
    const queries = database([ok(row({ end_date: NOW }))]);
    expect((await getWorkspaceSubscription(ACCOUNT)).subscription.status).toBe(
      'EXPIRED'
    );
    expect(
      queries.every((query) =>
        query.operations.every((op) => op.method !== 'update')
      )
    ).toBe(true);
  });

  it('does not query usage after discovering an expired subscription', async () => {
    const queries = database([ok(row({ end_date: NOW }))]);
    expect((await checkPlanLimits(ACCOUNT, 'max_users')).allowed).toBe(false);
    expect(queries).toHaveLength(1);
  });

  it.each([
    { start_date: '2026-10-01T00:00:00Z', end_date: '2026-11-01T00:00:00Z' },
    { start_date: 'invalid' },
    { end_date: 'invalid' },
    { status: 'unknown' },
    { status: 'cancelled' },
  ])(
    'denies an invalid, future, or inactive subscription: %j',
    async (overrides) => {
      database([ok(row(overrides))]);
      expect((await checkFeatureAccess(ACCOUNT, 'core.inbox')).allowed).toBe(
        false
      );
    }
  );

  it('does not give Pro arbitrary unlisted features', async () => {
    database([ok(row())]);
    mocks.findPlanBySlug.mockResolvedValue({
      ...PLAN,
      slug: 'pro',
      name: 'Pro',
    });
    expect(
      (await checkFeatureAccess(ACCOUNT, 'unknown.privileged_feature')).allowed
    ).toBe(false);
  });

  it('fails closed for a missing subscription', async () => {
    database([ok(null)]);
    expect((await checkFeatureAccess(ACCOUNT, 'core.inbox')).allowed).toBe(
      false
    );
  });

  it('fails closed on subscription database errors', async () => {
    database([{ data: null, error: { message: 'unavailable' } }]);
    expect((await checkFeatureAccess(ACCOUNT, 'core.inbox')).allowed).toBe(
      false
    );
  });

  it.each([null, { ...PLAN, isActive: false }])(
    'fails closed for an unavailable plan',
    async (plan) => {
      database([ok(row())]);
      mocks.findPlanBySlug.mockResolvedValue(plan);
      expect((await checkFeatureAccess(ACCOUNT, 'core.inbox')).allowed).toBe(
        false
      );
    }
  );

  it('fails closed when the plan lookup throws', async () => {
    database([ok(row())]);
    mocks.findPlanBySlug.mockRejectedValue(new Error('catalog unavailable'));
    expect((await checkFeatureAccess(ACCOUNT, 'core.inbox')).allowed).toBe(
      false
    );
  });

  it('counts only active members in the requested account', async () => {
    const queries = database([ok(row()), ok(null, 2)]);
    const result = await checkPlanLimits(ACCOUNT, 'max_users');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(queries[1].table).toBe('account_members');
    expect(queries[1].operations).toContainEqual({
      method: 'eq',
      args: ['account_id', ACCOUNT],
    });
    expect(queries[1].operations).toContainEqual({
      method: 'eq',
      args: ['active', true],
    });
  });

  it('fails closed when usage cannot be counted', async () => {
    database([
      ok(row()),
      { data: null, count: null, error: { message: 'count unavailable' } },
    ]);
    expect((await checkPlanLimits(ACCOUNT, 'max_users')).allowed).toBe(false);
  });
});

describe('expiry worker renewal race', () => {
  it('rechecks the original status and expiry on every scoped update', async () => {
    const queries = database([
      ok([{ id: 'trial-a', account_id: ACCOUNT }]),
      ok([{ id: 'active-a', account_id: ACCOUNT }]),
      ok([]),
      ok([]),
    ]);
    const result = await expireStaleTrials();
    expect(result).toEqual({ expiredTrialsCount: 0, expiredSubsCount: 0 });
    for (const [index, status, id] of [
      [2, 'trial', 'trial-a'],
      [3, 'active', 'active-a'],
    ] as const) {
      expect(queries[index].operations).toContainEqual({
        method: 'eq',
        args: ['account_id', ACCOUNT],
      });
      expect(queries[index].operations).toContainEqual({
        method: 'eq',
        args: ['id', id],
      });
      expect(queries[index].operations).toContainEqual({
        method: 'eq',
        args: ['status', status],
      });
      expect(queries[index].operations).toContainEqual({
        method: 'lte',
        args: ['end_date', NOW],
      });
      expect(queries[index].operations).toContainEqual({
        method: 'select',
        args: ['id'],
      });
    }
  });

  it('counts affected rows rather than the original stale selection', async () => {
    database([
      ok([{ id: 'trial-a', account_id: ACCOUNT }]),
      ok([{ id: 'active-a', account_id: ACCOUNT }]),
      ok([{ id: 'trial-a' }]),
      ok([]),
    ]);
    expect(await expireStaleTrials()).toEqual({
      expiredTrialsCount: 1,
      expiredSubsCount: 0,
    });
  });

  it('does not report success after an expiration update fails', async () => {
    database([
      ok([{ id: 'trial-a', account_id: ACCOUNT }]),
      ok([]),
      { data: null, error: { message: 'write failed' } },
    ]);
    await expect(expireStaleTrials()).rejects.toThrow('Failed to expire trial');
  });
});
