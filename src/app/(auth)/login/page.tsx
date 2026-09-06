'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  KeyRound,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Bot,
  CalendarCheck,
  UsersRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#030712]">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(
          data.error || 'Failed to sign in. Please check your credentials.'
        );
        setLoading(false);
        return;
      }

      router.refresh();
      if (inviteToken) {
        router.push(`/join/${encodeURIComponent(inviteToken)}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(
        (err as Error).message || 'Network error occurred during login.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#030712] font-sans text-white antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Dynamic Background Glow Spheres */}
      <div className="pointer-events-none absolute top-[-15%] left-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent blur-[140px] duration-[10s] motion-reduce:animate-none" />
      <div className="pointer-events-none absolute right-[-10%] bottom-[-15%] h-[650px] w-[650px] animate-pulse rounded-full bg-gradient-to-tl from-indigo-600/15 via-purple-500/10 to-transparent blur-[140px] duration-[14s] motion-reduce:animate-none" />
      <div className="pointer-events-none absolute top-[40%] left-[30%] h-[400px] w-[400px] rounded-full bg-emerald-600/5 blur-[120px]" />

      {/* Grid Pattern Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_75%_75%_at_50%_50%,#000_60%,transparent_100%)] bg-[size:32px_32px]" />

      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        {/* Left Pane: Login Form Column */}
        <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:col-span-6 lg:py-12 xl:col-span-5">
          {/* Header Brand Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <Link href="/" className="group flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/helpa-logo.png?v=4"
                alt="Helpa"
                className="h-10 w-10 rounded-xl object-contain shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-heading text-lg font-black tracking-tight text-white">
                  Helpa<span className="text-emerald-400">.studio</span>
                </span>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Omnichannel AI Receptionist
                </span>
              </div>
            </Link>

            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md sm:flex">
              <Sparkles className="h-3.5 w-3.5" />
              <span>v0.3.0 Ready</span>
            </div>
          </motion.div>

          {/* Form Container */}
          <div className="my-auto py-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mx-auto max-w-sm sm:max-w-md"
            >
              {/* Card Title & Subtitle */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur-md">
                  {inviteToken ? (
                    <>
                      <UsersRound className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Team Invitation Pending</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Secure Clinic Login</span>
                    </>
                  )}
                </div>

                <h1 className="font-heading mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {inviteToken ? 'Sign in to accept' : 'Welcome back'}
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  {inviteToken
                    ? 'Sign in to your account to accept your clinic invitation.'
                    : 'Access your 24/7 AI Receptionist, Calendly bookings & lead pipeline.'}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      role="alert"
                      aria-live="assertive"
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400 backdrop-blur-md"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                        !
                      </div>
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email Input */}
                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold tracking-wider text-zinc-300 uppercase"
                  >
                    Clinic Email Address
                  </Label>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 transition-colors duration-200 group-focus-within:text-emerald-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder="doctor@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl border border-white/10 bg-white/[0.03] pr-4 pl-10 text-sm text-white transition-all duration-200 placeholder:text-zinc-600 hover:border-white/20 focus-visible:border-emerald-500/60 focus-visible:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-xs font-bold tracking-wider text-zinc-300 uppercase"
                    >
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-emerald-400 transition-colors duration-200 hover:text-emerald-300 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 transition-colors duration-200 group-focus-within:text-emerald-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 rounded-xl border border-white/10 bg-white/[0.03] pr-12 pl-10 text-sm text-white transition-all duration-200 placeholder:text-zinc-600 hover:border-white/20 focus-visible:border-emerald-500/60 focus-visible:bg-white/[0.06] focus-visible:ring-4 focus-visible:ring-emerald-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      className="absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-end pr-3.5 text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label
                    htmlFor="remember-me"
                    className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-zinc-400 select-none"
                  >
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0"
                    />
                    <span>Remember this browser</span>
                  </label>
                </div>

                {/* Submit Button */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="group relative h-12 w-full cursor-pointer overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 font-bold text-white shadow-[0_0_25px_rgba(16,185,129,0.25)] transition-all duration-300 hover:shadow-[0_0_35px_rgba(16,185,129,0.4)]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                        Authenticating Clinic...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 text-sm">
                        Sign In to Dashboard
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Create Account Prompt */}
              <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs font-medium text-zinc-400">
                Don&apos;t have a Helpa Studio account yet?{' '}
                <Link
                  href={
                    inviteToken
                      ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                      : '/signup'
                  }
                  className="font-bold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
                >
                  Start 14-day Free Trial
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Footer Security Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-between gap-4 text-[11px] font-medium text-zinc-500"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Encrypted credentials & tenant-isolated access</span>
            </div>
            <div>© {new Date().getFullYear()} Helpa Inc.</div>
          </motion.div>
        </div>

        {/* Right Pane: Premium Product Showcase (Desktop Only) */}
        <div className="relative hidden items-center justify-center overflow-hidden border-l border-white/10 bg-gradient-to-br from-white/[0.02] to-white/[0.005] p-12 lg:col-span-6 lg:flex xl:col-span-7">
          <div className="w-full max-w-xl space-y-8">
            {/* Main Showcase Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/10 to-white/[0.02] p-8 shadow-2xl backdrop-blur-2xl"
            >
              {/* Subtle ambient light bar */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      AI Receptionist Live
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Voice, WhatsApp & SMS Active
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                  24/7 Active
                </span>
              </div>

              {/* Sample Live Conversational Feed */}
              <div className="space-y-3 font-sans">
                <div className="rounded-2xl border border-white/5 bg-white/5 p-3.5 text-xs text-zinc-300">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="font-bold text-emerald-400">
                      Patient (WhatsApp)
                    </span>
                    <span>10:42 AM</span>
                  </div>
                  &ldquo;Hi! I need an urgent dental consultation with Dr. Roy
                  tomorrow at 3 PM.&rdquo;
                </div>

                <div className="ml-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 to-indigo-950/40 p-3.5 text-xs text-emerald-100">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-emerald-400">
                    <span className="flex items-center gap-1 font-bold">
                      <Sparkles className="h-3 w-3" /> Helpa AI
                    </span>
                    <span>10:42 AM • Instant</span>
                  </div>
                  &ldquo;Dr. Roy has an available slot tomorrow at 3:00 PM. I
                  can confirm it and send the appointment details now.&rdquo;
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 text-center">
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-lg font-black text-white">Approved</div>
                  <div className="text-[10px] font-semibold text-zinc-400">
                    Knowledge Answers
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-lg font-black text-emerald-400">
                    24/7
                  </div>
                  <div className="text-[10px] font-semibold text-zinc-400">
                    Patient Replies
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  <div className="text-lg font-black text-indigo-400">
                    Shared
                  </div>
                  <div className="text-[10px] font-semibold text-zinc-400">
                    Staff History
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Testimonial Quote Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-medium text-zinc-300 italic">
                  &ldquo;Helpa handled over 450 after-hours patient calls and
                  WhatsApp inquiries last month, booking 120+ direct Calendly
                  consultations without staff intervention.&rdquo;
                </p>
                <p className="font-bold text-white">
                  Dr. Aris Thorne —{' '}
                  <span className="font-normal text-emerald-400">
                    Dental Care Clinic Director
                  </span>
                </p>
              </div>
            </motion.div>

            {/* Bullet Highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="flex items-center justify-around text-xs font-semibold text-zinc-400"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> WhatsApp
                Cloud Meta API
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sarvam /
                ElevenLabs Voice
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Calendly
                Direct Sync
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
