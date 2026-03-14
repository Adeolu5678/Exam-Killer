// =============================================================================
// features/analytics/api/analyticsApi.ts
// Layer: features → analytics → api
// Rule: Only called from model/useAnalytics.ts. No direct component usage.
// =============================================================================

import type { AggregatedStats, ProgressDataPoint, StreakDay } from '../model/types';

// ---------------------------------------------------------------------------
// Shared fetch helper (mirrors pattern across all feature api layers)
// ---------------------------------------------------------------------------
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `API Error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Aggregated statistics (total sessions, cards reviewed, quiz score avg, etc.)
// ---------------------------------------------------------------------------
export async function fetchAggregatedStats(workspaceId: string): Promise<AggregatedStats> {
  const url =
    workspaceId === 'global'
      ? '/api/analytics/global/stats'
      : `/api/analytics/${workspaceId}/stats`;
  return apiFetch<AggregatedStats>(url);
}

// ---------------------------------------------------------------------------
// Progress chart data — daily activity over the last N days
// ---------------------------------------------------------------------------
export async function fetchProgressData(
  workspaceId: string,
  days: number = 30,
): Promise<ProgressDataPoint[]> {
  const url =
    workspaceId === 'global'
      ? `/api/analytics/global/progress?days=${days}`
      : `/api/analytics/${workspaceId}/progress?days=${days}`;
  return apiFetch<ProgressDataPoint[]>(url);
}

// ---------------------------------------------------------------------------
// Streak data — 30-day activity calendar
// ---------------------------------------------------------------------------
export async function fetchStreakData(workspaceId: string): Promise<StreakDay[]> {
  const url =
    workspaceId === 'global'
      ? '/api/analytics/global/streak'
      : `/api/analytics/${workspaceId}/streak`;
  return apiFetch<StreakDay[]>(url);
}
