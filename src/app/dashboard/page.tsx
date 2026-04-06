'use client';

// =============================================================================
// app/dashboard/page.tsx
// Layer: app (routing only)
// Assembles the dashboard from widget and feature components.
// FSD Dependency Rule: page → widgets → features → shared
//   ✅  import from @/widgets/DashboardWidget and @/features/workspace (index only)
//   ❌  import directly from features/workspace/ui/... or features/workspace/model/...
// =============================================================================

import React from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/shared/hooks/useAuth';
import { Card, CardContent, CardSkeleton } from '@/shared/ui';

import { StreakCalendar, useAggregatedStats, useStreakData } from '@/features/analytics';
import { VerificationBanner } from '@/features/identity/VerificationBanner';
import { useWorkspace, useWorkspaces, WorkspaceCreator, WorkspaceGrid } from '@/features/workspace';

import { HeroSection, DashboardFAB } from '@/widgets/DashboardWidget';

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, subscription } = useAuth();
  const router = useRouter();
  const { data: wsData } = useWorkspaces();
  const statsQuery = useAggregatedStats('global');
  const streakQuery = useStreakData('global');

  const recentWorkspaceId = wsData?.workspaces?.[0]?.id ?? '';
  const recentWorkspaceQuery = useWorkspace(recentWorkspaceId, {
    enabled: Boolean(recentWorkspaceId),
  });

  const vStatus = subscription?.verificationStatus || 'none';
  const currentStreak = statsQuery.data?.studyStreakDays ?? 0;
  const dueCards = recentWorkspaceQuery.data?.workspace.flashcard_stats.due_today ?? 0;

  /** Navigate to the most-recently-updated workspace's flashcards page.
   *  WorkspacesResponse shape: { workspaces: WorkspaceListItem[], ... }
   *  Server returns them sorted by updatedAt desc, so [0] is always the
   *  most recently active workspace.
   */
  function handleStartReview() {
    const recent = wsData?.workspaces?.[0];
    if (recent) {
      router.push(`/dashboard/workspace/${recent.id}/flashcards`);
    } else {
      router.push('/dashboard/workspaces');
    }
  }

  return (
    <>
      {/*
        ── Page layout
        Stack: Hero → Workspace Grid → Streak row
        The FAB is fixed-position and sits outside the flow.
      */}
      <div className="space-y-8">
        {/* Verification Banner */}
        <VerificationBanner
          status={vStatus}
          onVerifyClick={() => router.push('/dashboard/settings')}
        />

        {/* ── Hero greeting ────────────────────────────────────────────── */}
        <HeroSection
          user={user}
          streak={currentStreak}
          dueCards={dueCards}
          onStartReview={handleStartReview}
        />

        {/* ── Workspace section ────────────────────────────────────────── */}
        <section aria-labelledby="workspaces-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2
              id="workspaces-heading"
              className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]"
            >
              Workspaces
            </h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              Your active study environments
            </span>
          </div>

          {/*
            WorkspaceGrid manages its own TanStack Query data fetching.
            Dependency rule: imported from features/workspace (index only) ✅
          */}
          <WorkspaceGrid />
        </section>

        {/* ── Streak activity ──────────────────────────────────────────── */}
        {streakQuery.isLoading || statsQuery.isLoading ? (
          <CardSkeleton />
        ) : streakQuery.isError ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Failed to load streak activity
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Open Analytics to inspect your study activity in more detail.
              </p>
            </CardContent>
          </Card>
        ) : (
          <StreakCalendar data={streakQuery.data ?? []} currentStreak={currentStreak} />
        )}
      </div>

      {/* ── WorkspaceCreator dialog ──────────────────────────────────────
          Self-contained: reads workspaceStore.isCreatorOpen internally.
      ─────────────────────────────────────────────────────────────────── */}
      <WorkspaceCreator onSuccess={(id) => router.push(`/dashboard/workspace/${id}`)} />

      {/* ── Floating Action Button ───────────────────────────────────── */}
      <DashboardFAB />
    </>
  );
}
