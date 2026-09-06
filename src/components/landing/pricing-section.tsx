'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap } from 'lucide-react';

interface DisplayPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  setupFee: number;
  monthlyPrice: number;
  currencySymbol: string;
  isRecommended: boolean;
  features: string[];
}

const DEFAULT_DISPLAY_PLANS: DisplayPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter',
    slug: 'starter',
    description:
      'For a small clinic starting with WhatsApp enquiries and appointment reminders.',
    setupFee: 9999,
    monthlyPrice: 4999,
    currencySymbol: '₹',
    isRecommended: false,
    features: [
      '1 WhatsApp Business Number',
      '1,500 Patient Contacts',
      '1,500 AI Messages / mo',
      'Appointment Booking & Reminders',
      'Shared Reception Inbox',
      'Clinic Knowledge Base',
      'Standard Support',
      'Free Onboarding Assistance',
    ],
  },
  {
    id: 'plan_growth',
    name: 'Growth',
    slug: 'growth',
    description:
      'For growing outpatient teams that need automation, pipelines, and more capacity.',
    setupFee: 19999,
    monthlyPrice: 14999,
    currencySymbol: '₹',
    isRecommended: true,
    features: [
      '3 WhatsApp Business Numbers',
      '10,000 Patient Contacts',
      '5,000 AI Messages / mo',
      'Staff Copilot Suggestions',
      'Patient & Appointment Pipelines',
      'Broadcast Campaigns & Automations',
      'Multiple Staff Seats',
      'Priority Support',
    ],
  },
  {
    id: 'plan_pro',
    name: 'Enterprise',
    slug: 'enterprise',
    description:
      'For multi-location clinics with larger reception teams and custom workflows.',
    setupFee: 29999,
    monthlyPrice: 29999,
    currencySymbol: '₹',
    isRecommended: false,
    features: [
      'Unlimited WhatsApp Numbers',
      '50,000 Patient Contacts',
      '25,000 AI Messages / mo',
      'Custom AI Training & Workflows',
      'Visual Flow Builder & Webhooks',
      'Dedicated Account Manager',
      'Deployment & SLA Review',
    ],
  },
];

export function LandingPricingSection() {
  const [plans, setPlans] = useState<DisplayPlan[]>(DEFAULT_DISPLAY_PLANS);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'monthly'
  );

  useEffect(() => {
    fetch('/api/plans')
      .then((res) => (res.ok ? res.json() : null))
      .then((apiPlans) => {
        if (!Array.isArray(apiPlans) || apiPlans.length === 0) return;
        setPlans(
          apiPlans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            slug: plan.slug,
            description:
              plan.description ||
              'WhatsApp patient communication and appointment automation for clinics.',
            setupFee: Number(plan.setup_fee || 0),
            monthlyPrice: Number(plan.monthly_price || 0),
            currencySymbol: plan.currency_symbol || '₹',
            isRecommended: Boolean(plan.is_recommended),
            features: Array.isArray(plan.features)
              ? plan.features.slice(0, 7)
              : [
                  `${plan.max_contacts || 5000} Patient Contacts`,
                  `${plan.max_ai_requests || 1500} AI Messages`,
                  'Clinic WhatsApp CRM',
                ],
          }))
        );
      })
      .catch(() => undefined);
  }, []);

  return (
    <section
      id="pricing"
      className="bg-gradient-to-b from-white via-slate-50/50 to-[#FAF9FC] py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="mb-3 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Clinic Plans
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#110E3D] sm:text-4xl">
            Choose the capacity your clinic needs
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Setup and monthly software fees are shown transparently. Meta
            messaging charges and taxes apply.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#110E3D] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-[#110E3D] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-[#25D366] px-2 py-0.5 text-[9px] font-black text-white">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const recommended = plan.isRecommended || plan.slug === 'growth';
            const price =
              billingCycle === 'annual'
                ? Math.round(plan.monthlyPrice * 0.8)
                : plan.monthlyPrice;
            return (
              <article
                key={plan.id || plan.slug}
                className={`relative flex flex-col justify-between rounded-3xl p-7 transition-all duration-300 ${
                  recommended
                    ? 'scale-[1.03] border-2 border-[#25D366] bg-[#110E3D] text-white shadow-2xl shadow-[#25D366]/20'
                    : 'border border-slate-200/80 bg-white text-slate-900 shadow-sm hover:border-emerald-300 hover:shadow-xl'
                }`}
              >
                {recommended && (
                  <div className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-[#25D366] to-[#4EE3C2] px-4 py-1 text-[10px] font-extrabold tracking-wider text-white uppercase shadow-md shadow-[#25D366]/30">
                    <Sparkles className="h-3 w-3" /> Recommended Choice
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-extrabold">{plan.name}</h3>
                  <p
                    className={`mt-2 min-h-12 text-xs leading-relaxed ${recommended ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    {plan.description}
                  </p>
                  <div className="my-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">
                        {plan.currencySymbol}
                        {price.toLocaleString()}
                      </span>
                      <span className="text-xs opacity-70">/ month</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="mt-1 text-[10px] font-bold text-[#25D366]">
                        Billed annually (20% discount applied)
                      </p>
                    )}
                    <div
                      className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${recommended ? 'text-emerald-300' : 'text-emerald-700'}`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {plan.currencySymbol}
                      {plan.setupFee.toLocaleString()} one-time setup
                    </div>
                  </div>
                  <div
                    className={`space-y-3 border-t pt-4 text-xs ${recommended ? 'border-slate-800' : 'border-slate-100'}`}
                  >
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <Check
                          className={`mt-0.5 h-4 w-4 shrink-0 ${recommended ? 'text-[#B4F73C]' : 'text-emerald-600'}`}
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/signup?plan=${plan.slug}`}
                  className={`mt-8 flex min-h-11 items-center justify-center rounded-full text-xs font-bold ${recommended ? 'bg-gradient-to-r from-[#C4F135] to-[#4EE3C2] text-[#110E3D]' : 'bg-slate-100 text-[#110E3D]'}`}
                >
                  Start {plan.name}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
