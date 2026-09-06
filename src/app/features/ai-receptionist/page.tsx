import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot, BrainCircuit, Shield, Sparkles, Zap } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: '24/7 WhatsApp AI Receptionist & Front Desk Automation',
  description:
    'Instant 2-second AI responses to customer queries on WhatsApp. Trained on your business knowledge base, services, doctor schedules, and pricing.',
  keywords: [
    'WhatsApp AI Receptionist',
    'AI Chatbot for WhatsApp Business',
    'Automated WhatsApp Front Desk',
    'Customer Support AI WhatsApp',
    'WhatsApp Auto Responder India',
    'AI Appointment Booking Assistant',
  ],
  alternates: {
    canonical: 'https://helpa.studio/features/ai-receptionist',
  },
  openGraph: {
    title: '24/7 WhatsApp AI Receptionist | Helpa',
    description:
      'Train a custom AI receptionist on your clinic or business FAQs in 5 minutes.',
    url: 'https://helpa.studio/features/ai-receptionist',
  },
};

const AI_RECEPTIONIST_FAQS = [
  {
    question: 'How is Helpa AI Receptionist trained on my business?',
    answer:
      'You can upload your website link, clinic service list, doctor schedules, PDF brochures, or FAQs directly into the Helpa Knowledge Base. The AI instantly reads and answers questions using only your approved facts.',
  },
  {
    question: 'Does the AI ever hallucinate or make up answers?',
    answer:
      'No. Helpa is built with strict factual guardrails. If a customer asks a question outside your uploaded knowledge base, the AI gracefully offers human receptionist handoff.',
  },
  {
    question: 'Can the AI understand Hinglish and regional phrasing?',
    answer:
      'Yes. Helpa understands conversational Indian English, Hinglish, and Hindi queries naturally.',
  },
];

export default function AiReceptionistFeaturePage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Features', url: 'https://helpa.studio/#features' },
          {
            name: 'AI Receptionist',
            url: 'https://helpa.studio/features/ai-receptionist',
          },
        ]}
      />
      <ServiceJsonLd
        name="WhatsApp AI Receptionist"
        serviceType="AI Customer Service Automation"
        description="24/7 intelligent front desk receptionist powered by generative AI and business knowledge bases on WhatsApp."
        url="https://helpa.studio/features/ai-receptionist"
      />
      <FaqJsonLd items={AI_RECEPTIONIST_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <Bot className="h-4 w-4 text-emerald-600" />
              Next-Gen AI Customer Engagement
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              An AI Front Desk that Works{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                24/7 on WhatsApp
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Give patients a consistent response after hours. Helpa answers
              approved pricing and service FAQs, supports appointment booking,
              and hands complex conversations to clinic staff.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#075E54] px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition hover:scale-105"
              >
                Try AI Receptionist Free <Sparkles className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-[#110E3D] shadow-sm transition hover:bg-slate-50"
              >
                View Plans & Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Custom Knowledge Base
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Feed your clinic timings, fee cards, doctor bios, and PDFs. The
                AI grounds replies in your approved content and can escalate
                when a question requires staff review.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Zap className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Fast, Consistent Replies
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Respond to routine patient questions promptly without relying on
                a receptionist being available for every incoming message.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Instant Human Takeover
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Whenever a complex inquiry arises, human staff can pause the AI
                and chat seamlessly with zero interruption to the user.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Frequently Asked Questions about AI Receptionist
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {AI_RECEPTIONIST_FAQS.map((faq) => (
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
              Automate your WhatsApp customer service today
            </h2>
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
