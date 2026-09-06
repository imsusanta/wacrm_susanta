import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageSquare,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: 'Contact Us — Helpa Studio',
  description:
    'Get in touch with Helpa Studio. Support, sales, and registered office details for Indian service businesses.',
  alternates: {
    canonical: 'https://helpa.studio/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="bg-background text-foreground min-h-screen px-6 py-12 font-sans">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://helpa.studio' },
          { name: 'Contact Us', url: 'https://helpa.studio/contact' },
        ]}
      />
      <div className="mx-auto max-w-3xl space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#075E54] hover:underline dark:text-[#25D366]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Helpa
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-md">
            <MessageSquare className="h-5 w-5 fill-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Contact Us</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          We&apos;re here to help your clinic, salon, or institute automate
          customer enquiries 24/7.
        </p>

        <div className="grid gap-6 pt-4 sm:grid-cols-2">
          <div className="border-border bg-card space-y-3 rounded-2xl border p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#075E54] dark:text-[#25D366]">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-foreground font-bold">Email Support</h3>
            <p className="text-muted-foreground text-xs">
              Questions or technical assistance
            </p>
            <a
              href="mailto:hello@helpa.studio"
              className="block text-sm font-bold text-[#075E54] hover:underline dark:text-[#25D366]"
            >
              hello@helpa.studio
            </a>
          </div>

          <div className="border-border bg-card space-y-3 rounded-2xl border p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#075E54] dark:text-[#25D366]">
              <Phone className="h-5 w-5" />
            </div>
            <h3 className="text-foreground font-bold">Phone & WhatsApp</h3>
            <p className="text-muted-foreground text-xs">
              Mon–Sat, 9:00 AM – 7:00 PM IST
            </p>
            <a
              href="tel:+919800000000"
              className="block text-sm font-bold text-[#075E54] hover:underline dark:text-[#25D366]"
            >
              +91 98000 00000
            </a>
          </div>
        </div>

        <div className="border-border bg-card mt-6 space-y-3 rounded-2xl border p-6 shadow-sm">
          <div className="text-foreground flex items-center gap-2 font-bold">
            <MapPin className="h-5 w-5 text-[#25D366]" /> Registered Business
            Address
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Helpa Studio Technologies Pvt. Ltd.
            <br />
            Level 4, Tech Park Campus, Sevoke Road,
            <br />
            Siliguri, West Bengal — 734001, India.
          </p>
        </div>

        <div className="text-muted-foreground space-y-2 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 p-6 text-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-[#075E54] dark:text-[#25D366]">
            <ShieldCheck className="h-4 w-4" /> Privacy & Deployment Disclosure
          </div>
          <p>
            Helpa Studio is an Indian SaaS company. Production customers should
            confirm the selected hosting region, subprocessors, retention terms,
            consent workflow, and legal requirements before processing patient
            data.
          </p>
        </div>
      </div>
    </div>
  );
}
