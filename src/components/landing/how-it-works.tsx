'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  Rocket,
  ArrowRight,
  TrendingUp,
  Clock,
  HelpCircle,
  Settings2,
  BookOpen,
} from 'lucide-react';

export function LandingHowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-black tracking-wider text-[#00A884] uppercase sm:text-sm">
            HOW IT WORKS
          </span>
          <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Get Started in{' '}
            <span className="text-[#00A884]">3 Simple Steps</span>
          </h2>
          <p className="mt-3 text-sm font-normal text-slate-500 sm:text-base">
            Configure your clinic front desk and test a patient journey in
            minutes.
          </p>
        </div>

        {/* Step Numbers & Icons Flow (Desktop & Tablet) */}
        <div className="mx-auto mt-14 mb-8 hidden max-w-5xl items-center md:grid md:grid-cols-3">
          {/* Step 1 Flow Header */}
          <div className="relative flex flex-col items-center">
            <span className="mb-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#00A884] text-xs font-bold text-white shadow-sm">
              1
            </span>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8EE] text-[#00A884] shadow-sm">
              <MessageSquare className="h-7 w-7 fill-[#00A884] text-[#00A884]" />
            </div>

            {/* Dotted Arrow to Step 2 */}
            <div className="absolute top-[60%] -right-12 flex w-24 items-center lg:-right-16 lg:w-32">
              <div className="w-full border-t-2 border-dashed border-[#00A884]/40" />
              <div className="h-0 w-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-[#00A884]" />
            </div>
          </div>

          {/* Step 2 Flow Header */}
          <div className="relative flex flex-col items-center">
            <span className="mb-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#00A884] text-xs font-bold text-white shadow-sm">
              2
            </span>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8EE] text-[#00A884] shadow-sm">
              <Bot className="h-7 w-7 text-[#00A884]" />
            </div>

            {/* Dotted Arrow to Step 3 */}
            <div className="absolute top-[60%] -right-12 flex w-24 items-center lg:-right-16 lg:w-32">
              <div className="w-full border-t-2 border-dashed border-[#00A884]/40" />
              <div className="h-0 w-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-[#00A884]" />
            </div>
          </div>

          {/* Step 3 Flow Header */}
          <div className="flex flex-col items-center">
            <span className="mb-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#00A884] text-xs font-bold text-white shadow-sm">
              3
            </span>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8EE] text-[#00A884] shadow-sm">
              <Rocket className="h-7 w-7 text-[#00A884]" />
            </div>
          </div>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {/* STEP 1 */}
          <div className="flex flex-col">
            {/* Mobile Step Badge */}
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00A884] text-xs font-bold text-white">
                1
              </span>
              <span className="text-xs font-bold text-[#00A884] uppercase">
                Step 1
              </span>
            </div>

            {/* Preview Box */}
            <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-3xl border border-slate-100 bg-[#F4FBF7] p-5 shadow-sm">
              {/* Background Watermark WhatsApp Icon */}
              <div className="absolute top-1/2 -left-3 flex h-20 w-20 -translate-y-1/2 items-center justify-center rounded-full bg-[#00A884] text-white opacity-90 shadow-lg">
                <MessageSquare className="h-10 w-10 fill-white" />
              </div>

              {/* Foreground White Dialog */}
              <div className="relative z-10 w-full max-w-[215px] rounded-2xl border border-slate-100 bg-white p-4 shadow-lg">
                <div className="text-xs leading-tight font-bold text-slate-900">
                  Connect WhatsApp
                </div>
                <div className="mt-1 text-[10px] leading-snug text-slate-500">
                  Connect the clinic&apos;s WhatsApp Business number to get
                  started.
                </div>

                {/* Phone Input Box */}
                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 font-mono text-xs text-slate-800">
                  <span className="text-xs">🇮🇳</span>
                  <span>+91 9547771118</span>
                </div>

                {/* Connect Button */}
                <button
                  type="button"
                  className="mt-2.5 w-full rounded-lg bg-[#00A884] py-1.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-[#008f70]"
                >
                  Connect
                </button>
              </div>
            </div>

            {/* Step Text Below */}
            <div className="mt-6 text-center">
              <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
                1. Connect Your WhatsApp
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500 sm:text-sm">
                Connect your clinic&apos;s WhatsApp Business number through
                Meta&apos;s supported onboarding flow.
              </p>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="flex flex-col">
            {/* Mobile Step Badge */}
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00A884] text-xs font-bold text-white">
                2
              </span>
              <span className="text-xs font-bold text-[#00A884] uppercase">
                Step 2
              </span>
            </div>

            {/* Preview Box */}
            <div className="flex min-h-[220px] overflow-hidden rounded-3xl border border-slate-100 bg-white text-[10px] shadow-sm">
              {/* Left Mini Sidebar */}
              <div className="flex w-[110px] flex-col justify-between border-r border-slate-100 bg-slate-50/70 p-3">
                <div>
                  <div className="mb-2 text-[11px] font-extrabold text-slate-900">
                    AI Receptionist
                  </div>
                  <div className="space-y-1 font-medium text-slate-600">
                    <div className="flex items-center gap-1.5 rounded-md bg-[#E8F8EE] px-1.5 py-1 font-bold text-[#00A884]">
                      <MessageSquare className="h-3 w-3" />
                      <span className="truncate">Welcome Message</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
                      <BookOpen className="h-3 w-3 text-slate-400" />
                      <span className="truncate">Business Info</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="truncate">Working Hours</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
                      <HelpCircle className="h-3 w-3 text-slate-400" />
                      <span className="truncate">FAQs</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
                      <Settings2 className="h-3 w-3 text-slate-400" />
                      <span className="truncate">Behavior</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Mini Chat Simulator */}
              <div className="flex flex-1 flex-col justify-center space-y-2 bg-slate-50/40 p-3">
                <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white p-2 text-slate-800 shadow-sm">
                  <p className="leading-snug">
                    Hi! ☀️
                    <br />
                    How can I help you today?
                  </p>
                </div>
                <div className="ml-auto max-w-[85%] rounded-xl border border-[#00A884]/20 bg-[#E8F8EE] p-2 text-slate-900 shadow-sm">
                  <p className="leading-snug">I want to book an appointment.</p>
                </div>
                <div className="max-w-[85%] rounded-xl border border-slate-100 bg-white p-2 text-slate-800 shadow-sm">
                  <p className="leading-snug">
                    Sure! May I know your preferred date and time?
                  </p>
                </div>
              </div>
            </div>

            {/* Step Text Below */}
            <div className="mt-6 text-center">
              <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
                2. Configure Your AI
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500 sm:text-sm">
                Add clinic hours, doctors, fees, approved FAQs, and staff
                handoff rules before going live.
              </p>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="flex flex-col">
            {/* Mobile Step Badge */}
            <div className="mb-3 flex items-center gap-2 md:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00A884] text-xs font-bold text-white">
                3
              </span>
              <span className="text-xs font-bold text-[#00A884] uppercase">
                Step 3
              </span>
            </div>

            {/* Preview Box */}
            <div className="flex min-h-[220px] flex-col justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="text-xs font-extrabold text-slate-900">
                  Live Dashboard
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#00A884]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#00A884]" />
                  <span>AI is Active</span>
                </div>
              </div>

              {/* 2x2 Metric Cards */}
              <div className="my-2 grid grid-cols-2 gap-2.5">
                {/* Metric 1 */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                  <div className="text-[10px] font-medium text-slate-500">
                    Conversations
                  </div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">
                    128
                  </div>
                  <div className="mt-1 flex h-3 items-end">
                    <svg
                      viewBox="0 0 60 15"
                      className="h-full w-full fill-emerald-500/15 stroke-emerald-500"
                      preserveAspectRatio="none"
                    >
                      <path d="M0 12 Q15 4, 30 8 T60 2 L60 15 L0 15 Z" />
                      <path
                        d="M0 12 Q15 4, 30 8 T60 2"
                        fill="none"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                  <div className="text-[10px] font-medium text-slate-500">
                    New Leads
                  </div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">
                    45
                  </div>
                  <div className="mt-1 flex h-3 items-end">
                    <svg
                      viewBox="0 0 60 15"
                      className="h-full w-full fill-purple-500/15 stroke-purple-500"
                      preserveAspectRatio="none"
                    >
                      <path d="M0 14 Q20 2, 40 10 T60 4 L60 15 L0 15 Z" />
                      <path
                        d="M0 14 Q20 2, 40 10 T60 4"
                        fill="none"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                  <div className="text-[10px] font-medium text-slate-500">
                    Appointments
                  </div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">
                    28
                  </div>
                  <div className="mt-1 flex h-3 items-end">
                    <svg
                      viewBox="0 0 60 15"
                      className="h-full w-full fill-amber-500/15 stroke-amber-500"
                      preserveAspectRatio="none"
                    >
                      <path d="M0 10 Q15 13, 30 5 T60 3 L60 15 L0 15 Z" />
                      <path
                        d="M0 10 Q15 13, 30 5 T60 3"
                        fill="none"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
                  <div className="text-[10px] font-medium text-slate-500">
                    Completed Visits
                  </div>
                  <div className="mt-0.5 text-lg font-black text-slate-900">
                    16
                  </div>
                  <div className="mt-1 flex h-3 items-end">
                    <svg
                      viewBox="0 0 60 15"
                      className="h-full w-full fill-blue-500/15 stroke-blue-500"
                      preserveAspectRatio="none"
                    >
                      <path d="M0 14 Q25 12, 45 6 T60 2 L60 15 L0 15 Z" />
                      <path
                        d="M0 14 Q25 12, 45 6 T60 2"
                        fill="none"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Step Text Below */}
            <div className="mt-6 text-center">
              <h3 className="text-base font-extrabold text-slate-900 sm:text-lg">
                3. Go Live & Grow
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-500 sm:text-sm">
                Your AI receptionist can answer routine enquiries, book
                appointments, and escalate safely to clinic staff.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mx-auto mt-16 flex max-w-4xl flex-col items-center justify-between gap-4 rounded-3xl border border-emerald-100 bg-[#F0FDF4] p-5 shadow-sm sm:flex-row sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-white shadow-md shadow-[#00A884]/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm leading-tight font-extrabold text-slate-900 sm:text-base">
                That&apos;s it! Your AI receptionist is ready to work for you{' '}
                <span className="text-[#00A884]">24/7.</span>
              </h4>
              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                Fewer repetitive calls. Faster replies. A calmer reception desk.
              </p>
            </div>
          </div>

          <Link
            href="/signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#00A884] px-6 py-3 text-xs font-bold text-white shadow-md shadow-[#00A884]/25 transition hover:scale-[1.02] hover:bg-[#008f70] active:scale-[0.98] sm:text-sm"
          >
            <span>Start Clinic Trial</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
