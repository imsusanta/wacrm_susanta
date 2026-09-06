'use client';

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  Calendar,
  Users,
  ArrowRight,
  User,
  Sliders,
  BarChart2,
  Settings,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  CheckCheck,
  ChevronDown,
  Bot,
  PhoneCall,
} from 'lucide-react';

interface HeroProps {
  isAuthenticated: boolean;
}

export function LandingHero({ isAuthenticated }: HeroProps) {
  const [activeTab, setActiveTab] = useState<
    'all' | 'open' | 'pending' | 'closed'
  >('all');
  const [activeConversation, setActiveConversation] = useState(0);

  const conversations = [
    {
      id: 0,
      name: 'Priya Singh',
      role: 'Patient',
      phone: '+91 98765 43210',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      lastMsg: 'Can I book Dr. Sharma for tomorrow?',
      time: '10:30 AM',
      unread: 2,
      messages: [
        {
          sender: 'user',
          text: 'Hi 👋\nCan I book Dr. Sharma for tomorrow?',
          time: '10:30 AM',
        },
        {
          sender: 'bot',
          text: 'Hello Priya! 👋\nDr. Sharma has openings at 11:00 AM and 3:00 PM tomorrow.',
          time: '10:31 AM',
        },
        {
          sender: 'user',
          text: 'Please book the 11:00 AM slot.',
          time: '10:31 AM',
        },
        {
          sender: 'bot',
          text: 'Your appointment is confirmed. I will send a reminder before your visit.',
          time: '10:32 AM',
        },
      ],
    },
    {
      id: 1,
      name: 'Ravi Sharma',
      role: 'Patient',
      phone: '+91 98123 45678',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      lastMsg: 'What is the consultation fee?',
      time: '10:15 AM',
      unread: 1,
      messages: [
        {
          sender: 'user',
          text: 'What is the consultation fee?',
          time: '10:15 AM',
        },
        {
          sender: 'bot',
          text: 'The consultation fee is ₹600. Would you like me to check available slots?',
          time: '10:16 AM',
        },
      ],
    },
    {
      id: 2,
      name: 'Amit Verma',
      role: 'Patient',
      phone: '+91 97111 22334',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      lastMsg: 'Is the clinic open on Sunday?',
      time: '09:45 AM',
      unread: 0,
      messages: [
        {
          sender: 'user',
          text: 'Is the clinic open on Sunday?',
          time: '09:45 AM',
        },
        {
          sender: 'bot',
          text: 'The clinic is closed on Sunday, but I can book the next available Monday slot.',
          time: '09:46 AM',
        },
      ],
    },
    {
      id: 3,
      name: 'Neha Patel',
      role: 'Patient',
      phone: '+91 96543 21098',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      lastMsg: 'Please send my appointment details.',
      time: '09:30 AM',
      unread: 0,
      messages: [
        {
          sender: 'user',
          text: 'Please send my appointment details.',
          time: '09:30 AM',
        },
        {
          sender: 'bot',
          text: 'Your appointment slip has been sent. Please arrive 10 minutes early.',
          time: '09:31 AM',
        },
      ],
    },
    {
      id: 4,
      name: 'Vikram Das',
      role: 'Patient',
      phone: '+91 95432 10987',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      lastMsg: 'Thanks, the reminder was helpful!',
      time: 'Yesterday',
      unread: 0,
      messages: [
        {
          sender: 'user',
          text: 'Thanks, the reminder was helpful!',
          time: 'Yesterday',
        },
        {
          sender: 'bot',
          text: 'You are welcome. We will see you at the clinic 😊',
          time: 'Yesterday',
        },
      ],
    },
  ];

  const activeContact = conversations[activeConversation];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F9FBF9] via-[#FAFDFB] to-[#F2FAF4] pt-28 pb-16 sm:pt-32 lg:pt-36">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden="true"
      >
        <div className="absolute top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#00A884]/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 1. TOP BADGE */}
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-[#075E54] shadow-sm sm:text-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#00A884]" />
            <span>Built for clinics • WhatsApp & AI Voice Calling</span>
          </div>

          {/* 2. MAIN HEADLINE */}
          <h1 className="mx-auto mb-6 max-w-5xl text-4xl leading-[1.1] font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            WhatsApp & Phone <span className="text-[#00A884]">AI</span> Receptionist
            <br className="hidden sm:inline" /> for Busy Clinics
          </h1>

          {/* 3. SUB-HEADLINE / PARAGRAPH */}
          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed font-normal text-slate-600 sm:text-lg">
            Answer patient enquiries, book doctor appointments, send reminders,
            and answer real phone calls in Indian regional languages – on{' '}
            <span className="font-bold text-[#00A884]">WhatsApp & Voice.</span>
          </p>

          {/* 4. CALL TO ACTION BUTTONS */}
          <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={isAuthenticated ? '/dashboard' : '/signup'}
              className="flex min-h-12 items-center gap-2 rounded-full bg-[#00A884] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#00A884]/25 transition hover:scale-[1.03] hover:bg-[#008f70] active:scale-[0.98] sm:text-base"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/features/ai-calling"
              className="flex min-h-12 items-center gap-2 rounded-full border border-emerald-300 bg-white px-7 py-3.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:scale-[1.02] hover:bg-emerald-50 sm:text-base"
            >
              <PhoneCall className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span>Explore AI Calling</span>
            </Link>
            <Link
              href="#features"
              className="flex min-h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:scale-[1.02] hover:bg-slate-50 sm:text-base"
            >
              <span>All Features</span>
            </Link>
          </div>

          {/* 5. FEATURE HIGHLIGHTS ROW (4-COL GRID) */}
          <div className="mx-auto mb-14 grid max-w-4xl grid-cols-2 gap-4 text-left sm:gap-6 md:grid-cols-4">
            {/* Item 1 */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#00A884]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs leading-tight font-extrabold text-slate-900 sm:text-sm">
                  24/7 Patient
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Replies
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#00A884]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs leading-tight font-extrabold text-slate-900 sm:text-sm">
                  Appointment
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Booking
                </div>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#00A884]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs leading-tight font-extrabold text-slate-900 sm:text-sm">
                  Safe Staff
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Handoff
                </div>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#00A884]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs leading-tight font-extrabold text-slate-900 sm:text-sm">
                  Patient CRM &
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Follow-ups
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. PRODUCT DASHBOARD SHOWCASE MOCKUP CONTAINER */}
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-left shadow-2xl">
          <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[220px_290px_1fr]">
            {/* LEFT COLUMN: BRAND & SIDEBAR NAVIGATION */}
            <div className="flex flex-col justify-between border-b border-slate-100 bg-[#FAFCFB] p-4 lg:border-r lg:border-b-0">
              <div>
                {/* App Brand Logo */}
                <div className="mb-6 flex items-center gap-2.5 px-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00A884] text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-extrabold tracking-tight text-slate-900">
                    WhatsApp <span className="text-[#00A884]">AI</span>
                  </div>
                </div>

                {/* Sidebar Links */}
                <nav className="space-y-1 text-xs font-semibold">
                  <button className="flex w-full items-center gap-2.5 rounded-xl bg-[#E8F8EE] px-3 py-2.5 font-bold text-[#00A884]">
                    <MessageSquare className="h-4 w-4" />
                    <span>Conversations</span>
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100/70">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Leads</span>
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100/70">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>Appointments</span>
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100/70">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>Contacts</span>
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100/70">
                    <Zap className="h-4 w-4 text-slate-400" />
                    <span>Automation</span>
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100/70">
                    <BarChart2 className="h-4 w-4 text-slate-400" />
                    <span>Reports</span>
                  </button>
                  <button className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-600 transition hover:bg-slate-100/70">
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Settings</span>
                  </button>
                </nav>
              </div>

              {/* User Profile Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-1 pt-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Admin"
                    className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                  />
                  <div>
                    <div className="text-xs leading-tight font-bold text-slate-900">
                      Aarogya Clinic
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      Admin
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* MIDDLE COLUMN: CONVERSATIONS LIST */}
            <div className="border-b border-slate-100 p-4 lg:border-r lg:border-b-0">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900">
                  Conversations
                </h3>
                <Sliders className="h-3.5 w-3.5 cursor-pointer text-slate-400" />
              </div>

              {/* Filter Tabs */}
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 text-[11px] font-semibold">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 ${activeTab === 'all' ? 'bg-[#E8F8EE] font-bold text-[#00A884]' : 'text-slate-500'}`}
                >
                  All{' '}
                  <span
                    className={`py-0.2 rounded-full px-1.5 text-[9px] ${activeTab === 'all' ? 'bg-[#00A884] text-white' : 'bg-slate-200 text-slate-600'}`}
                  >
                    12
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('open')}
                  className={`rounded-md px-2 py-1 ${activeTab === 'open' ? 'bg-[#E8F8EE] font-bold text-[#00A884]' : 'text-slate-500'}`}
                >
                  Open <span className="text-slate-400">8</span>
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`rounded-md px-2 py-1 ${activeTab === 'pending' ? 'bg-[#E8F8EE] font-bold text-[#00A884]' : 'text-slate-500'}`}
                >
                  Pending <span className="text-slate-400">2</span>
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={`rounded-md px-2 py-1 ${activeTab === 'closed' ? 'bg-[#E8F8EE] font-bold text-[#00A884]' : 'text-slate-500'}`}
                >
                  Closed <span className="text-slate-400">2</span>
                </button>
              </div>

              {/* Conversation Items List */}
              <div className="space-y-1">
                {conversations.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveConversation(idx)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition ${
                      activeConversation === idx
                        ? 'border border-[#00A884]/20 bg-[#E8F8EE]/80'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-bold text-slate-900">
                          {item.name}
                        </span>
                        <span className="text-[10px] whitespace-nowrap text-slate-400">
                          {item.time}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {item.lastMsg}
                      </p>
                    </div>
                    {item.unread > 0 && (
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00A884] text-[9px] font-bold text-white">
                        {item.unread}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE CHAT VIEW & CONTACT DETAILS */}
            <div className="flex flex-col justify-between bg-white p-4">
              <div>
                {/* Chat Top Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {activeContact.name}
                        </span>
                        <span className="py-0.2 rounded-full bg-emerald-100 px-2 text-[9px] font-bold text-[#00A884]">
                          {activeContact.role}
                        </span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {activeContact.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                      View Contact
                    </button>
                    <MoreVertical className="h-4 w-4 cursor-pointer text-slate-400" />
                  </div>
                </div>

                {/* Date Separator */}
                <div className="my-4 text-center">
                  <span className="rounded-md bg-slate-100 px-3 py-1 text-[10px] font-medium text-slate-400">
                    Today
                  </span>
                </div>

                {/* Chat Messages */}
                <div className="space-y-3.5">
                  {activeContact.messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'rounded-tl-sm bg-slate-100 text-slate-800'
                            : 'rounded-tr-sm border border-[#00A884]/15 bg-[#E7FCE9] text-slate-900'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                        <div
                          className={`mt-1 flex items-center gap-1 text-[9px] text-slate-400 ${
                            msg.sender === 'user'
                              ? 'justify-start'
                              : 'justify-end'
                          }`}
                        >
                          <span>{msg.time}</span>
                          {msg.sender === 'bot' && (
                            <CheckCheck className="h-3 w-3 text-[#00A884]" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Bottom Input Bar */}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Smile className="h-5 w-5 cursor-pointer text-slate-400 hover:text-slate-600" />
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-slate-100/80 px-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:ring-1 focus:ring-[#00A884] focus:outline-none"
                  readOnly
                />
                <Paperclip className="h-4 w-4 cursor-pointer text-slate-400 hover:text-slate-600" />
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00A884] text-white shadow-sm hover:bg-[#008f70]">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
