import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'WhatsApp AI Receptionist for Clinics & Doctors',
  description:
    'Automate clinic appointment bookings, answer patient queries 24/7 on WhatsApp, send automated reminders, and prevent no-shows with Helpa official Meta Cloud API receptionist.',
  keywords: [
    'WhatsApp AI Receptionist Clinic',
    'Doctor Appointment Booking WhatsApp',
    'Clinic WhatsApp Automation',
    'Hospital OPD WhatsApp Bot',
    'WhatsApp Patient Management India',
    'Clinic Front Desk Automation',
  ],
  alternates: {
    canonical: 'https://helpa.studio/solutions/clinics',
  },
  openGraph: {
    title: 'WhatsApp AI Receptionist for Clinics & Doctors | Helpa',
    description:
      'Turn patient WhatsApp inquiries into confirmed doctor appointments 24/7 while eliminating front-desk burnout.',
    url: 'https://helpa.studio/solutions/clinics',
  },
};

const CLINIC_FAQS = [
  {
    question: 'How does Helpa book clinic appointments on WhatsApp?',
    answer:
      'When a patient messages your clinic on WhatsApp, Helpa greets them instantly, asks for the required doctor or specialty, checks real-time slot availability, books the slot, and sends an immediate WhatsApp confirmation with OPD details.',
  },
  {
    question: 'Can receptionists take over patient chats anytime?',
    answer:
      'Yes. Helpa includes a shared multi-agent Team Inbox. Receptionists or clinic staff can step in and take over any conversation with a single click, with full message history visible.',
  },
  {
    question: 'Does Helpa diagnose or prescribe medication?',
    answer:
      'No. Helpa strictly manages administrative tasks such as doctor availability, slot booking, clinic hours, fees, and location FAQs. Clinical decisions and prescriptions remain with qualified doctors.',
  },
  {
    question: 'What privacy and security controls does Helpa provide?',
    answer:
      'Helpa includes tenant isolation, role-based access, and AES-256-GCM encryption for sensitive integration credentials. Clinics remain responsible for legal review, consent, retention, and deployment-specific compliance obligations.',
  },
];

export default function ClinicSolutionPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Solutions', url: 'https://helpa.studio/#industries' },
          {
            name: 'Clinics & Healthcare',
            url: 'https://helpa.studio/solutions/clinics',
          },
        ]}
      />
      <ServiceJsonLd
        name="WhatsApp AI Receptionist for Healthcare Clinics"
        serviceType="Healthcare Automation & Appointment Booking"
        description="Automated WhatsApp front desk receptionist for doctors, OPDs, and outpatient clinics."
        url="https://helpa.studio/solutions/clinics"
      />
      <FaqJsonLd items={CLINIC_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              Tailored for Outpatient Clinics, Polyclinics & Doctors
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              The 24/7 WhatsApp AI Receptionist for{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Healthcare Clinics
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Never let an after-hours patient inquiry go unanswered. Helpa
              handles routine OPD questions, confirms available doctor slots,
              sends reminder slips, and gives staff a shared conversation
              history.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#075E54] px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition hover:scale-105"
              >
                Start Clinic Free Trial <Sparkles className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-[#110E3D] shadow-sm transition hover:bg-slate-50"
              >
                View Clinic Pricing
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
                24/7 Automated OPD Booking
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Patients can check doctor timings, select available consultation
                slots, and receive immediate WhatsApp booking slips even at 11
                PM.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <PhoneCall className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Reduced Front-Desk Workload
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Automate repetitive questions about clinic address, doctor fees,
                consultation days, and appointment preparation.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Patient Privacy Controls
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Tenant isolation, role-based access, encrypted credentials, and
                documented deletion workflows support a safer rollout.
              </p>
            </div>
          </div>
        </section>

        {/* Step by step workflow */}
        <section className="mx-auto mt-24 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              How the WhatsApp Clinic Workflow Works
            </h2>
            <p className="mt-2 text-slate-600">
              Designed specifically for healthcare receptionists and doctor
              schedules.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-black text-white">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#110E3D]">
                  Patient sends a message on WhatsApp
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Whether asking &ldquo;Is Dr. Sharma available tomorrow?&rdquo;
                  or &ldquo;What is the fee for cardiology consultation?&rdquo;,
                  Helpa recognizes the intent immediately.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-black text-white">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#110E3D]">
                  Real-time slot presentation & booking
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Helpa queries doctor availability schedules and offers
                  available 15-min or 30-min time slots without double-booking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-black text-white">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#110E3D]">
                  Automated confirmation & reminder slips
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  The patient receives a branded confirmation ticket with clinic
                  Google Map coordinates and automated 2-hour pre-visit
                  reminders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions by Doctors & Clinics
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {CLINIC_FAQS.map((faq) => (
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
          <div className="rounded-3xl bg-gradient-to-r from-[#110E3D] via-[#1E1B4B] to-[#110E3D] p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Ready to automate your clinic&apos;s WhatsApp front desk?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
              Join 150+ clinics across India saving 15+ hours weekly with Helpa.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-8 py-3 text-base font-extrabold text-slate-950 shadow-md transition hover:scale-105"
              >
                Start Free 14-Day Clinic Trial <Sparkles className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
