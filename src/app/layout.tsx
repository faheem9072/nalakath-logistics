import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'നാലകത്ത് ലോജിസ്റ്റിക്സ് — Nalakath Logistics',
  description:
    'Official Fleet Management & Duty Operations Platform for Nalakath Logistics (Since 1998). Vehicle dispatch, duty scheduling, driver trips, and live odometer tracking.',
  manifest: '/manifest.json',
  icons: {
    icon: '/nalakath-logo.svg',
    apple: '/nalakath-logo.svg',
  },
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'നാലകത്ത്',
  },
};

import { AppProviders } from '@/components/providers/AppProviders';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
