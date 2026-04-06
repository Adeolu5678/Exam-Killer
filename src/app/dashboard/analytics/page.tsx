'use client';

// =============================================================================
// app/(app)/analytics/page.tsx
// FSD-compliant global analytics page.
// =============================================================================

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/shared/hooks/useAuth';

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
  const { subscription } = useAuth();
  const router = useRouter();

  const vStatus = subscription?.verificationStatus || 'none';

  return (
    <VerificationGuard status={vStatus}>
      <div className="p-6">
        <div className="mb-6">
          <VerificationBanner
            status={vStatus}
            onVerifyClick={() => router.push('/dashboard/settings')}
          />
        </div>
        <AnalyticsPageShell workspaceId="global" />
      </div>
    </VerificationGuard>
  );
}
