// =============================================================================
// features/analytics/api/analyticsApi.ts
// Layer: features → analytics → api
// Rule: Only called from model/useAnalytics.ts. No direct component usage.
// =============================================================================

import type { AggregatedStats, ProgressDataPoint, StreakDay } from '../model/types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

// ---------------------------------------------------------------------------
// Shared fetch helper (mirrors pattern across all feature api layers)
// ---------------------------------------------------------------------------
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || !body.success || body.data === undefined) {
    throw new Error(body?.error?.message ?? `API Error: ${res.status}`);
  }

  return body.data;
}

// ---------------------------------------------------------------------------
// Aggregated statistics (total sessions, cards reviewed, quiz score avg, etc.)
// ---------------------------------------------------------------------------
export async function fetchAggregatedStats(workspaceId: string): Promise<AggregatedStats> {
  const url =
    workspaceId === 'global'
      ? '/api/v1/analytics/global/stats'
      : `/api/v1/workspaces/${workspaceId}/analytics/stats`;
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
      ? `/api/v1/analytics/global/progress?days=${days}`
      : `/api/v1/workspaces/${workspaceId}/analytics/progress?days=${days}`;
  return apiFetch<ProgressDataPoint[]>(url);
}

// ---------------------------------------------------------------------------
// Streak data — 30-day activity calendar
// ---------------------------------------------------------------------------
export async function fetchStreakData(workspaceId: string): Promise<StreakDay[]> {
  const url =
    workspaceId === 'global'
      ? '/api/v1/analytics/global/streak'
      : `/api/v1/workspaces/${workspaceId}/analytics/streak`;
  return apiFetch<StreakDay[]>(url);
}
