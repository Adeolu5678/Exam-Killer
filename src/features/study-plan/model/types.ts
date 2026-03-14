// =============================================================================
// features/study-plan/model/types.ts
// Layer: features → study-plan → model
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Domain Interfaces
// ---------------------------------------------------------------------------

export type SessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'skipped';
export type SessionCategory = 'reading' | 'practice' | 'review' | 'exam-prep' | 'break';
export type CalendarView = 'week' | 'month';

export interface StudySession {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  category: SessionCategory;
  status: SessionStatus;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  durationMinutes: number;
  isRecurring: boolean;
  recurrenceDays?: number[]; // 0-6 (Sun-Sat)
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamDate {
  id: string;
  workspaceId: string;
  title: string;
  subject: string;
  examDate: string; // ISO 8601 date string (YYYY-MM-DD)
  venue?: string;
  notes?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Computed / Derived Types
// ---------------------------------------------------------------------------

export interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  isToday: boolean;
  isCurrentMonth: boolean;
  sessions: StudySession[];
}

export interface CountdownData {
  examDate: ExamDate;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  isUrgent: boolean; // ≤ 7 days
  isPast: boolean;
  isToday: boolean;
}

export interface StudyPlanStats {
  totalSessionsThisWeek: number;
  completedSessionsThisWeek: number;
  totalStudyMinutesThisWeek: number;
  completionRate: number; // 0–100
  upcomingExamCount: number;
}

// ---------------------------------------------------------------------------
// Zod Schemas for Mutations
// ---------------------------------------------------------------------------

export const createStudySessionSchema = z.object({
  title: z.string().min(1, 'Session title is required').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['reading', 'practice', 'review', 'exam-prep', 'break']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isRecurring: z.boolean().default(false),
  recurrenceDays: z.array(z.number().min(0).max(6)).optional(),
});

export const createExamDateSchema = z.object({
  title: z.string().min(1, 'Exam title is required').max(150),
  subject: z.string().min(1, 'Subject is required').max(100),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  venue: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  isPrimary: z.boolean().default(false),
});

export type CreateStudySessionPayload = z.infer<typeof createStudySessionSchema>;
export type UpdateStudySessionPayload = Partial<CreateStudySessionPayload> & {
  status?: SessionStatus;
};
export type CreateExamDatePayload = z.infer<typeof createExamDateSchema>;
export type UpdateExamDatePayload = Partial<CreateExamDatePayload>;

// ---------------------------------------------------------------------------
// TanStack Query Key Factory
// ---------------------------------------------------------------------------

export const studyPlanKeys = {
  all: (workspaceId: string) => ['study-plan', workspaceId] as const,
  sessions: (workspaceId: string) => [...studyPlanKeys.all(workspaceId), 'sessions'] as const,
  session: (workspaceId: string, sessionId: string) =>
    [...studyPlanKeys.sessions(workspaceId), sessionId] as const,
  exams: (workspaceId: string) => [...studyPlanKeys.all(workspaceId), 'exams'] as const,
  exam: (workspaceId: string, examId: string) =>
    [...studyPlanKeys.exams(workspaceId), examId] as const,
};

// ---------------------------------------------------------------------------
// Category Config
// ---------------------------------------------------------------------------

export const SESSION_CATEGORY_CONFIG: Record<
  SessionCategory,
  { label: string; color: string; bgColor: string }
> = {
  reading: {
    label: 'Reading',
    color: 'var(--color-primary)',
    bgColor: 'var(--color-primary-muted)',
  },
  practice: {
    label: 'Practice',
    color: 'var(--color-accent-emerald)',
    bgColor: 'var(--color-accent-emerald-muted)',
  },
  review: {
    label: 'Review',
    color: 'var(--color-accent-violet)',
    bgColor: 'var(--color-accent-violet-muted)',
  },
  'exam-prep': {
    label: 'Exam Prep',
    color: 'var(--color-accent-amber)',
    bgColor: 'var(--color-accent-amber-muted)',
  },
  break: {
    label: 'Break',
    color: 'var(--color-text-muted)',
    bgColor: 'var(--color-bg-surface)',
  },
};

// ---------------------------------------------------------------------------
// Utility Helpers
// ---------------------------------------------------------------------------

/** Returns the countdown data for a given exam date. */
export function computeCountdown(exam: ExamDate): CountdownData {
  const now = new Date();
  const examDateObj = new Date(`${exam.examDate}T00:00:00`);
  const diffMs = examDateObj.getTime() - now.getTime();

  const totalMinutes = Math.floor(diffMs / 60_000);
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    examDate: exam,
    daysRemaining: Math.max(0, daysRemaining),
    hoursRemaining: Math.max(0, hoursRemaining),
    minutesRemaining: Math.max(0, minutesRemaining),
    isUrgent: daysRemaining >= 0 && daysRemaining <= 7,
    isPast: totalMinutes < 0,
    isToday: daysRemaining === 0,
  };
}

/** Build a grid of calendar days for a given month view. */
export function buildMonthGrid(
  year: number,
  month: number,
  sessions: StudySession[],
): CalendarDay[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();

  // Pad start of month to begin on Sunday
  const startPad = firstDay.getDay();
  const endPad = 6 - lastDay.getDay();

  const days: CalendarDay[] = [];

  // Leading days from previous month
  for (let i = startPad - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push(makeDayEntry(date, false, today, sessions));
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    days.push(makeDayEntry(date, true, today, sessions));
  }

  // Trailing days into next month
  for (let i = 1; i <= endPad; i++) {
    const date = new Date(year, month + 1, i);
    days.push(makeDayEntry(date, false, today, sessions));
  }

  // Chunk into weeks
  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Build a 7-day week grid starting from a given date. */
export function buildWeekGrid(anchorDate: Date, sessions: StudySession[]): CalendarDay[] {
  const today = new Date();
  const startOfWeek = new Date(anchorDate);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return makeDayEntry(date, true, today, sessions);
  });
}

function makeDayEntry(
  date: Date,
  isCurrentMonth: boolean,
  today: Date,
  sessions: StudySession[],
): CalendarDay {
  const dateStr = formatDateStr(date);
  const todayStr = formatDateStr(today);
  return {
    date,
    dateStr,
    isToday: dateStr === todayStr,
    isCurrentMonth,
    sessions: sessions.filter((s) => s.startTime.startsWith(dateStr)),
  };
}

export function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Compute weekly stats from sessions array */
export function computeWeekStats(sessions: StudySession[]): StudyPlanStats {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekSessions = sessions.filter((s) => {
    const t = new Date(s.startTime);
    return t >= weekStart && t < weekEnd;
  });

  const completed = weekSessions.filter((s) => s.status === 'completed');
  const totalMinutes = weekSessions
    .filter((s) => s.category !== 'break')
    .reduce((acc, s) => acc + s.durationMinutes, 0);

  return {
    totalSessionsThisWeek: weekSessions.length,
    completedSessionsThisWeek: completed.length,
    totalStudyMinutesThisWeek: totalMinutes,
    completionRate:
      weekSessions.length > 0 ? Math.round((completed.length / weekSessions.length) * 100) : 0,
    upcomingExamCount: 0, // injected by consumer
  };
}
