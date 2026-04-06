import type { Metadata, Viewport } from 'next';

import Script from 'next/script';

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
      data-density="comfortable"
      suppressHydrationWarning
      style={
        {
          '--font-display': GeistSans.style.fontFamily,
          '--font-body': GeistSans.style.fontFamily,
          '--font-mono': GeistMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const stored = window.localStorage.getItem('exam-killer-theme');
              const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
              const resolved = theme === 'system'
                ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
                : theme;
              const density = window.localStorage.getItem('exam-killer-density');
              document.documentElement.setAttribute('data-theme', resolved);
              document.documentElement.setAttribute(
                'data-density',
                density === 'compact' ? 'compact' : 'comfortable'
              );
              document.documentElement.style.colorScheme = resolved;
            } catch {}
          })();`}
        </Script>
        <AuthProvider>{children}</AuthProvider>
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
