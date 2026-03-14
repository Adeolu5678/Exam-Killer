// =============================================================================
// features/analytics/ui/AnalyticsPageShell.tsx
// FSD-compliant page shell — assembles StatsCardGrid, ProgressChart, StreakCalendar.
// Loaded lazily by the Next.js page route via next/dynamic.
// =============================================================================

'use client';

import React, { Suspense } from 'react';

import { BarChart2 } from 'lucide-react';

import styles from './AnalyticsPageShell.module.css';
import { AnalyticsPageSkeleton } from './AnalyticsSkeleton';
import { ProgressChart } from './ProgressChart';
import { StatsCardGrid } from './StatsCard';
import { StreakCalendar } from './StreakCalendar';
import { buildStatCards } from '../model/types';
import { useAggregatedStats, useProgressData, useStreakData } from '../model/useAnalytics';

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className={styles.error} role="alert">
      <BarChart2 size={20} />
      <span>Failed to load analytics: {message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalyticsPageShell — the actual assembled page
// ---------------------------------------------------------------------------
interface AnalyticsPageShellProps {
  workspaceId: string;
}

export function AnalyticsPageShell({ workspaceId }: AnalyticsPageShellProps) {
  const statsQuery = useAggregatedStats(workspaceId);
  const progressQuery = useProgressData(workspaceId);
  const streakQuery = useStreakData(workspaceId);

  // Show skeleton while loading any critical data
  if (statsQuery.isLoading || progressQuery.isLoading || streakQuery.isLoading) {
    return <AnalyticsPageSkeleton />;
  }

  // Show error if stats (primary data) failed
  if (statsQuery.isError) {
    return (
      <ErrorBanner
        message={statsQuery.error instanceof Error ? statsQuery.error.message : 'Unknown error'}
      />
    );
  }

  const stats = statsQuery.data;
  const progressData = progressQuery.data ?? [];
  const streakData = streakQuery.data ?? [];

  if (!stats) return <AnalyticsPageSkeleton />;

  const statCards = buildStatCards(stats);

  return (
    <div className={styles.page}>
      {/* Page heading */}
      <div className={styles.heading}>
        <div className={styles.headingIcon} aria-hidden>
          <BarChart2 size={20} />
        </div>
        <div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Track your study performance and consistency</p>
        </div>
      </div>

      {/* Top stats row */}
      <section className={styles.statsSection} aria-label="Performance statistics">
        <StatsCardGrid configs={statCards} />
      </section>

      {/* Progress chart */}
      <Suspense fallback={<div className={styles.chartFallback} />}>
        <section className={styles.chartSection} aria-label="Study progress over time">
          {progressQuery.isError ? (
            <ErrorBanner message="Could not load chart data" />
          ) : (
            <ProgressChart data={progressData} />
          )}
        </section>
      </Suspense>

      {/* Streak calendar */}
      <section className={styles.streakSection} aria-label="Study streak calendar">
        {streakQuery.isError ? (
          <ErrorBanner message="Could not load streak data" />
        ) : (
          <StreakCalendar data={streakData} currentStreak={stats.studyStreakDays} />
        )}
      </section>
    </div>
  );
}
