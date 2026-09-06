import type { Metadata } from 'next';
import Link from 'next/link';
import { Database, FileCheck, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { LandingSecurityBadges } from '@/components/landing/security-badges';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Data Security, Encryption & Privacy Controls',
  description:
    'Learn how Helpa protects clinic records and WhatsApp credentials with AES-256-GCM encryption, tenant isolation, authorization, and operational safeguards.',
  keywords: [
    'WhatsApp CRM Security',
    'DPDP Readiness CRM India',
    'Healthcare Data Security WhatsApp',
    'Encrypted WhatsApp CRM Meta API',
    'PostgreSQL Row-Level Security CRM',
  ],
  alternates: {
    canonical: 'https://helpa.studio/security',
  },
  openGraph: {
    title: 'Data Security & Privacy Controls | Helpa Studio',
    description:
      'Multi-tenant database isolation, AES-256-GCM credential encryption, and documented privacy controls.',
    url: 'https://helpa.studio/security',
  },
};

const SECURITY_FAQS = [
  {
    question: 'How does Helpa protect Meta tokens and customer data?',
    answer:
      'All Meta WhatsApp access tokens and sensitive credentials are encrypted at rest using AES-256-GCM authenticated encryption. Patient records and chats are isolated using Supabase PostgreSQL Row-Level Security (RLS).',
  },
  {
    question: 'Where is customer data hosted?',
    answer:
      'Hosting location depends on the infrastructure selected for your deployment. Confirm the active region, subprocessors, retention terms, and contractual requirements before production rollout.',
  },
  {
    question: 'Are conversations used to train public AI models?',
    answer:
      'No. Message contents and business communication records are strictly private and are never used to train public foundation models.',
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Security & Trust', url: 'https://helpa.studio/security' },
        ]}
      />
      <ServiceJsonLd
        name="Helpa Enterprise Security Architecture"
        serviceType="Data Protection & Encryption Standards"
        description="Documented security controls, tenant isolation, credential encryption, and privacy-readiness guidance for clinic workflows."
        url="https://helpa.studio/security"
      />
      <FaqJsonLd items={SECURITY_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Enterprise-Grade Security Posture
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              Security and Privacy Built from the{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Ground Up
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              When handling sensitive clinic consultations, patient inquiries,
              and customer data, security isn&apos;t an afterthought. Helpa uses
              authenticated encryption, authorization checks, and tenant
              isolation controls across the application.
            </p>
          </div>
        </section>

        {/* Security Badges Section */}
        <div className="mt-8">
          <LandingSecurityBadges />
        </div>

        {/* Security Pillars */}
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                AES-256-GCM Encryption
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                All Meta WhatsApp API tokens, system user credentials, and
                customer records are encrypted at rest using industry-standard
                authenticated encryption.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Database className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                Row-Level Security (RLS)
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                PostgreSQL database enforces hard tenant boundary isolation. No
                organization or clinic can ever view or access data from another
                tenant.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <FileCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[#110E3D]">
                DPDP Act 2023 Alignment
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Designed to support Indian privacy requirements including right
                to erasure, explicit consent tracking, and localized data
                processing.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#110E3D]">
              Security & Privacy FAQs
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            {SECURITY_FAQS.map((faq) => (
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
              Safe, reliable, and privacy-first WhatsApp automation
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
