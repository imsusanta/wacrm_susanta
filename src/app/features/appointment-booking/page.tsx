import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BellRing,
  CalendarCheck2,
  Clock,
  QrCode,
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
  title: 'Automated WhatsApp Appointment & Slot Booking Engine',
  description:
    'Allow customers and patients to check doctor or staff availability and confirm appointments on WhatsApp 24/7 with zero double-booking.',
  keywords: [
    'WhatsApp Appointment Booking',
    'Doctor Slot Booking WhatsApp',
    'Automated WhatsApp Scheduling Engine',
    'WhatsApp Booking Bot India',
    'Appointment Reminder WhatsApp',
  ],
  alternates: {
    canonical: 'https://helpa.studio/features/appointment-booking',
  },
  openGraph: {
    title: 'Automated WhatsApp Appointment Booking | Helpa',
    description:
      'Seamless 24/7 appointment scheduling and slot booking on WhatsApp.',
    url: 'https://helpa.studio/features/appointment-booking',
  },
};

const BOOKING_FAQS = [
  {
    question: 'How does the slot booking engine prevent double bookings?',
    answer:
      'Helpa syncs doctor and service calendars in real-time. Once a slot is selected, it is temporarily locked and immediately confirmed upon patient verification.',
  },
  {
    question: 'Can patients reschedule or cancel on WhatsApp?',
    answer:
      'Yes. Confirmation messages include a 1-click &quot;Reschedule&quot; button that displays alternate open slots automatically.',
  },
  {
    question: 'Can we collect upfront consultation fees?',
    answer:
      'Yes. You can integrate payment links (UPI, Razorpay) directly into the WhatsApp booking workflow.',
  },
];

export default function AppointmentBookingFeaturePage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Features', url: 'https://helpa.studio/#features' },
          {
            name: 'Appointment Booking',
            url: 'https://helpa.studio/features/appointment-booking',
          },
        ]}
      />
      <ServiceJsonLd
        name="WhatsApp Appointment Booking Engine"
        serviceType="Automated Scheduling & Reminders"
        description="24/7 automated slot checking, calendar synchronization, and reminder workflows on WhatsApp."
        url="https://helpa.studio/features/appointment-booking"
      />
      <FaqJsonLd items={BOOKING_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
              Effortless WhatsApp Scheduling
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Turn Inquiries into Confirmed Bookings in{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Under 60 Seconds
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              No forms. No apps to install. Let your customers and patients pick
              open slots directly within WhatsApp conversation flows.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#075E54] px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition hover:scale-105"
              >
                Start Free Trial <Sparkles className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-[#110E3D] shadow-sm transition hover:bg-slate-50"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Value Grid */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Clock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Real-Time Availability
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Syncs with doctor or stylist shifts, buffer intervals, and
                holiday calendars automatically.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BellRing className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Automated 2-Hour Reminders
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Send timely WhatsApp reminder alerts with appointment details
                and clinic location pins.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <QrCode className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Digital OPD Pass & Slips
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Send professional digital OPD slips with booking IDs and QR
                check-in codes.
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
            {BOOKING_FAQS.map((faq) => (
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
              Start accepting automated WhatsApp bookings
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
