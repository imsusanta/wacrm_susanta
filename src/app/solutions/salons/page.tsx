import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, Heart, Scissors, Sparkles } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'WhatsApp Booking & CRM for Salons, Spas & Beauty Studios',
  description:
    'Automate salon bookings, appointment reminders, stylist schedules, and customer retention on WhatsApp 24/7 with Helpa AI Receptionist.',
  keywords: [
    'Salon WhatsApp Booking',
    'Spa Appointment Booking WhatsApp',
    'Beauty Studio CRM India',
    'Salon AI Receptionist',
    'WhatsApp Salon Marketing Automation',
    'Stylist Appointment Booking WhatsApp',
  ],
  alternates: {
    canonical: 'https://helpa.studio/solutions/salons',
  },
  openGraph: {
    title: 'WhatsApp Booking & CRM for Salons & Spas | Helpa',
    description:
      'Boost salon appointments and automate customer service 24/7 on WhatsApp.',
    url: 'https://helpa.studio/solutions/salons',
  },
};

const SALON_FAQS = [
  {
    question: 'How do customers book salon services via WhatsApp?',
    answer:
      'Clients simply send a message on WhatsApp. Helpa presents service options (haircut, spa, facial, coloring), checks stylist availability, books the chosen slot, and sends an automated booking confirmation.',
  },
  {
    question: 'Can we send automated reminders before appointments?',
    answer:
      'Yes. Helpa automatically sends WhatsApp reminders 24 hours and 2 hours before the scheduled time with an easy 1-click reschedule button to reduce no-shows.',
  },
  {
    question: 'Can we broadcast festive offers and seasonal packages?',
    answer:
      'Yes. Helpa allows approved WhatsApp promotional broadcasts to past clients with high delivery and open rates to keep seats filled.',
  },
];

export default function SalonsSolutionPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Solutions', url: 'https://helpa.studio/#industries' },
          {
            name: 'Salons & Spas',
            url: 'https://helpa.studio/solutions/salons',
          },
        ]}
      />
      <ServiceJsonLd
        name="WhatsApp AI Booking & CRM for Salons & Spas"
        serviceType="Salon Management & Booking Automation"
        description="24/7 automated appointment booking, stylist scheduling, and broadcast marketing on WhatsApp for salons and wellness centers."
        url="https://helpa.studio/solutions/salons"
      />
      <FaqJsonLd items={SALON_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 px-4 py-1.5 text-xs font-black text-pink-800 shadow-sm">
              <Scissors className="h-4 w-4 text-pink-600" />
              Built for Salons, Spas, Nail Bars & Aesthetic Studios
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Turn WhatsApp Inquiries into Fully Booked{' '}
              <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-amber-600 bg-clip-text text-transparent">
                Salon Chairs
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Stop losing customers while your stylists are busy doing hair or
              makeup. Helpa books salon slots 24/7, shares price lists, sends
              reminder alerts, and brings repeat bookings.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-pink-600/25 transition hover:scale-105"
              >
                Start Free Salon Trial <Sparkles className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-[#110E3D] shadow-sm transition hover:bg-slate-50"
              >
                Explore Salon Plans
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                <Calendar className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Instant WhatsApp Booking
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Clients book their preferred stylist and service in under 60
                seconds directly inside WhatsApp without downloading third-party
                apps.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                <Clock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Zero Missed Inquiries
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Capture after-hours beauty service enquiries and offer available
                booking slots without keeping staff online overnight.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                <Heart className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Customer Retention Workflows
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Automatically remind clients when it&apos;s time for their
                monthly haircut, keratin touchup, or facial session.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions by Salon Owners
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {SALON_FAQS.map((faq) => (
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
          <div className="rounded-3xl bg-gradient-to-r from-pink-900 via-rose-950 to-slate-900 p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Fill your salon schedule effortlessly
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-pink-200">
              Set up your service catalog on Helpa in 15 minutes.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-extrabold text-pink-900 shadow-md transition hover:scale-105 hover:bg-pink-50"
              >
                Start Free 14-Day Trial{' '}
                <Sparkles className="h-4 w-4 text-pink-600" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
