import { z } from 'zod';

export const analyticsDaysQuerySchema = z.object({
  days: z.number().int().min(1).max(365).optional().default(30),
});

export type AnalyticsDaysQuery = z.infer<typeof analyticsDaysQuerySchema>;

export interface AggregatedStats {
  totalSessions: number;
  cardsReviewed: number;
  avgQuizScore: number;
  studyStreakDays: number;
  totalStudyMinutes: number;
  flashcardsMastered: number;
}

export interface ProgressDataPoint {
  date: string;
  studyMinutes: number;
  cardsReviewed: number;
  quizScore: number | null;
}

export interface StreakDay {
  date: string;
  hasActivity: boolean;
  intensityLevel: 0 | 1 | 2 | 3;
}

export interface AnalyticsSummary {
  stats: AggregatedStats;
  progress: ProgressDataPoint[];
  streak: StreakDay[];
  summary: {
    periodDays: number;
    activeDays: number;
    lastActiveDate: string | null;
  };
}

