// =============================================================================
// app/(app)/workspace/[id]/analytics/page.tsx
// FSD-compliant thin page — no business logic. Lazy-loads AnalyticsPageShell.
// =============================================================================

import dynamic from 'next/dynamic';

import { AnalyticsPageSkeleton } from '@/features/analytics';

// Heavy recharts bundle — lazy-loaded with Suspense skeleton
const AnalyticsPageShell = dynamic(
  () => import('@/features/analytics').then((m) => ({ default: m.AnalyticsPageShell })),
  {
    ssr: false,
    loading: () => <AnalyticsPageSkeleton />,
  },
);

interface AnalyticsPageProps {
  params: { id: string };
}

export default function AnalyticsPage({ params }: AnalyticsPageProps) {
  return <AnalyticsPageShell workspaceId={params.id} />;
}

export const metadata = {
  title: 'Analytics — Exam Killer',
  description: 'Track your study performance and consistency.',
};
