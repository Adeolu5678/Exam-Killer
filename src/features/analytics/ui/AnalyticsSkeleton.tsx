// =============================================================================
// features/analytics/ui/AnalyticsSkeleton.tsx
// Layer: features → analytics → ui
// Shimmer skeleton for the analytics page (next/dynamic fallback).
// =============================================================================

'use client';

import React from 'react';

import { Skeleton, CardSkeleton, StatSkeleton } from '@/shared/ui';

import styles from './AnalyticsSkeleton.module.css';

// ---------------------------------------------------------------------------
// Stats row skeleton — 6 stat cards
// ---------------------------------------------------------------------------
function StatsRowSkeleton() {
  return (
    <div className={styles.statsGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart skeleton
// ---------------------------------------------------------------------------
function ChartSkeleton() {
  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartHeader}>
        <Skeleton className={styles.chartTitle} />
        <Skeleton className={styles.chartRange} />
      </div>
      <Skeleton className={styles.chartBody} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streak calendar skeleton
// ---------------------------------------------------------------------------
function StreakSkeleton() {
  return (
    <div className={styles.streakWrap}>
      <div className={styles.streakHeader}>
        <Skeleton className={styles.streakTitle} />
        <Skeleton className={styles.streakBadge} />
      </div>
      <div className={styles.streakGrid}>
        {Array.from({ length: 30 }).map((_, i) => (
          <Skeleton key={i} className={styles.streakCell} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full page skeleton (exported as fallback for next/dynamic)
// ---------------------------------------------------------------------------
export function AnalyticsPageSkeleton() {
  return (
    <div className={styles.page}>
      {/* Page heading */}
      <div className={styles.heading}>
        <Skeleton className={styles.headingTitle} />
        <Skeleton className={styles.headingSubtitle} />
      </div>

      <StatsRowSkeleton />
      <ChartSkeleton />
      <StreakSkeleton />
    </div>
  );
}
