import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Eye,
  FileText,
  ArrowLeft,
  Mail,
  Trash2,
  Database,
  Smartphone,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Privacy Policy — Helpa Studio',
  description:
    'Privacy policy for Helpa WhatsApp AI Receptionist & CRM, including data handling, tenant isolation, encryption controls, retention, and deletion requests.',
  alternates: {
    canonical: 'https://helpa.studio/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F8FAFC] font-sans text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Privacy Policy', url: 'https://helpa.studio/privacy' },
        ]}
      />
      {/* Background Decorative Gradient */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-gradient-to-b from-emerald-50/60 via-slate-50/30 to-transparent" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/helpa-logo.png?v=4"
              alt="Helpa Logo"
              className="h-9 w-9 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-extrabold tracking-tight text-[#110E3D]">
              helpa<span className="text-emerald-500">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        {/* Title Block */}
        <div className="mb-12 border-b border-slate-200 pb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            <span>Privacy & Data Protection Policy</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Effective Date: January 1, 2026 • Last Updated: August 21, 2026
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Helpa Studio (&quot;Helpa&quot;, &quot;we&quot;, &quot;our&quot;, or
            &quot;us&quot;) is committed to protecting your privacy and ensuring
            the security of your business and customer communication data. This
            Privacy Policy details how we collect, process, store, and safeguard
            information when you use the Helpa CRM platform, WhatsApp AI
            Receptionist features, and website at{' '}
            <a
              href="https://www.helpa.studio"
              className="font-semibold text-emerald-600 underline"
            >
              https://www.helpa.studio
            </a>
            .
          </p>
        </div>

        {/* Highlight Summary Cards */}
        <div className="mb-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Encrypted & Isolated
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Multi-tenant architecture with AES-256-GCM encryption for all Meta
              WhatsApp tokens and CRM credentials.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Eye className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Zero Data Selling
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              We never sell, rent, or monetize your patient, student, or
              customer communication logs to third parties.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Full Deletion Rights
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              You maintain complete ownership of your data with instant
              extraction and permanent deletion rights anytime.
            </p>
          </div>
        </div>

        {/* Policy Body */}
        <div className="prose prose-slate max-w-none space-y-10 text-slate-700">
          {/* Section 1 */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
              <Database className="h-5 w-5 text-emerald-600" />
              1. Information We Collect
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              To provide intelligent CRM automation, customer inbox management,
              and automated booking, we collect the following categories of
              information:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
              <li>
                <strong>Account & Profile Information:</strong> Full name,
                business email address, workspace name, industry type, and
                contact details provided during signup.
              </li>
              <li>
                <strong>Meta & WhatsApp Integration Data:</strong> When
                connecting via Meta Embedded Signup or System User access, we
                receive your WhatsApp Business Account (WABA) ID, Phone Number
                ID, display phone number, business profile name, and temporary
                authorization codes to establish official API connectivity.
              </li>
              <li>
                <strong>Conversation & Customer Inquiries:</strong> Inbound and
                outbound WhatsApp messages, timestamps, delivery receipts,
                customer phone numbers, and names solely for presenting chats in
                your Inbox and generating AI assistant responses.
              </li>
              <li>
                <strong>Custom Knowledge Base Content:</strong> Business
                operating hours, service catalogs, appointment rates, doctor
                schedules, or FAQ documents uploaded to train your AI
                Receptionist.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              2. Meta Platform & WhatsApp Business API Compliance
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Helpa strictly adheres to Meta’s Developer Platform Terms and
              WhatsApp Business Policy:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
              <li>
                <strong>Restricted Purpose:</strong> WhatsApp data is processed
                exclusively on behalf of the registered business tenant to route
                conversations, generate AI replies, and manage customer records.
              </li>
              <li>
                <strong>No Public Model Training:</strong> Customer message
                contents and private conversation logs are never used to train
                public or foundation AI models.
              </li>
              <li>
                <strong>Encrypted Token Storage:</strong> Meta access tokens and
                system credentials are encrypted using AES-256-GCM authenticated
                encryption at rest.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
              <Trash2 className="h-5 w-5 text-emerald-600" />
              3. User Data Deletion Instructions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              In accordance with Meta Platform Rules and global privacy
              regulations (GDPR/CCPA), users and business owners have the right
              to request full deletion of their personal and communication data
              at any time:
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-bold text-slate-900">
                How to request data deletion:
              </h4>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-600">
                <li>
                  <strong>From Settings:</strong> Log in to your Helpa
                  dashboard, navigate to <em>Settings ➡️ Account</em>, and click{' '}
                  <em>Delete Workspace Data</em>.
                </li>
                <li>
                  <strong>Via Email:</strong> Send an email to{' '}
                  <a
                    href="mailto:privacy@helpa.studio"
                    className="font-semibold text-emerald-600 underline"
                  >
                    privacy@helpa.studio
                  </a>{' '}
                  with the subject line &quot;Data Deletion Request&quot;
                  mentioning your registered business email and WhatsApp phone
                  number.
                </li>
              </ol>
              <p className="mt-2 text-xs text-slate-500">
                Upon receiving your request, all chat histories, customer
                records, and Meta tokens associated with your account will be
                permanently purged within 30 business days.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
              <FileText className="h-5 w-5 text-emerald-600" />
              4. Third-Party Sub-processors & Infrastructure
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              We rely on trusted cloud infrastructure partners to operate our
              services reliably:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
              <li>
                <strong>Meta Platforms, Inc.:</strong> Official WhatsApp Cloud
                API provider for message delivery and phone number onboarding.
              </li>
              <li>
                <strong>Supabase / PostgreSQL:</strong> Secure database hosting
                with Row-Level Security (RLS) tenant isolation.
              </li>
              <li>
                <strong>Vercel, Inc.:</strong> Production serverless application
                hosting and SSL/TLS edge networking.
              </li>
              <li>
                <strong>Razorpay:</strong> PCI-DSS certified payment processing
                for subscription plans (we do not store credit card numbers).
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
              <Mail className="h-5 w-5 text-emerald-600" />
              5. Contact Information & Data Protection Officer
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              If you have any questions, concerns, or inquiries regarding this
              Privacy Policy or our security practices, please contact our
              privacy desk:
            </p>
            <div className="mt-3 text-sm text-slate-700">
              <p>
                <strong>Helpa Studio</strong>
              </p>
              <p>
                Privacy & Data Protection Officer:{' '}
                <a
                  href="mailto:privacy@helpa.studio"
                  className="text-emerald-600 hover:underline"
                >
                  privacy@helpa.studio
                </a>
              </p>
              <p>
                General Support:{' '}
                <a
                  href="mailto:support@helpa.studio"
                  className="text-emerald-600 hover:underline"
                >
                  support@helpa.studio
                </a>
              </p>
              <p>
                Website:{' '}
                <a
                  href="https://www.helpa.studio"
                  className="text-emerald-600 hover:underline"
                >
                  https://www.helpa.studio
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/helpa-logo.png?v=4"
              alt="Helpa"
              className="h-6 w-6 rounded-lg object-contain"
            />
            <span className="font-bold text-slate-900">Helpa Studio</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-600">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/privacy" className="font-bold text-emerald-600">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms of Service
            </Link>
            <a
              href="mailto:support@helpa.studio"
              className="hover:text-slate-900"
            >
              Contact Support
            </a>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Helpa Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
