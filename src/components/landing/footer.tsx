import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-[#FAF9FC] pt-16 pb-12 text-xs text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 border-b border-slate-200/80 pb-12 sm:grid-cols-2 md:grid-cols-5">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/helpa-logo.png?v=4"
                alt="Helpa"
                className="h-10 w-10 rounded-xl object-contain shadow-xs"
              />
              <span className="text-xl font-extrabold tracking-tight text-[#110E3D]">
                helpa<span className="text-[#0866FF]">.</span>
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              A WhatsApp AI receptionist and patient communication workspace for
              independent clinics. Handle approved FAQs, appointments,
              reminders, and staff takeover on the official WhatsApp Cloud API.
            </p>
            <div className="text-[11px] text-slate-400">
              Built with ❤️ by{' '}
              <span className="font-bold text-slate-700">Helpa Studio</span>.
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#110E3D] uppercase">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/features/ai-receptionist"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  AI Receptionist
                </Link>
              </li>
              <li>
                <Link
                  href="/features/ai-calling"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  AI Calling Agent
                </Link>
              </li>
              <li>
                <Link
                  href="/features/whatsapp-crm"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  WhatsApp Team CRM
                </Link>
              </li>
              <li>
                <Link
                  href="/features/appointment-booking"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Appointment Booking
                </Link>
              </li>
              <li>
                <Link
                  href="/features/automated-broadcasts"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Broadcasts & Campaigns
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Industry Modules */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#110E3D] uppercase">
              For Clinics
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/solutions/clinics"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Clinic Solution
                </Link>
              </li>
              <li>
                <Link
                  href="/features/appointment-booking"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Appointment Workflow
                </Link>
              </li>
              <li>
                <Link
                  href="/features/whatsapp-crm"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Shared Team Inbox
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Clinic Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/compare/wati-alternative"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Helpa vs WATI
                </Link>
              </li>
              <li>
                <Link
                  href="/compare/interakt-alternative"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Helpa vs Interakt
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold tracking-wider text-[#110E3D] uppercase">
              Legal & Trust
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/security"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Security Architecture
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/refund"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors hover:text-[#110E3D]"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-[11px] text-slate-400 sm:flex-row">
          <div>
            © {new Date().getFullYear()} Helpa Studio. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Built on the official Meta Cloud API</span>
            <span>•</span>
            <span>AES-256-GCM Encrypted</span>
            <span>•</span>
            <span>Privacy controls documented</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
