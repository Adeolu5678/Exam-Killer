import { Firestore, Timestamp } from 'firebase-admin/firestore';

import { verifyWorkspaceAccess } from '@/domains/workspaces';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

import type { AggregatedStats, AnalyticsSummary, ProgressDataPoint, StreakDay } from '../contracts/analytics';

const USER_PROGRESS_COLLECTION = 'user_progress';
const USER_WORKSPACE_PROGRESS_COLLECTION = 'user_workspace_progress';
const USAGE_STATS_COLLECTION = 'usage_stats';
const WORKSPACE_USAGE_STATS_COLLECTION = 'workspace_usage_stats';

interface UsageStatsRecord {
  total_study_time_minutes?: number;
  total_flashcards_reviewed?: number;
  total_quizzes_completed?: number;
  total_exams_completed?: number;
  total_sessions_completed?: number;
  flashcards_mastered?: number;
  quiz_score_sum?: number;
  quiz_count?: number;
}

interface ProgressRecord {
  user_id?: string;
  workspace_id?: string;
  date?: Timestamp | Date;
  study_time_minutes?: number;
  flashcards_reviewed?: number;
  quizzes_completed?: number;
  exams_completed?: number;
  sessions_completed?: number;
  flashcards_mastered?: number;
  quiz_score?: number;
}

interface ActivityComputation {
  progress: ProgressDataPoint[];
  streak: StreakDay[];
  totals: {
    activeDays: number;
    lastActiveDate: string | null;
    totalStudyMinutes: number;
    cardsReviewed: number;
    sessionsCompleted: number;
    flashcardsMastered: number;
    quizScoreSum: number;
    quizScoreCount: number;
  };
}

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function toDate(value: Timestamp | Date | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value;
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWindowStart(days: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  return start;
}

function computeIntensity(studyMinutes: number, cardsReviewed: number, sessionsCompleted: number): 0 | 1 | 2 | 3 {
  const score = studyMinutes + cardsReviewed * 2 + sessionsCompleted * 20;
  if (score <= 0) {
    return 0;
  }
  if (score < 40) {
    return 1;
  }
  if (score < 120) {
    return 2;
  }
  return 3;
}

function computeCurrentStreak(streak: StreakDay[]): number {
  let count = 0;
  for (let i = streak.length - 1; i >= 0; i -= 1) {
    if (!streak[i].hasActivity) {
      break;
    }
    count += 1;
  }
  return count;
}

function computeActivity(records: ProgressRecord[], days: number, startDate: Date): ActivityComputation {
  const points = new Map<string, ProgressDataPoint>();
  const sessionCountByDate = new Map<string, number>();
  const scoreCountByDate = new Map<string, number>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + offset);
    const dateKey = formatDate(date);
    points.set(dateKey, {
      date: dateKey,
      studyMinutes: 0,
      cardsReviewed: 0,
      quizScore: null,
    });
    sessionCountByDate.set(dateKey, 0);
    scoreCountByDate.set(dateKey, 0);
  }

  let totalStudyMinutes = 0;
  let cardsReviewed = 0;
  let sessionsCompleted = 0;
  let flashcardsMastered = 0;
  let quizScoreSum = 0;
  let quizScoreCount = 0;

  for (const record of records) {
    const activityDate = toDate(record.date);
    if (!activityDate) {
      continue;
    }
    const dateKey = formatDate(activityDate);
    const point = points.get(dateKey);
    if (!point) {
      continue;
    }

    const studyMinutes = safeNumber(record.study_time_minutes);
    const reviewedCards = safeNumber(record.flashcards_reviewed);
    const completedSessions =
      safeNumber(record.sessions_completed) +
      safeNumber(record.quizzes_completed) +
      safeNumber(record.exams_completed);
    const masteredCards = safeNumber(record.flashcards_mastered);

    point.studyMinutes += studyMinutes;
    point.cardsReviewed += reviewedCards;
    sessionCountByDate.set(dateKey, (sessionCountByDate.get(dateKey) || 0) + completedSessions);

    totalStudyMinutes += studyMinutes;
    cardsReviewed += reviewedCards;
    sessionsCompleted += completedSessions;
    flashcardsMastered += masteredCards;

    const quizScore = record.quiz_score;
    if (typeof quizScore === 'number' && Number.isFinite(quizScore)) {
      const previousScore = point.quizScore ?? 0;
      const previousCount = scoreCountByDate.get(dateKey) || 0;
      const nextCount = previousCount + 1;
      point.quizScore = Math.round((previousScore * previousCount + quizScore) / nextCount);
      scoreCountByDate.set(dateKey, nextCount);
      quizScoreSum += quizScore;
      quizScoreCount += 1;
    }
  }

  const progress = Array.from(points.values());
  let activeDays = 0;
  let lastActiveDate: string | null = null;

  const streak: StreakDay[] = progress.map((point) => {
    const sessions = sessionCountByDate.get(point.date) || 0;
    const hasActivity = point.studyMinutes > 0 || point.cardsReviewed > 0 || sessions > 0;
    if (hasActivity) {
      activeDays += 1;
      lastActiveDate = point.date;
    }
    return {
      date: point.date,
      hasActivity,
      intensityLevel: computeIntensity(point.studyMinutes, point.cardsReviewed, sessions),
    };
  });

  return {
    progress,
    streak,
    totals: {
      activeDays,
      lastActiveDate,
      totalStudyMinutes,
      cardsReviewed,
      sessionsCompleted,
      flashcardsMastered,
      quizScoreSum,
      quizScoreCount,
    },
  };
}

function buildStatsFromUsage(record: UsageStatsRecord | undefined, streakDays: number): AggregatedStats {
  const totalSessions =
    safeNumber(record?.total_sessions_completed) +
    safeNumber(record?.total_quizzes_completed) +
    safeNumber(record?.total_exams_completed);

  const quizCount = safeNumber(record?.quiz_count);
  const avgQuizScore =
    quizCount > 0 ? Math.round(safeNumber(record?.quiz_score_sum) / Math.max(1, quizCount)) : 0;

  return {
    totalSessions,
    cardsReviewed: safeNumber(record?.total_flashcards_reviewed),
    avgQuizScore,
    studyStreakDays: streakDays,
    totalStudyMinutes: safeNumber(record?.total_study_time_minutes),
    flashcardsMastered: safeNumber(record?.flashcards_mastered),
  };
}

async function assertWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);
  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }
  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this workspace');
  }
}

async function queryGlobalProgressRecords(
  db: Firestore,
  userId: string,
  startDate: Date,
): Promise<ProgressRecord[]> {
  const snapshot = await db
    .collection(USER_PROGRESS_COLLECTION)
    .where('user_id', '==', userId)
    .where('date', '>=', Timestamp.fromDate(startDate))
    .orderBy('date', 'asc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as ProgressRecord);
}

async function queryWorkspaceProgressRecords(
  db: Firestore,
  workspaceId: string,
  userId: string,
  startDate: Date,
): Promise<ProgressRecord[]> {
  const snapshot = await db
    .collection(USER_WORKSPACE_PROGRESS_COLLECTION)
    .where('user_id', '==', userId)
    .where('workspace_id', '==', workspaceId)
    .where('date', '>=', Timestamp.fromDate(startDate))
    .orderBy('date', 'asc')
    .get();

  if (!snapshot.empty) {
    return snapshot.docs.map((doc) => doc.data() as ProgressRecord);
  }

  const fallback = await db
    .collection(USER_PROGRESS_COLLECTION)
    .where('user_id', '==', userId)
    .where('workspace_id', '==', workspaceId)
    .where('date', '>=', Timestamp.fromDate(startDate))
    .orderBy('date', 'asc')
    .get();

  return fallback.docs.map((doc) => doc.data() as ProgressRecord);
}

export async function getGlobalAnalyticsSummary(userId: string, days: number = 30): Promise<AnalyticsSummary> {
  const db = getDb();
  const startDate = getWindowStart(days);

  const [usageDoc, userDoc, progressRecords] = await Promise.all([
    db.collection(USAGE_STATS_COLLECTION).doc(userId).get(),
    db.collection('users').doc(userId).get(),
    queryGlobalProgressRecords(db, userId, startDate),
  ]);

  const activity = computeActivity(progressRecords, days, startDate);
  const userData = userDoc.data() as { current_streak?: number } | undefined;
  const computedStreak = computeCurrentStreak(activity.streak);
  const studyStreakDays =
    typeof userData?.current_streak === 'number' ? userData.current_streak : computedStreak;

  const stats = buildStatsFromUsage(usageDoc.data() as UsageStatsRecord | undefined, studyStreakDays);

  return {
    stats,
    progress: activity.progress,
    streak: activity.streak,
    summary: {
      periodDays: days,
      activeDays: activity.totals.activeDays,
      lastActiveDate: activity.totals.lastActiveDate,
    },
  };
}

export async function getWorkspaceAnalyticsSummary(
  workspaceId: string,
  userId: string,
  days: number = 30,
): Promise<AnalyticsSummary> {
  await assertWorkspaceAccess(workspaceId, userId);

  const db = getDb();
  const startDate = getWindowStart(days);

  const [usageDoc, progressRecords] = await Promise.all([
    db.collection(WORKSPACE_USAGE_STATS_COLLECTION).doc(`${userId}_${workspaceId}`).get(),
    queryWorkspaceProgressRecords(db, workspaceId, userId, startDate),
  ]);

  const activity = computeActivity(progressRecords, days, startDate);
  const streakDays = computeCurrentStreak(activity.streak);

  const usageRecord = usageDoc.data() as UsageStatsRecord | undefined;
  const stats = usageRecord
    ? buildStatsFromUsage(usageRecord, streakDays)
    : {
        totalSessions: activity.totals.sessionsCompleted,
        cardsReviewed: activity.totals.cardsReviewed,
        avgQuizScore:
          activity.totals.quizScoreCount > 0
            ? Math.round(activity.totals.quizScoreSum / activity.totals.quizScoreCount)
            : 0,
        studyStreakDays: streakDays,
        totalStudyMinutes: activity.totals.totalStudyMinutes,
        flashcardsMastered: activity.totals.flashcardsMastered,
      };

  return {
    stats,
    progress: activity.progress,
    streak: activity.streak,
    summary: {
      periodDays: days,
      activeDays: activity.totals.activeDays,
      lastActiveDate: activity.totals.lastActiveDate,
    },
  };
}

export async function getGlobalStats(userId: string): Promise<AggregatedStats> {
  return (await getGlobalAnalyticsSummary(userId, 30)).stats;
}

export async function getGlobalProgress(userId: string, days: number = 30): Promise<ProgressDataPoint[]> {
  return (await getGlobalAnalyticsSummary(userId, days)).progress;
}

export async function getGlobalStreak(userId: string, days: number = 30): Promise<StreakDay[]> {
  return (await getGlobalAnalyticsSummary(userId, days)).streak;
}

export async function getWorkspaceStats(workspaceId: string, userId: string): Promise<AggregatedStats> {
  return (await getWorkspaceAnalyticsSummary(workspaceId, userId, 30)).stats;
}

export async function getWorkspaceProgress(
  workspaceId: string,
  userId: string,
  days: number = 30,
): Promise<ProgressDataPoint[]> {
  return (await getWorkspaceAnalyticsSummary(workspaceId, userId, days)).progress;
}

export async function getWorkspaceStreak(
  workspaceId: string,
  userId: string,
  days: number = 30,
): Promise<StreakDay[]> {
  return (await getWorkspaceAnalyticsSummary(workspaceId, userId, days)).streak;
}

