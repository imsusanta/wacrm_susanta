import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  FileSpreadsheet,
  MapPin,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'WhatsApp CRM & Site Visit Automation for Real Estate',
  description:
    'Qualify real estate buyers, share floor plans and brochures, and schedule site visits automatically on WhatsApp 24/7 with Helpa AI CRM.',
  keywords: [
    'Real Estate WhatsApp CRM',
    'Property Site Visit Booking WhatsApp',
    'Real Estate Lead Qualification WhatsApp',
    'Builder WhatsApp Marketing Automation',
    'Property Broker WhatsApp Bot India',
  ],
  alternates: {
    canonical: 'https://helpa.studio/solutions/real-estate',
  },
  openGraph: {
    title: 'WhatsApp CRM & Site Visit Automation for Real Estate | Helpa',
    description:
      'Turn property ad clicks into scheduled site visits instantly on WhatsApp.',
    url: 'https://helpa.studio/solutions/real-estate',
  },
};

const REAL_ESTATE_FAQS = [
  {
    question: 'How does Helpa qualify real estate buyers on WhatsApp?',
    answer:
      'When buyers click your Facebook, Google, or Portal ads, Helpa initiates an instant conversation asking for their budget range, BHK preference (e.g. 2 BHK, 3 BHK, Villa), purchase timeframe, and preferred locality, filtering serious prospects.',
  },
  {
    question: 'Can buyers schedule site visits directly?',
    answer:
      'Yes. Helpa checks your sales team availability and books weekend or weekday site visit slots, sending Google Maps directions and driver instructions on WhatsApp.',
  },
  {
    question: 'Can brokers share high-res floor plans and walk-through videos?',
    answer:
      'Yes. Project brochures, price sheets, floor plans, and video links can be delivered in seconds based on buyer inquiry parameters.',
  },
];

export default function RealEstateSolutionPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Solutions', url: 'https://helpa.studio/#industries' },
          {
            name: 'Real Estate & Properties',
            url: 'https://helpa.studio/solutions/real-estate',
          },
        ]}
      />
      <ServiceJsonLd
        name="WhatsApp CRM & Site Visit Booking for Real Estate"
        serviceType="Real Estate Lead Qualification & Automation"
        description="24/7 property buyer qualification, floor plan distribution, and site visit scheduling on WhatsApp."
        url="https://helpa.studio/solutions/real-estate"
      />
      <FaqJsonLd items={REAL_ESTATE_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-black text-amber-800 shadow-sm">
              <Building2 className="h-4 w-4 text-amber-600" />
              Tailored for Real Estate Developers, Brokers & Channel Partners
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Turn Real Estate Ad Clicks into Confirmed{' '}
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                Site Visits
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Speed to lead decides real estate deals. Helpa engages property
              leads promptly after they submit a form, filters budgets, delivers
              brochures, and schedules site tours.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-amber-600/25 transition hover:scale-105"
              >
                Start Free Real Estate Trial <Sparkles className="h-4 w-4" />
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

        {/* Value Grid */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <MapPin className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Site Visit Automation
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Let prospective home buyers book weekend site visit slots
                directly on WhatsApp with instant Google Maps location drops.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Instant Brochure & Plan Dispatch
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Share high-resolution 2 BHK/3 BHK floor plans, price breakdowns,
                and project amenities directly in WhatsApp chats.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Pre-Qualified Sales Leads
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Stop wasting sales agent time on cold leads. Filter by verified
                budget, timeline, and financing readiness before calling.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions for Real Estate
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {REAL_ESTATE_FAQS.map((faq) => (
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
          <div className="rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Accelerate your real estate sales pipeline
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-amber-200">
              Deploy your WhatsApp real estate assistant today.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-extrabold text-amber-950 shadow-md transition hover:scale-105 hover:bg-amber-50"
              >
                Start Free Real Estate Trial{' '}
                <Sparkles className="h-4 w-4 text-amber-600" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
