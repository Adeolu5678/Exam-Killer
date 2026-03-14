'use client';

// =============================================================================
// app/(app)/analytics/page.tsx
// FSD-compliant global analytics page.
// =============================================================================

import { useState, useEffect } from 'react';

import dynamic from 'next/dynamic';

import { AnalyticsPageSkeleton } from '@/features/analytics';
import { VerificationBanner } from '@/features/identity/VerificationBanner';
import { VerificationGuard } from '@/features/identity/VerificationGuard';

// Lazy-load the heavy shell
const AnalyticsPageShell = dynamic(
  () => import('@/features/analytics').then((m) => ({ default: m.AnalyticsPageShell })),
  {
    ssr: false,
    loading: () => <AnalyticsPageSkeleton />,
  },
);

export default function GlobalAnalyticsPage() {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/payments/status');
        if (res.ok) {
          const data = await res.json();
          setSubscription(data.subscription);
        }
      } catch (err) {
        console.error('Failed to fetch subscription status');
      }
    };
    fetchStatus();
  }, []);

  const vStatus = subscription?.verificationStatus || 'none';

  return (
    <VerificationGuard status={vStatus}>
      <div className="p-6">
        <div className="mb-6">
          <VerificationBanner status={vStatus} onVerifyClick={() => {}} />
        </div>
        <AnalyticsPageShell workspaceId="global" />
      </div>
    </VerificationGuard>
  );
}
