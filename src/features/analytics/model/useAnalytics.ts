// =============================================================================
// features/analytics/model/useAnalytics.ts
// Layer: features → analytics → model
// TanStack Query v5 hooks for analytics data fetching.
// =============================================================================

import { useQuery } from '@tanstack/react-query';

import { useAnalyticsStore } from './analyticsStore';
import { analyticsKeys } from './types';
import { fetchAggregatedStats, fetchProgressData, fetchStreakData } from '../api/analyticsApi';

// ---------------------------------------------------------------------------
// Aggregated stats — 5 min stale time (stats don't change per-second)
// ---------------------------------------------------------------------------
export function useAggregatedStats(workspaceId: string) {
  return useQuery({
    queryKey: analyticsKeys.stats(workspaceId),
    queryFn: () => fetchAggregatedStats(workspaceId),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(workspaceId),
  });
}

// ---------------------------------------------------------------------------
// Progress chart data — respects chartRange from Zustand store
// ---------------------------------------------------------------------------
export function useProgressData(workspaceId: string) {
  const chartRange = useAnalyticsStore((s) => s.chartRange);

  return useQuery({
    queryKey: analyticsKeys.progress(workspaceId, chartRange),
    queryFn: () => fetchProgressData(workspaceId, chartRange),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(workspaceId),
  });
}

// ---------------------------------------------------------------------------
// Streak data — always 30-day window; low stale-time because streaks matter
// ---------------------------------------------------------------------------
export function useStreakData(workspaceId: string) {
  return useQuery({
    queryKey: analyticsKeys.streak(workspaceId),
    queryFn: () => fetchStreakData(workspaceId),
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(workspaceId),
  });
}
