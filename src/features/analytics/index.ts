// =============================================================================
// features/analytics/index.ts  —  PUBLIC API
// Layer: features → analytics
// Rule: Consumers may ONLY import from this file.
//   ✅  import { StatsCard, useAggregatedStats } from '@/features/analytics'
//   ❌  import { ProgressChart } from '@/features/analytics/ui/ProgressChart'
// =============================================================================

// ── UI components ────────────────────────────────────────────────────────────
export { StatsCard, StatsCardGrid } from './ui/StatsCard';
export { ProgressChart } from './ui/ProgressChart';
export { AnalyticsPageShell } from './ui/AnalyticsPageShell';
export { StreakCalendar } from './ui/StreakCalendar';
export { AnalyticsPageSkeleton } from './ui/AnalyticsSkeleton';

// ── TanStack Query hooks ──────────────────────────────────────────────────────
export { useAggregatedStats, useProgressData, useStreakData } from './model/useAnalytics';

// ── Zustand store ─────────────────────────────────────────────────────────────
export { useAnalyticsStore } from './model/analyticsStore';
export type { ChartRange } from './model/analyticsStore';

// ── Types & helpers ──────────────────────────────────────────────────────────
export type {
  AggregatedStats,
  ProgressDataPoint,
  StreakDay,
  StatCardConfig,
  StatCardVariant,
} from './model/types';
export { buildStatCards, formatStreakDate, analyticsKeys } from './model/types';

// ── API functions (for advanced consumers, e.g. server components) ────────────
export { fetchAggregatedStats, fetchProgressData, fetchStreakData } from './api/analyticsApi';
