import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PhoneCall,
  PhoneForwarded,
  Sparkles,
  Languages,
  Database,
  CheckCircle2,
  Mic,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { LandingNavbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import {
  BreadcrumbJsonLd,
  FaqJsonLd,
  ServiceJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'AI Phone Calling Agent & Voice Receptionist for Clinics | Helpa',
  description:
    'Make and receive real phone calls with an AI Calling Agent. Powered by Sarvam AI multilingual Indian voices & ElevenLabs, grounded in your knowledge base with automated CRM lead extraction.',
  keywords: [
    'AI Calling Agent',
    'AI Phone Receptionist',
    'Indian Multilingual Voice AI',
    'Sarvam AI Calling',
    'Clinic Phone Call Automation',
    'Voice AI CRM',
    'Inbound Outbound AI Calls',
  ],
  alternates: {
    canonical: 'https://helpa.studio/features/ai-calling',
  },
  openGraph: {
    title: 'AI Phone Calling Agent & Voice Receptionist | Helpa',
    description:
      'Answer patient calls 24/7 with natural Indian accents, automated CRM notes, and live staff transfer.',
    url: 'https://helpa.studio/features/ai-calling',
  },
};

const CALLING_FAQS = [
  {
    question: 'How does the Helpa AI Calling Agent answer phone calls?',
    answer:
      'When a patient dials your clinic phone number, the AI Calling Agent answers within 2 rings. It converses in real time using Indian speech-to-text (STT) and text-to-speech (TTS), grounded strictly in your clinic knowledge base.',
  },
  {
    question: 'Which languages and Indian regional accents are supported?',
    answer:
      'Helpa supports 11 Indian languages plus Indian English through Sarvam AI (including Hindi, Hinglish, Bengali, Tamil, Telugu, Kannada, Gujarati, and Marathi) with natural Indian accents, as well as ElevenLabs voice models with automatic failover.',
  },
  {
    question: 'Can the AI transfer a call to a human receptionist?',
    answer:
      'Yes. If the patient asks for a doctor, has an urgent emergency, or requests a human agent, the AI seamlessly executes a live transfer [ACTION: TRANSFER] to your designated staff number.',
  },
  {
    question: 'What happens after the call ends?',
    answer:
      'Within seconds, the call transcript is processed to extract key information: caller name, intent, summary, sentiment, and an automated 0-100 Lead Score. A new lead or updated contact record is immediately logged in your Helpa CRM timeline.',
  },
  {
    question: 'Can we make outbound calls to patients?',
    answer:
      'Yes! You can trigger single outbound calls directly from a contact or lead card with one click, or schedule automated outbound appointment confirmation and follow-up calls.',
  },
];

const SUPPORTED_LANGUAGES = [
  { name: 'Indian English', sample: 'en-IN' },
  { name: 'Hindi', sample: 'hi-IN' },
  { name: 'Hinglish', sample: 'hi-EN' },
  { name: 'Bengali', sample: 'bn-IN' },
  { name: 'Tamil', sample: 'ta-IN' },
  { name: 'Telugu', sample: 'te-IN' },
  { name: 'Kannada', sample: 'kn-IN' },
  { name: 'Gujarati', sample: 'gu-IN' },
  { name: 'Marathi', sample: 'mr-IN' },
  { name: 'Malayalam', sample: 'ml-IN' },
];

export default function AiCallingFeaturePage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#110E3D] selection:bg-[#B4F73C] selection:text-[#110E3D]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Features', url: 'https://helpa.studio/features/ai-receptionist' },
          {
            name: 'AI Calling Agent',
            url: 'https://helpa.studio/features/ai-calling',
          },
        ]}
      />
      <ServiceJsonLd
        name="AI Phone Calling Agent"
        serviceType="Voice AI Telephony Automation"
        description="24/7 AI-driven inbound and outbound phone calling agent with multilingual Indian speech synthesis, knowledge base grounding, and CRM integration."
        url="https://helpa.studio/features/ai-calling"
      />
      <FaqJsonLd items={CALLING_FAQS} />

      <LandingNavbar />

      <main className="pt-28 pb-20 sm:pt-36">
        {/* HERO SECTION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-black text-emerald-800 shadow-sm">
              <PhoneCall className="h-4 w-4 text-emerald-600 animate-pulse" />
              New Feature: AI Phone Calling Agent & Voice AI
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#110E3D] sm:text-5xl lg:text-6xl">
              An AI Voice Receptionist that{' '}
              <span className="bg-gradient-to-r from-[#075E54] via-[#25D366] to-[#075E54] bg-clip-text text-transparent">
                Answers & Makes Real Calls
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
              Never miss a patient call again. Helpa answers your phone 24/7 in fluent Hindi, Hinglish, English, Bengali, and regional languages. Trained on your clinic FAQs, books appointments, and syncs every call directly into your CRM.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/calling"
                className="flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#075E54] px-8 py-3 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition hover:scale-105"
              >
                Open Calling Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup"
                className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-8 py-3 text-base font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Start Free Trial <Sparkles className="h-4 w-4 text-emerald-600" />
              </Link>
            </div>
          </div>

          {/* INTERACTIVE CALL PREVIEW MOCKUP */}
          <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl">
            {/* Call Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
                  <PhoneCall className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500">
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">Dr. Sharma Clinic • AI Receptionist</h3>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      LIVE CALL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Caller: +91 98765 43210 (Priya Mukherjee)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">01:42</span>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>

            {/* Transcript Simulator & Real-time Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              {/* Left 2 Cols: Live Transcript */}
              <div className="col-span-2 p-6 space-y-4 bg-slate-50/50">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    P
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-white p-3.5 text-xs text-slate-800 shadow-sm border border-slate-200/60 max-w-[85%]">
                    <p className="font-semibold text-slate-500 text-[10px] mb-1">Patient (Hindi/Hinglish)</p>
                    <p>&quot;Namaste! Dr. Sharma ke paas kal subah consultation ke liye appointment mil sakta hai kya? Unka fee kitna hai?&quot;</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 justify-end">
                  <div className="rounded-2xl rounded-tr-none bg-emerald-600 p-3.5 text-xs text-white shadow-sm max-w-[85%]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-emerald-200 text-[10px]">AI Receptionist (Sarvam Saaras & Bulbul)</span>
                      <span className="text-[10px] text-emerald-200">220ms latency</span>
                    </div>
                    <p>&quot;Namaste Priya ji! Dr. Sharma kal subah 11:00 baje aur dopahar 3:00 baje available hain. Consultation fee ₹600 hai. Kya main aapke liye 11:00 AM ka slot book kar doon?&quot;</p>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    AI
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    P
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-white p-3.5 text-xs text-slate-800 shadow-sm border border-slate-200/60 max-w-[85%]">
                    <p className="font-semibold text-slate-500 text-[10px] mb-1">Patient</p>
                    <p>&quot;Haan please 11 baje book kar dijiye. Aur confirmation WhatsApp pe bhej dijiyega.&quot;</p>
                  </div>
                </div>
              </div>

              {/* Right Col: Instant CRM Extraction */}
              <div className="p-6 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">CRM Extraction</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Score: 94/100
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <p className="text-[11px] font-medium text-slate-500">Detected Intent</p>
                    <p className="text-xs font-bold text-slate-800">Appointment Booking & Pricing</p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <p className="text-[11px] font-medium text-slate-500">Language Detected</p>
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 text-emerald-600" />
                      Hindi / Hinglish (hi-IN)
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <p className="text-[11px] font-medium text-slate-500">Sentiment</p>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      Positive (High intent)
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <p className="text-[11px] font-medium text-slate-500">Auto CRM Actions</p>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Lead Created / Updated
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp Confirmation Queued
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Full Transcript Saved
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 CORE CAPABILITIES SECTION */}
        <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-black tracking-wider text-[#00A884] uppercase">
              POWERFUL CAPABILITIES
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-[#110E3D] sm:text-4xl">
              Everything Your Front Desk Needs, Handled on Autopilot
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Combines cutting-edge Indian speech technology with your clinic data to deliver human-level conversations on phone calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-5">
                <Languages className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#110E3D]">11+ Indian Languages</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Powered by Sarvam AI (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded">saaras:v3</code> and <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">bulbul:v3</code>) with natural Indian accents in Hindi, Hinglish, Bengali, Tamil, Telugu, and more.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-5">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#110E3D]">Knowledge Base Grounded</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Answers doctor timings, fees, services, and location strictly from your verified Helpa documents. Zero made-up facts or hallucinations.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-5">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#110E3D]">Auto CRM & 0-100 Scoring</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Automatically extracts caller identity, summarizes the discussion, grades intent from 0 to 100, and logs activity to the customer timeline.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-5">
                <PhoneForwarded className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#110E3D]">Live Human Transfer</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                When a complex inquiry or medical emergency arises, the agent instantly executes a live telephone transfer to your receptionist desk.
              </p>
            </div>
          </div>
        </section>

        {/* SUPPORTED LANGUAGES PILLS */}
        <section className="mx-auto mt-20 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/50 p-8 text-center">
            <h3 className="text-xl font-bold text-[#110E3D] mb-3">
              Native Voice Support Across India
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto mb-6">
              Patients speak naturally in their mother tongue or code-switch between Hindi and English without missing a beat.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <span
                  key={lang.sample}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-xs"
                >
                  <Mic className="h-3 w-3 text-emerald-600" />
                  {lang.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="mx-auto mt-24 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#110E3D] p-8 sm:p-12 text-center text-white shadow-2xl">
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl font-extrabold sm:text-4xl">
                Ready to Upgrade Your Clinic Front Desk?
              </h2>
              <p className="text-base text-slate-300">
                Setup your first AI Calling Agent in under 5 minutes. Connect your Twilio or Exotel phone number and start taking calls today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Link
                  href="/calling"
                  className="flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-8 py-3 text-base font-extrabold text-[#110E3D] shadow-lg transition hover:scale-105"
                >
                  Configure Calling Agent <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="flex min-h-12 items-center gap-2 rounded-full border border-slate-600 bg-white/10 px-8 py-3 text-base font-bold text-white transition hover:bg-white/20"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-extrabold text-[#110E3D] sm:text-3xl">
              Frequently Asked Questions about AI Calling
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Everything you need to know about setting up real voice phone calls in Helpa.
            </p>
          </div>

          <div className="space-y-4">
            {CALLING_FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs"
              >
                <h3 className="text-base font-bold text-[#110E3D]">{faq.question}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
