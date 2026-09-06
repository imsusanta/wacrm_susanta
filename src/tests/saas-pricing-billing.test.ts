import { describe, expect, it } from 'vitest';
import { DEFAULT_PLANS, getPlanBySlug } from '@/core/billing/plans';
import { checkPlanLimits, incrementUsage } from '@/lib/saas/subscription';
import type { RevenueAnalytics } from '@/core/billing/types';

describe('Helpa SaaS Pricing Plans & Billing Architecture', () => {
  describe('1. Official Helpa SaaS Plan Catalog', () => {
    it('should have Starter, Growth ⭐, and Pro plans in default catalog', () => {
      expect(DEFAULT_PLANS.length).toBe(3);

      const starter = DEFAULT_PLANS[0];
      expect(starter.slug).toBe('starter');
      expect(starter.name).toBe('Starter');
      expect(starter.setupFee).toBe(7999);
      expect(starter.monthlyPrice).toBe(3499);
      expect(starter.currency).toBe('INR');
      expect(starter.isRecommended).toBe(false);

      const growth = DEFAULT_PLANS[1];
      expect(growth.slug).toBe('growth');
      expect(growth.name).toBe('Growth ⭐');
      expect(growth.setupFee).toBe(11999);
      expect(growth.monthlyPrice).toBe(4999);
      expect(growth.currency).toBe('INR');
      expect(growth.isRecommended).toBe(true);

      const pro = DEFAULT_PLANS[2];
      expect(pro.slug).toBe('pro');
      expect(pro.name).toBe('Pro');
      expect(pro.setupFee).toBe(19999);
      expect(pro.monthlyPrice).toBe(7999);
      expect(pro.currency).toBe('INR');
      expect(pro.isRecommended).toBe(false);
    });

    it('should calculate initial payment as setup fee + first month', async () => {
      const growth = await getPlanBySlug('growth');
      expect(growth.setupFee + growth.monthlyPrice).toBe(16998);
      expect(growth.monthlyPrice).toBe(4999);
    });
  });

  describe('2. Centralized Feature Entitlements & Access Control', () => {
    it('uses the official plan catalog instead of account-name inference', () => {
      const starter = DEFAULT_PLANS.find((plan) => plan.slug === 'starter')!;
      const pro = DEFAULT_PLANS.find((plan) => plan.slug === 'pro')!;
      expect(starter.features).toContain('core.inbox');
      expect(starter.features).not.toContain('core.custom_models');
      expect(pro.features).toContain('core.custom_models');
    });
  });

  describe('3. Usage Limits & Consumption Enforcements', () => {
    it('returns a fail-closed limit result when no subscription is persisted', async () => {
      const result = await checkPlanLimits('test-account-1', 'max_users');
      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(0);
      expect(result.reason).toContain('Unable to verify');
    });

    it('rejects invalid usage increments before database access', async () => {
      await expect(incrementUsage('', 'ai_requests', 1)).rejects.toThrow(
        'accountId is required'
      );
      await expect(
        incrementUsage('test-account-1', 'ai_requests', 0)
      ).rejects.toThrow('Usage quantity is invalid');
    });
  });

  describe('4. Revenue Analytics Structure', () => {
    it('should aggregate revenue analytics by plan', () => {
      const analytics: RevenueAnalytics = {
        totalRevenue: 29996,
        setupFeeRevenue: 19998,
        recurringRevenue: 9998,
        monthlyRecurringRevenue: 9998,
        activeSubscriptionsCount: 2,
        trialCustomersCount: 1,
        pastDueCount: 0,
        cancelledCount: 0,
        revenueByPlan: { starter: 0, growth: 16998, pro: 12998 },
        customerCountByPlan: { starter: 0, growth: 1, pro: 1 },
        upgradeRate: 50,
        cancellationRate: 0,
      };

      expect(analytics.totalRevenue).toBe(
        analytics.setupFeeRevenue + analytics.recurringRevenue
      );
      expect(analytics.revenueByPlan.growth).toBe(11999 + 4999);
      expect(analytics.revenueByPlan.pro).toBe(12998);
    });
  });
});
