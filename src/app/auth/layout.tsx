'use client';

import { ReactNode } from 'react';

import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Exam<span className="text-indigo-400">Killer</span>
            </h1>
          </Link>
          <p className="mt-2 text-sm text-indigo-200">AI-Powered Study Companion</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
          {children}
        </div>
      </div>
    </div>
  );
}
