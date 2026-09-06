import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Filter, Megaphone, Radio, Sparkles } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'WhatsApp Marketing Broadcasts & Workflow Automation',
  description:
    'Send targeted WhatsApp marketing broadcasts and automated lifecycle triggers with high deliverability using official Meta Cloud API templates.',
  keywords: [
    'WhatsApp Marketing Broadcasts',
    'WhatsApp Bulk Messages Official API',
    'WhatsApp Drip Campaigns India',
    'WhatsApp Promotional Broadcasts',
    'Meta Approved WhatsApp Templates',
  ],
  alternates: {
    canonical: 'https://helpa.studio/features/automated-broadcasts',
  },
  openGraph: {
    title: 'WhatsApp Marketing Broadcasts & Workflows | Helpa',
    description:
      'High-deliverability WhatsApp broadcasts and automated messaging campaigns.',
    url: 'https://helpa.studio/features/automated-broadcasts',
  },
};

const BROADCAST_FAQS = [
  {
    question: 'Are broadcasts sent via official Meta approved templates?',
    answer:
      'Helpa sends template campaigns through the official Meta Cloud API. Template approval, recipient consent, message quality, and account standing remain subject to Meta policies and review.',
  },
  {
    question: 'Can we segment contacts before broadcasting?',
    answer:
      'Yes. You can filter contacts by tags, past booking dates, city, doctor visited, or course category to send hyper-relevant campaigns.',
  },
  {
    question: 'Do we get detailed delivery and read reports?',
    answer:
      'Yes. Helpa provides real-time broadcast analytics including Sent, Delivered, Read, and Reply conversion metrics.',
  },
];

export default function AutomatedBroadcastsFeaturePage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Features', url: 'https://helpa.studio/#features' },
          {
            name: 'Automated Broadcasts',
            url: 'https://helpa.studio/features/automated-broadcasts',
          },
        ]}
      />
      <ServiceJsonLd
        name="Official Meta WhatsApp Broadcast Campaigns"
        serviceType="WhatsApp Marketing & Campaign Automation"
        description="Targeted customer broadcasts, template management, and lifecycle follow-ups on WhatsApp."
        url="https://helpa.studio/features/automated-broadcasts"
      />
      <FaqJsonLd items={BROADCAST_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <Megaphone className="h-4 w-4 text-emerald-600" />
              Official Meta Template Messaging
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Targeted WhatsApp Campaigns with{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Measurable Delivery Reports
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Reach your audience where they actually pay attention. Send
              festive announcements, follow-up reminders, and re-engagement
              campaigns safely on official Meta APIs.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#075E54] px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition hover:scale-105"
              >
                Launch Your First Campaign <Sparkles className="h-4 w-4" />
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

        {/* Feature Grid */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Filter className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Laser-Targeted Audience Lists
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Filter by custom tags, last appointment date, or service taken
                so you never spam the wrong segment.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Radio className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Meta Approved Templates
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Draft, submit, and manage Meta pre-approved rich media broadcast
                templates with CTA buttons right in your dashboard.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Real-Time Delivery Metrics
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Track exact delivery percentage, read receipts, and incoming
                replies in real-time.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {BROADCAST_FAQS.map((faq) => (
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
              Scale your customer outreach with WhatsApp Broadcasts
            </h2>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-8 py-3 text-base font-extrabold text-slate-950 shadow-md transition hover:scale-105"
              >
                Get Started Free <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
