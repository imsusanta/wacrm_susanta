import type { Metadata } from 'next';
import { Zap } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { LandingPricingSection } from '@/components/landing/pricing-section';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  SoftwareApplicationJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Transparent Pricing Plans & Free Trial',
  description:
    'Transparent WhatsApp AI receptionist and patient communication pricing for independent clinics. Free trial included.',
  keywords: [
    'WhatsApp CRM Pricing India',
    'WhatsApp AI Receptionist Cost',
    'Affordable WhatsApp Cloud API CRM',
    'Clinic Management WhatsApp Pricing',
  ],
  alternates: {
    canonical: 'https://helpa.studio/pricing',
  },
  openGraph: {
    title: 'Transparent Pricing Plans | Helpa Studio',
    description:
      'Simple, transparent pricing designed for Indian businesses. Start with a 14-day free trial.',
    url: 'https://helpa.studio/pricing',
  },
};

const PRICING_FAQS = [
  {
    question: 'Is there a free trial available?',
    answer:
      'Yes! Every new account comes with a full-featured 14-day free trial with no credit card required.',
  },
  {
    question: 'How are Meta conversation charges billed?',
    answer:
      'Meta charges conversation fees based on category (Service, Utility, Marketing, Authentication). Helpa passes through official Meta rates directly with zero markup or hidden platform surcharges.',
  },
  {
    question: 'Can I upgrade, downgrade, or cancel anytime?',
    answer:
      'Yes. You can change plans or cancel your subscription at any time directly from your billing dashboard with our 14-day money-back guarantee.',
  },
  {
    question: 'Do you offer annual discounts?',
    answer:
      'Yes, annual billing comes with 2 months free (up to 20% discount across all plans).',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Pricing', url: 'https://helpa.studio/pricing' },
        ]}
      />
      <FaqJsonLd items={PRICING_FAQS} />
      <SoftwareApplicationJsonLd />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <Zap className="h-4 w-4 text-emerald-600" />
              Transparent Pricing • No Hidden Costs
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Simple Plans that Grow with Your{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Business
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Start with a 14-day free trial. No credit card required. Upgrade
              as your team and inquiry volume grow.
            </p>
          </div>
        </section>

        {/* Pricing component */}
        <LandingPricingSection />

        {/* Pricing FAQs */}
        <section className="mx-auto mt-16 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions About Billing
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {PRICING_FAQS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <h3 className="text-base font-bold text-[#110E3D]">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
