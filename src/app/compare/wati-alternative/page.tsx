import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Scale, Sparkles } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Helpa vs WATI — Best WhatsApp AI Receptionist & CRM Alternative',
  description:
    'Compare Helpa and WATI for Indian clinics. Review AI receptionist workflows, appointment scheduling, shared inbox tools, and transparent pricing.',
  keywords: [
    'WATI Alternative India',
    'Helpa vs WATI',
    'Best WhatsApp CRM for Clinics India',
    'WATI vs Helpa Comparison',
    'Affordable WhatsApp CRM India',
  ],
  alternates: {
    canonical: 'https://helpa.studio/compare/wati-alternative',
  },
  openGraph: {
    title: 'Helpa vs WATI — WhatsApp AI Receptionist & CRM Comparison | Helpa',
    description:
      'Discover why growing clinics and businesses choose Helpa over WATI for appointment automation and AI receptionist capabilities.',
    url: 'https://helpa.studio/compare/wati-alternative',
  },
};

const COMPARISON_FAQS = [
  {
    question: 'Why do clinics and local businesses choose Helpa over WATI?',
    answer:
      'While WATI is built as a generic broadcast and chatbot tool primarily for large e-commerce support, Helpa is purpose-built for service businesses, clinics, and institutes with built-in doctor slot booking, OPD passes, automated salon scheduling, and instant 2-second AI responses trained on custom business knowledge bases.',
  },
  {
    question: 'Is Helpa more affordable for Indian businesses than WATI?',
    answer:
      'Yes. Helpa offers transparent pricing in INR starting with a free tier and straightforward monthly plans with no hidden markup on Meta conversation fees.',
  },
  {
    question: 'Can I migrate my existing WhatsApp number from WATI to Helpa?',
    answer:
      'Yes! Meta allows easy phone number migration between Business Solution Providers. Our onboarding team assists you in switching your active WABA number to Helpa in under 24 hours with zero downtime.',
  },
];

const COMPARISON_POINTS = [
  {
    feature: 'AI Front Desk & Knowledge Base Training',
    helpa: 'Included (2-sec AI answers on your custom documents)',
    wati: 'Requires expensive add-ons or complex webhook bots',
  },
  {
    feature: 'Built-in Clinic & Doctor Slot Booking',
    helpa: 'Native OPD booking, calendar sync & appointment slips',
    wati: 'Requires external 3rd party tools (Calendly/Zapier)',
  },
  {
    feature: 'Official Meta WhatsApp Cloud API Coexistence',
    helpa: 'Yes, full coexistence supported',
    wati: 'Supported but requires complex setup',
  },
  {
    feature: 'Multi-Agent Shared Team Inbox',
    helpa: 'Included with instant takeover',
    wati: 'Included (tiered seat pricing)',
  },
  {
    feature: 'DPDP Act 2023 & Indian Data Residency',
    helpa: 'Yes, encrypted PostgreSQL on Indian infrastructure',
    wati: 'Global cloud servers',
  },
  {
    feature: 'Transparent Pricing in INR',
    helpa: 'Starting at ₹0 / Free tier, Pro at ₹1,999/mo',
    wati: 'Starts at ₹2,499+/mo with per-user limits',
  },
];

export default function WatiAlternativePage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          {
            name: 'Compare',
            url: 'https://helpa.studio/compare/wati-alternative',
          },
          {
            name: 'Helpa vs WATI',
            url: 'https://helpa.studio/compare/wati-alternative',
          },
        ]}
      />
      <ServiceJsonLd
        name="Helpa vs WATI Comparison"
        serviceType="WhatsApp CRM & AI Receptionist Comparison"
        description="Comprehensive feature and pricing comparison between Helpa and WATI for Indian clinics, salons, and service businesses."
        url="https://helpa.studio/compare/wati-alternative"
      />
      <FaqJsonLd items={COMPARISON_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <Scale className="h-4 w-4 text-emerald-600" />
              Honest Product Comparison
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Helpa vs WATI:{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Why Clinics Choose Helpa
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Looking for a WATI alternative designed specifically for clinics,
              salons, and local service businesses? See how Helpa delivers
              faster AI responses, automated appointment scheduling, and
              tailored workflows.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#075E54] px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition hover:scale-105"
              >
                Switch to Helpa Free <Sparkles className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-[#110E3D] shadow-sm transition hover:bg-slate-50"
              >
                View Plans
              </Link>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mx-auto mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 p-5 text-sm font-black text-[#110E3D] sm:p-6 sm:text-base">
              <div>Feature</div>
              <div className="text-emerald-700">Helpa (Specialized)</div>
              <div className="text-slate-500">WATI (Generic)</div>
            </div>

            <div className="divide-y divide-slate-100">
              {COMPARISON_POINTS.map((pt) => (
                <div
                  key={pt.feature}
                  className="grid grid-cols-3 p-5 text-xs sm:p-6 sm:text-sm"
                >
                  <div className="font-bold text-[#110E3D]">{pt.feature}</div>
                  <div className="pr-4 font-semibold text-emerald-800">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      {pt.helpa}
                    </span>
                  </div>
                  <div className="text-slate-500">{pt.wati}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions: Switching from WATI
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {COMPARISON_FAQS.map((faq) => (
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

        {/* CTA */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#110E3D] p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Experience the difference with Helpa
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
              No credit card required. Migrate your number with zero downtime.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-8 py-3 text-base font-extrabold text-slate-950 shadow-md transition hover:scale-105"
              >
                Start Free Trial <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
