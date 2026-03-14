import type { Metadata, Viewport } from 'next';

import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Toaster } from 'sonner';

import { AuthProvider } from '@/context';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Exam-Killer',
    template: '%s | Exam-Killer',
  },
  description:
    'AI-powered exam preparation and personal study companion for Nigerian university students.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Exam-Killer',
  },
  openGraph: {
    title: 'Exam-Killer',
    description: 'AI-powered exam preparation and personal study companion.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#3d7bf5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      style={
        {
          '--font-display': GeistSans.style.fontFamily,
          '--font-body': GeistSans.style.fontFamily,
          '--font-mono': GeistMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
