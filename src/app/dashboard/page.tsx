'use client';

// =============================================================================
// app/dashboard/page.tsx
// Layer: app (routing only)
// Assembles the dashboard from widget and feature components.
// FSD Dependency Rule: page → widgets → features → shared
//   ✅  import from @/widgets/DashboardWidget and @/features/workspace (index only)
//   ❌  import directly from features/workspace/ui/... or features/workspace/model/...
// =============================================================================

import React, { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/shared/hooks/useAuth';

import { VerificationBanner } from '@/features/identity/VerificationBanner';
import { useWorkspaces, WorkspaceCreator, WorkspaceGrid } from '@/features/workspace';

import { HeroSection, StreakPlaceholder, DashboardFAB } from '@/widgets/DashboardWidget';

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: wsData } = useWorkspaces();

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
        <HeroSection user={user} streak={0} dueCards={0} onStartReview={handleStartReview} />

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

        {/* ── Streak heatmap (placeholder) ─────────────────────────────── */}
        <StreakPlaceholder currentStreak={0} longestStreak={0} />
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
