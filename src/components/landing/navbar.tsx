'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  isAuthenticated?: boolean;
}

const NAV_ITEMS = [
  { href: '/solutions/clinics', label: 'For Clinics' },
  { href: '/features/ai-receptionist', label: 'Features' },
  { href: '/features/ai-calling', label: 'AI Calling', isNew: true },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
];

export function LandingNavbar({
  isAuthenticated: initialAuthenticated = false,
}: NavbarProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/account/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled)
          setIsAuthenticated(Boolean(data?.success && data?.user));
      })
      .catch(() => {
        if (!cancelled) setIsAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-6xl">
        <div
          className={`relative flex min-h-[64px] items-center justify-between gap-4 rounded-[20px] border px-3 shadow-[0_12px_40px_rgba(17,14,61,0.08)] backdrop-blur-xl transition-all duration-300 sm:px-4 ${
            scrolled
              ? 'border-slate-200/80 bg-white/95 shadow-[0_14px_40px_rgba(17,14,61,0.10)]'
              : 'border-white/80 bg-white/88'
          }`}
        >
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-xl px-1.5 py-1.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/helpa-logo.svg?v=4"
              alt="Helpa"
              className="h-10 w-10 rounded-xl object-contain shadow-sm transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-[25px] font-extrabold tracking-[-0.04em] text-[#110E3D]">
              helpa<span className="text-[#16A34A]">.</span>
            </span>
          </Link>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full border border-slate-200/70 bg-slate-50/80 p-1 md:flex"
            aria-label="Primary navigation"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-[#110E3D]/70 transition-all duration-200 hover:bg-white hover:text-[#110E3D] hover:shadow-sm lg:px-4"
              >
                <span>{item.label}</span>
                {'isNew' in item && item.isNew && (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    New
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="group flex min-h-11 items-center gap-2 rounded-full bg-[#110E3D] px-5 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(17,14,61,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(17,14,61,0.24)]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4 text-[#B4F73C] transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-[#110E3D]/80 transition-colors hover:text-[#16A34A]"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="group flex min-h-11 items-center rounded-full bg-[#110E3D] px-5 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(17,14,61,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(17,14,61,0.24)]"
                >
                  Start Free
                  <ArrowRight className="ml-1.5 h-4 w-4 text-[#B4F73C] transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#110E3D] shadow-sm transition-colors hover:bg-slate-50 md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_18px_45px_rgba(17,14,61,0.12)] backdrop-blur-xl md:hidden">
            <nav className="space-y-1" aria-label="Mobile navigation">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="flex min-h-11 items-center justify-between rounded-xl px-4 text-sm font-semibold text-[#110E3D] transition-colors hover:bg-slate-50"
                >
                  <span>{item.label}</span>
                  {'isNew' in item && item.isNew && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                      New
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={closeMobileMenu}
                  className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#110E3D] text-sm font-bold text-white"
                >
                  Go to Dashboard{' '}
                  <ArrowRight className="h-4 w-4 text-[#B4F73C]" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-[#110E3D]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={closeMobileMenu}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#110E3D] text-sm font-bold text-white"
                  >
                    Start Free <ArrowRight className="h-4 w-4 text-[#B4F73C]" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
