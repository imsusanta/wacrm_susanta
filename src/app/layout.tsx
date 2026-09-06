import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import './workspace-template-modal.css';
import { ThemeProvider } from '@/hooks/use-theme';
import { ThemedToaster } from '@/components/themed-toaster';
import { WebVitalsReporter } from '@/components/performance/web-vitals-reporter';
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_STORAGE_KEY,
  MODES,
  STORAGE_KEY,
  THEME_IDS,
} from '@/lib/themes';

import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
} from '@/components/seo/json-ld';

export const metadata: Metadata = {
  metadataBase: new URL('https://helpa.studio'),
  title: {
    default: 'Helpa — WhatsApp AI Receptionist for Independent Clinics',
    template: '%s | Helpa Studio',
  },
  description:
    'Helpa helps independent clinics answer patient WhatsApp enquiries, book appointments, send reminders, and coordinate staff takeover on the official WhatsApp Cloud API.',
  keywords: [
    'WhatsApp AI Receptionist',
    'WhatsApp CRM India',
    'Clinic Appointment Booking WhatsApp',
    'Doctor WhatsApp Booking',
    'Clinic Front Desk Automation',
    'Patient Reminder Automation',
    'WhatsApp Cloud API India',
    'Meta WhatsApp Coexistence',
    'Automated WhatsApp Chatbot',
    'Shared Team Inbox WhatsApp',
    'Privacy-Focused WhatsApp CRM',
    'WhatsApp Marketing Broadcasts',
  ],
  authors: [{ name: 'Helpa Studio', url: 'https://helpa.studio' }],
  creator: 'Helpa Studio Technologies Pvt. Ltd.',
  publisher: 'Helpa Studio',
  category: 'Business Software',
  classification: 'WhatsApp Business CRM & AI Receptionist',
  alternates: {
    canonical: 'https://helpa.studio',
    languages: {
      'en-IN': 'https://helpa.studio',
      'en-US': 'https://helpa.studio',
    },
  },
  openGraph: {
    title: 'Helpa — WhatsApp AI Receptionist for Independent Clinics',
    description:
      'Answer patient WhatsApp enquiries, book appointments, send reminders, and coordinate clinic staff from one shared workspace.',
    url: 'https://helpa.studio',
    siteName: 'Helpa Studio',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Helpa — WhatsApp AI Receptionist for Independent Clinics',
    description:
      'Answer patient WhatsApp enquiries, book appointments, send reminders, and coordinate clinic staff from one shared workspace.',
    creator: '@helpastudio',
    site: '@helpastudio',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/helpa-logo.svg?v=4', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png?v=4', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png?v=4', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: ['/helpa-logo.svg?v=4', '/favicon.png?v=4'],
    apple: [
      { url: '/apple-touch-icon.png?v=4', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  colorScheme: 'dark light',
};

const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var THEME_KEY = ${JSON.stringify(STORAGE_KEY)};
    var THEME_DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var THEMES = ${JSON.stringify(THEME_IDS)};
    var savedTheme = localStorage.getItem(THEME_KEY);
    d.dataset.theme = THEMES.indexOf(savedTheme) !== -1 ? savedTheme : THEME_DEFAULT;

    var MODE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var MODE_DEFAULT = ${JSON.stringify(DEFAULT_MODE)};
    var MODES = ${JSON.stringify(MODES)};
    var savedMode = localStorage.getItem(MODE_KEY);
    d.dataset.mode = MODES.indexOf(savedMode) !== -1 ? savedMode : MODE_DEFAULT;
  } catch (_e) {
    d.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    d.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="dns-prefetch" href="https://graph.facebook.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
      </head>
      <body className="bg-background text-foreground min-h-full font-sans">
        <ThemeProvider>
          {children}
          <ThemedToaster />
          <WebVitalsReporter />
        </ThemeProvider>
      </body>
    </html>
  );
}
