'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Calendar,
  User,
  PhoneCall,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    title: 'Answer Clinic FAQs',
    description:
      'Give patients approved answers about timings, fees, doctors, and services on WhatsApp.',
    icon: MessageSquare,
    iconBg: 'bg-[#E8F8EE]',
    iconColor: 'text-[#00A884]',
    btnBg: 'bg-[#E8F8EE]',
    btnColor: 'text-[#00A884]',
    link: '/features/ai-receptionist',
  },
  {
    title: 'AI Phone Calling Agent',
    description:
      'Answer & make real phone calls with multilingual Indian voices, zero hallucinations, and auto CRM logging.',
    icon: PhoneCall,
    iconBg: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]',
    btnBg: 'bg-[#ECFDF5]',
    btnColor: 'text-[#059669]',
    link: '/features/ai-calling',
  },
  {
    title: 'Book Appointments',
    description:
      'Let patients request, confirm, reschedule, or cancel appointments automatically.',
    icon: Calendar,
    iconBg: 'bg-[#F3E8FF]',
    iconColor: 'text-[#9333EA]',
    btnBg: 'bg-[#F3E8FF]',
    btnColor: 'text-[#9333EA]',
    link: '/features/appointment-booking',
  },
  {
    title: 'Coordinate Reception',
    description:
      'Keep patient conversations, call summaries, assignments, notes, and staff takeover in one inbox.',
    icon: User,
    iconBg: 'bg-[#E0F2FE]',
    iconColor: 'text-[#0284C7]',
    btnBg: 'bg-[#E0F2FE]',
    btnColor: 'text-[#0284C7]',
    link: '/features/whatsapp-crm',
  },
];

export function LandingWhyBusinessesLoveUs() {
  return (
    <section className="relative overflow-hidden bg-white py-20 lg:py-28">
      {/* Background Decorative Wave & Leaf Accents from Reference Image */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 opacity-60"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1440 240"
          className="h-full w-full object-cover"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 160C240 110 480 200 720 180C960 160 1200 80 1440 120V240H0V160Z"
            fill="#F4FBF6"
          />
        </svg>
      </div>

      {/* Decorative leaf motif on bottom right */}
      <div
        className="pointer-events-none absolute right-4 bottom-0 w-36 opacity-40 sm:w-48 lg:right-12"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M30 150C30 90 80 40 140 20C120 70 80 120 30 150Z"
            fill="#C9F2DC"
            stroke="#9DE5BC"
            strokeWidth="1.5"
          />
          <path
            d="M50 140C60 100 100 70 140 60C120 100 90 130 50 140Z"
            fill="#D9F7E8"
          />
          <path
            d="M70 145C90 115 120 90 150 85C135 115 110 135 70 145Z"
            fill="#EAFBF2"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {/* Left Intro Text Block */}
          <div className="mb-4 flex flex-col justify-center pr-0 sm:col-span-2 sm:pr-4 lg:col-span-3 xl:col-span-1 xl:mb-0">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#00A884] uppercase">
              <span className="h-0.5 w-5 bg-[#00A884]" />
              <span>WHY CLINICS CHOOSE HELPA</span>
            </div>

            <h2 className="mt-4 text-3xl leading-[1.15] font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[38px]">
              A Calmer Front Desk
              <br />
              on <span className="text-[#00A884]">WhatsApp & Voice</span>
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-relaxed font-normal text-slate-500">
              Handle routine patient communication automatically while your
              reception team stays available for the conversations that need a
              human.
            </p>
          </div>

          {/* 4 Feature Cards */}
          {FEATURES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-[28px] border border-slate-100 bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgb(0,0,0,0.08)]"
              >
                <div>
                  {/* Top Circle Icon */}
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full ${item.iconBg} ${item.iconColor} transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Title */}
                  <h3 className="mt-6 text-lg leading-snug font-bold text-slate-900">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2.5 text-xs leading-relaxed font-normal text-slate-500 sm:text-sm">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Arrow Button */}
                <div className="mt-8 pt-2">
                  <Link
                    href={item.link}
                    aria-label={`Learn more about ${item.title}`}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${item.btnBg} ${item.btnColor} transition-all duration-200 group-hover:translate-x-1 hover:opacity-90`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
