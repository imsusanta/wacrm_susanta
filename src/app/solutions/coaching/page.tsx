import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, Sparkles, Target, Users2, Zap } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'WhatsApp Lead Automation for Coaching Institutes & Tutors',
  description:
    'Capture student inquiries, qualify course leads, share brochures & demo classes, and collect admission fees automatically on WhatsApp with Helpa.',
  keywords: [
    'Coaching Institute WhatsApp Automation',
    'Student Lead Capture WhatsApp',
    'WhatsApp CRM for Tutors',
    'EdTech WhatsApp Lead Nurturing',
    'Course Admission WhatsApp Bot',
    'WhatsApp Broadcasts for Coaching Classes',
  ],
  alternates: {
    canonical: 'https://helpa.studio/solutions/coaching',
  },
  openGraph: {
    title: 'WhatsApp Lead Automation for Coaching & Tutors | Helpa',
    description:
      'Convert 3x more student inquiries into paid course admissions on WhatsApp.',
    url: 'https://helpa.studio/solutions/coaching',
  },
};

const COACHING_FAQS = [
  {
    question: 'How does Helpa qualify prospective students on WhatsApp?',
    answer:
      'When students or parents message your institute, Helpa automatically asks for their target exam (e.g. JEE, NEET, UPSC, CBSE), current grade, and preferred batch timing, then delivers tailored course syllabus PDFs instantly.',
  },
  {
    question: 'Can we book demo lectures and offline counseling sessions?',
    answer:
      'Yes. Helpa manages demo seat bookings and sends automated calendar confirmations and venue directions on WhatsApp.',
  },
  {
    question: 'Can multiple academic counselors work from one WhatsApp number?',
    answer:
      'Yes! Helpa’s shared Team Inbox routes inquiries to specific counselors or faculty based on subjects and courses.',
  },
];

export default function CoachingSolutionPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Solutions', url: 'https://helpa.studio/#industries' },
          {
            name: 'Coaching & Education',
            url: 'https://helpa.studio/solutions/coaching',
          },
        ]}
      />
      <ServiceJsonLd
        name="WhatsApp Lead Capture & Admission Automation for Coaching Institutes"
        serviceType="Education CRM & Student Inquiry Automation"
        description="24/7 student inquiry qualification, brochure distribution, demo lecture scheduling, and broadcast marketing on WhatsApp."
        url="https://helpa.studio/solutions/coaching"
      />
      <FaqJsonLd items={COACHING_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-800 shadow-sm">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              Engineered for Test Prep Institutes, Academy Centers & Solo Tutors
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Convert Student Inquiries into Paid Admissions on{' '}
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                WhatsApp 24/7
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              When students or parents ask about fee structures or batch
              timings, prompt follow-up matters. Helpa can deliver syllabus
              PDFs, qualify interest, and book demo classes on WhatsApp.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-blue-600/25 transition hover:scale-105"
              >
                Start Free Institute Trial <Sparkles className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-[#110E3D] shadow-sm transition hover:bg-slate-50"
              >
                View Education Plans
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Zap className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Instant Brochure & Fee PDF Delivery
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Automatically send course brochures, fee schedules, and faculty
                profiles the moment an inquiry comes in.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Target className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Pre-Qualify Target Students
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Capture the student&apos;s target exam, graduation year, and
                location before routing warm leads to your senior counselors.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Users2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Batch Broadcast Announcements
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Send test announcements, rank lists, and new batch launch alerts
                directly to enrolled student groups through approved templates.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions for Institutes
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {COACHING_FAQS.map((faq) => (
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
          <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">
              Double your batch admissions this season
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-blue-200">
              Start setting up your courses and WhatsApp AI counselor in
              minutes.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-8 py-3 text-base font-extrabold text-blue-950 shadow-md transition hover:scale-105 hover:bg-blue-50"
              >
                Start Free Institute Trial{' '}
                <Sparkles className="h-4 w-4 text-blue-600" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
