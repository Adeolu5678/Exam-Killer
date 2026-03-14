// =============================================================================
// features/analytics/model/types.ts
// Layer: features → analytics → model
// =============================================================================

// ---------------------------------------------------------------------------
// Aggregated stats (the top-row StatsCard data)
// ---------------------------------------------------------------------------
export interface AggregatedStats {
  totalSessions: number;
  cardsReviewed: number;
  avgQuizScore: number; // 0–100
  studyStreakDays: number;
  totalStudyMinutes: number;
  flashcardsMastered: number;
}

// ---------------------------------------------------------------------------
// Progress chart (line/area chart — daily time + cards)
// ---------------------------------------------------------------------------
export interface ProgressDataPoint {
  date: string; // ISO date string, e.g. "2026-03-01"
  studyMinutes: number;
  cardsReviewed: number;
  quizScore: number | null; // null if no quiz taken that day
}

// ---------------------------------------------------------------------------
// Streak calendar (30-day heatmap)
// ---------------------------------------------------------------------------
export interface StreakDay {
  date: string; // ISO date string
  hasActivity: boolean;
  intensityLevel: 0 | 1 | 2 | 3; // 0 = no activity, 3 = high activity
}

// ---------------------------------------------------------------------------
// Stat card meta (for rendering the four top-row cards)
// ---------------------------------------------------------------------------
export type StatCardVariant = 'primary' | 'amber' | 'emerald' | 'violet';

export interface StatCardConfig {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  icon: string; // lucide icon name
  variant: StatCardVariant;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
}

// ---------------------------------------------------------------------------
// Helper: derive the six StatsCard configs from AggregatedStats
// ---------------------------------------------------------------------------
export function buildStatCards(stats: AggregatedStats): StatCardConfig[] {
  return [
    {
      id: 'streak',
      label: 'Study Streak',
      value: stats.studyStreakDays,
      unit: 'days',
      icon: 'Flame',
      variant: 'amber',
    },
    {
      id: 'sessions',
      label: 'Total Sessions',
      value: stats.totalSessions,
      icon: 'BookOpen',
      variant: 'primary',
    },
    {
      id: 'cards',
      label: 'Cards Mastered',
      value: stats.flashcardsMastered,
      icon: 'Layers',
      variant: 'emerald',
    },
    {
      id: 'quiz',
      label: 'Avg Quiz Score',
      value: `${Math.round(stats.avgQuizScore)}%`,
      icon: 'Trophy',
      variant: stats.avgQuizScore >= 70 ? 'emerald' : 'amber',
    },
    {
      id: 'time',
      label: 'Study Time',
      value: Math.round(stats.totalStudyMinutes / 60),
      unit: 'hrs',
      icon: 'Clock',
      variant: 'primary',
    },
    {
      id: 'reviewed',
      label: 'Cards Reviewed',
      value: stats.cardsReviewed,
      icon: 'RefreshCw',
      variant: 'violet',
    },
  ];
}

// ---------------------------------------------------------------------------
// Helper: format date for display in streak calendar
// ---------------------------------------------------------------------------
export function formatStreakDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// TanStack Query key factory
// ---------------------------------------------------------------------------
export const analyticsKeys = {
  all: (workspaceId: string) => ['analytics', workspaceId] as const,
  stats: (workspaceId: string) => ['analytics', workspaceId, 'stats'] as const,
  progress: (workspaceId: string, days: number) =>
    ['analytics', workspaceId, 'progress', days] as const,
  streak: (workspaceId: string) => ['analytics', workspaceId, 'streak'] as const,
};
