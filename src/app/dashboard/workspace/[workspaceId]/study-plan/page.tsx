// =============================================================================
// app/(app)/workspace/[workspaceId]/study-plan/page.tsx
// Layer: app (thin page — no business logic)
// FSD: delegates ENTIRELY to features/study-plan public API
// =============================================================================

import type { Metadata } from 'next';

import dynamic from 'next/dynamic';

import { StudyPlanSkeleton } from '@/features/study-plan';

// Lazy-load the heavy page shell (keeps calendar/framer-motion out of initial bundle)
const StudyPlanPageShell = dynamic(
  () => import('@/features/study-plan').then((m) => ({ default: m.StudyPlanPageShell })),
  {
    ssr: false,
    loading: () => <StudyPlanSkeleton />,
  },
);

interface StudyPlanPageProps {
  params: { workspaceId: string };
}

export async function generateMetadata({ params }: StudyPlanPageProps): Promise<Metadata> {
  return {
    title: 'Study Plan — Exam Killer',
    description: 'Schedule your study sessions and track your exam dates.',
  };
}

export default function StudyPlanPage({ params }: StudyPlanPageProps) {
  return <StudyPlanPageShell workspaceId={params.workspaceId} />;
}
