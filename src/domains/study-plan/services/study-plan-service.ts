import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { verifyWorkspaceAccess } from '@/domains/workspaces';

import { updateUserStats } from '@/shared/lib/analytics/stats';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import { getChatCompletion } from '@/shared/lib/openai/client';
import { STUDY_PLAN_RESPONSE_SCHEMA, createStudyPlanPrompt } from '@/shared/lib/openai/prompts';
import { consumeAiQueryQuota } from '@/shared/lib/paystack/db';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

import type {
  CreateExamRequest,
  CreateStudySessionRequest,
  GenerateStudyPlanRequest,
  GeneratedScheduleItem,
  StudyExamSummary,
  StudyPlanSummary,
  StudySessionSummary,
  UpdateExamRequest,
  UpdateStudyPlanRequest,
  UpdateStudySessionRequest,
  WorkspaceStudyPlanBundle,
} from '../contracts/study-plan';
import { generatedScheduleItemSchema } from '../contracts/study-plan';

const STUDY_SESSIONS_COLLECTION = 'study_sessions';
const STUDY_EXAMS_COLLECTION = 'study_exams';
const STUDY_PLANS_COLLECTION = 'study_plans';

interface StudySessionRecord {
  workspace_id?: string;
  user_id?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  start_time?: Timestamp | Date;
  end_time?: Timestamp | Date;
  duration_minutes?: number;
  is_recurring?: boolean;
  recurrence_days?: number[];
  completed_at?: Timestamp | Date | null;
  created_at?: Timestamp | Date;
  updated_at?: Timestamp | Date;
}

interface StudyExamRecord {
  workspace_id?: string;
  user_id?: string;
  title?: string;
  subject?: string;
  exam_date?: string;
  venue?: string;
  notes?: string;
  is_primary?: boolean;
  created_at?: Timestamp | Date;
  updated_at?: Timestamp | Date;
}

interface StudyPlanRecord {
  workspace_id?: string;
  user_id?: string;
  title?: string;
  exam_date?: Timestamp | Date;
  daily_study_hours?: number;
  topics_to_cover?: string[];
  generated_schedule?: GeneratedScheduleItem[];
  status?: 'active' | 'paused' | 'completed';
  created_at?: Timestamp | Date;
  updated_at?: Timestamp | Date;
}

const generatedScheduleSchema = z.array(generatedScheduleItemSchema);

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function toIsoString(value: Timestamp | Date | null | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return value.toISOString();
}

function toDate(value: Timestamp | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  return value;
}

function toDateOnlyString(value: Timestamp | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDateTime(value: string, fieldName: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseIsoDate(value: string, fieldName: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid ${fieldName}`);
  }
  return parsed;
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

function mapSession(id: string, record: StudySessionRecord): StudySessionSummary {
  return {
    id,
    workspaceId: String(record.workspace_id || ''),
    title: String(record.title || ''),
    description: record.description ? String(record.description) : undefined,
    category: (record.category || 'reading') as StudySessionSummary['category'],
    status: (record.status || 'scheduled') as StudySessionSummary['status'],
    startTime: toIsoString(record.start_time),
    endTime: toIsoString(record.end_time),
    durationMinutes: typeof record.duration_minutes === 'number' ? record.duration_minutes : 0,
    isRecurring: record.is_recurring === true,
    recurrenceDays: Array.isArray(record.recurrence_days)
      ? record.recurrence_days.map((value) => Number(value))
      : undefined,
    completedAt: record.completed_at ? toIsoString(record.completed_at) : undefined,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

function mapExam(id: string, record: StudyExamRecord): StudyExamSummary {
  return {
    id,
    workspaceId: String(record.workspace_id || ''),
    title: String(record.title || ''),
    subject: String(record.subject || ''),
    examDate: String(record.exam_date || ''),
    venue: record.venue ? String(record.venue) : undefined,
    notes: record.notes ? String(record.notes) : undefined,
    isPrimary: record.is_primary === true,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

function mapPlan(id: string, record: StudyPlanRecord): StudyPlanSummary {
  const generatedSchedule = Array.isArray(record.generated_schedule) ? record.generated_schedule : [];
  const totalItems = generatedSchedule.length;
  const completedItems = generatedSchedule.filter((item) => item.completed).length;

  return {
    id,
    workspaceId: String(record.workspace_id || ''),
    title: String(record.title || 'Study Plan'),
    examDate: toDateOnlyString(record.exam_date),
    dailyStudyHours:
      typeof record.daily_study_hours === 'number' && Number.isFinite(record.daily_study_hours)
        ? record.daily_study_hours
        : 0,
    focusTopics: Array.isArray(record.topics_to_cover)
      ? record.topics_to_cover.map((topic) => String(topic))
      : [],
    generatedSchedule,
    status: record.status || 'active',
    progress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    createdAt: toIsoString(record.created_at),
    updatedAt: toIsoString(record.updated_at),
  };
}

async function ensureSessionInWorkspace(
  db: Firestore,
  sessionId: string,
  workspaceId: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: StudySessionRecord }> {
  const ref = db.collection(STUDY_SESSIONS_COLLECTION).doc(sessionId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new ValidationError('Study session not found');
  }

  const data = snapshot.data() as StudySessionRecord | undefined;
  if (!data || String(data.workspace_id || '') !== workspaceId) {
    throw new ValidationError('Study session not found');
  }
  return { ref, data };
}

async function ensureExamInWorkspace(
  db: Firestore,
  examId: string,
  workspaceId: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: StudyExamRecord }> {
  const ref = db.collection(STUDY_EXAMS_COLLECTION).doc(examId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new ValidationError('Exam date not found');
  }

  const data = snapshot.data() as StudyExamRecord | undefined;
  if (!data || String(data.workspace_id || '') !== workspaceId) {
    throw new ValidationError('Exam date not found');
  }
  return { ref, data };
}

async function ensurePlanInWorkspace(
  db: Firestore,
  planId: string,
  workspaceId: string,
  userId: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; data: StudyPlanRecord }> {
  const ref = db.collection(STUDY_PLANS_COLLECTION).doc(planId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new ValidationError('Study plan not found');
  }

  const data = snapshot.data() as StudyPlanRecord | undefined;
  if (!data || String(data.workspace_id || '') !== workspaceId) {
    throw new ValidationError('Study plan not found');
  }

  if (String(data.user_id || '') !== userId) {
    throw new AuthorizationError('You do not have permission to modify this study plan');
  }

  return { ref, data };
}

export async function getWorkspaceStudyPlanBundle(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceStudyPlanBundle> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();

  const [sessionSnapshot, examSnapshot, plansSnapshot] = await Promise.all([
    db.collection(STUDY_SESSIONS_COLLECTION).where('workspace_id', '==', workspaceId).get(),
    db.collection(STUDY_EXAMS_COLLECTION).where('workspace_id', '==', workspaceId).get(),
    db.collection(STUDY_PLANS_COLLECTION).where('workspace_id', '==', workspaceId).get(),
  ]);

  const sessions = sessionSnapshot.docs
    .map((doc) => mapSession(doc.id, doc.data() as StudySessionRecord))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  const exams = examSnapshot.docs
    .map((doc) => mapExam(doc.id, doc.data() as StudyExamRecord))
    .sort((a, b) => a.examDate.localeCompare(b.examDate));

  const plans = plansSnapshot.docs
    .map((doc) => mapPlan(doc.id, doc.data() as StudyPlanRecord))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return { sessions, exams, plans };
}

export async function listWorkspaceStudySessions(
  workspaceId: string,
  userId: string,
): Promise<{ sessions: StudySessionSummary[] }> {
  const bundle = await getWorkspaceStudyPlanBundle(workspaceId, userId);
  return { sessions: bundle.sessions };
}

export async function getStudySession(
  workspaceId: string,
  sessionId: string,
  userId: string,
): Promise<StudySessionSummary> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const { data } = await ensureSessionInWorkspace(db, sessionId, workspaceId);
  return mapSession(sessionId, data);
}

export async function createStudySession(input: {
  workspaceId: string;
  userId: string;
  payload: CreateStudySessionRequest;
}): Promise<StudySessionSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const now = Timestamp.now();

  const startDate = parseIsoDateTime(input.payload.startTime, 'startTime');
  const endDate = parseIsoDateTime(input.payload.endTime, 'endTime');
  const durationMinutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60_000));

  const ref = db.collection(STUDY_SESSIONS_COLLECTION).doc();
  const record: StudySessionRecord = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: input.payload.title.trim(),
    description: input.payload.description?.trim() || '',
    category: input.payload.category,
    status: 'scheduled',
    start_time: Timestamp.fromDate(startDate),
    end_time: Timestamp.fromDate(endDate),
    duration_minutes: durationMinutes,
    is_recurring: input.payload.isRecurring,
    recurrence_days: input.payload.recurrenceDays || [],
    completed_at: null,
    created_at: now,
    updated_at: now,
  };

  await ref.set(record);
  return mapSession(ref.id, record);
}

export async function updateStudySession(input: {
  workspaceId: string;
  sessionId: string;
  userId: string;
  payload: UpdateStudySessionRequest;
}): Promise<StudySessionSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const { ref, data } = await ensureSessionInWorkspace(db, input.sessionId, input.workspaceId);

  const updateData: Partial<StudySessionRecord> = {
    updated_at: Timestamp.now(),
  };

  if (input.payload.title !== undefined) {
    updateData.title = input.payload.title.trim();
  }
  if (input.payload.description !== undefined) {
    updateData.description = input.payload.description.trim();
  }
  if (input.payload.category !== undefined) {
    updateData.category = input.payload.category;
  }
  if (input.payload.status !== undefined) {
    updateData.status = input.payload.status;
    updateData.completed_at =
      input.payload.status === 'completed' ? Timestamp.now() : (data.completed_at ?? null);
  }
  if (input.payload.startTime !== undefined) {
    updateData.start_time = Timestamp.fromDate(parseIsoDateTime(input.payload.startTime, 'startTime'));
  }
  if (input.payload.endTime !== undefined) {
    updateData.end_time = Timestamp.fromDate(parseIsoDateTime(input.payload.endTime, 'endTime'));
  }
  if (input.payload.isRecurring !== undefined) {
    updateData.is_recurring = input.payload.isRecurring;
  }
  if (input.payload.recurrenceDays !== undefined) {
    updateData.recurrence_days = input.payload.recurrenceDays;
  }

  const nextStart = input.payload.startTime
    ? parseIsoDateTime(input.payload.startTime, 'startTime')
    : toDate(data.start_time);
  const nextEnd = input.payload.endTime
    ? parseIsoDateTime(input.payload.endTime, 'endTime')
    : toDate(data.end_time);
  if (nextStart && nextEnd) {
    updateData.duration_minutes = Math.max(0, Math.round((nextEnd.getTime() - nextStart.getTime()) / 60_000));
  }

  await ref.update(updateData);
  const updatedDoc = await ref.get();
  const updatedData = updatedDoc.data() as StudySessionRecord | undefined;
  if (!updatedData) {
    throw new ValidationError('Study session not found after update');
  }
  return mapSession(updatedDoc.id, updatedData);
}

export async function deleteStudySession(
  workspaceId: string,
  sessionId: string,
  userId: string,
): Promise<void> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const { ref } = await ensureSessionInWorkspace(db, sessionId, workspaceId);
  await ref.delete();
}

export async function completeStudySession(
  workspaceId: string,
  sessionId: string,
  userId: string,
): Promise<StudySessionSummary> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const sessionRef = db.collection(STUDY_SESSIONS_COLLECTION).doc(sessionId);
  const now = Timestamp.now();
  const completionMeta: { analyticsDelta: { studyMinutes: number; xpEarned: number } | null } = {
    analyticsDelta: null,
  };

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(sessionRef);
    if (!snapshot.exists) {
      throw new ValidationError('Study session not found');
    }

    const record = snapshot.data() as StudySessionRecord | undefined;
    if (!record || String(record.workspace_id || '') !== workspaceId) {
      throw new ValidationError('Study session not found');
    }

    if (record.status === 'completed') {
      return;
    }

    const duration = Math.max(0, Number(record.duration_minutes || 0));
    const studyMinutes = record.category === 'break' ? 0 : duration;

    const nextRecord: StudySessionRecord = {
      ...record,
      status: 'completed',
      completed_at: now,
      updated_at: now,
    };
    tx.update(sessionRef, {
      status: nextRecord.status,
      completed_at: nextRecord.completed_at,
      updated_at: nextRecord.updated_at,
    });
    completionMeta.analyticsDelta = {
      studyMinutes,
      xpEarned: studyMinutes > 0 ? Math.max(5, Math.round(studyMinutes / 10)) : 0,
    };
  });

  const finalSnapshot = await sessionRef.get();
  if (!finalSnapshot.exists) {
    throw new ValidationError('Study session not found');
  }
  const finalRecord = finalSnapshot.data() as StudySessionRecord | undefined;
  if (!finalRecord) {
    throw new ValidationError('Study session not found');
  }

  if (completionMeta.analyticsDelta) {
    await updateUserStats(db, userId, {
      workspace_id: workspaceId,
      sessions_completed: 1,
      study_time_minutes: completionMeta.analyticsDelta.studyMinutes,
      xp_earned: completionMeta.analyticsDelta.xpEarned,
    });
  }

  return mapSession(sessionId, finalRecord);
}

export async function listWorkspaceExams(
  workspaceId: string,
  userId: string,
): Promise<{ exams: StudyExamSummary[] }> {
  const bundle = await getWorkspaceStudyPlanBundle(workspaceId, userId);
  return { exams: bundle.exams };
}

export async function createExam(input: {
  workspaceId: string;
  userId: string;
  payload: CreateExamRequest;
}): Promise<StudyExamSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const now = Timestamp.now();

  if (input.payload.isPrimary) {
    const existingPrimary = await db
      .collection(STUDY_EXAMS_COLLECTION)
      .where('workspace_id', '==', input.workspaceId)
      .where('is_primary', '==', true)
      .get();
    if (!existingPrimary.empty) {
      const batch = db.batch();
      existingPrimary.docs.forEach((doc) => {
        batch.update(doc.ref, { is_primary: false, updated_at: now });
      });
      await batch.commit();
    }
  }

  const ref = db.collection(STUDY_EXAMS_COLLECTION).doc();
  const record: StudyExamRecord = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: input.payload.title.trim(),
    subject: input.payload.subject.trim(),
    exam_date: input.payload.examDate,
    venue: input.payload.venue?.trim() || '',
    notes: input.payload.notes?.trim() || '',
    is_primary: input.payload.isPrimary,
    created_at: now,
    updated_at: now,
  };
  await ref.set(record);
  return mapExam(ref.id, record);
}

export async function updateExam(input: {
  workspaceId: string;
  examId: string;
  userId: string;
  payload: UpdateExamRequest;
}): Promise<StudyExamSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const { ref } = await ensureExamInWorkspace(db, input.examId, input.workspaceId);
  const now = Timestamp.now();

  if (input.payload.isPrimary === true) {
    const existingPrimary = await db
      .collection(STUDY_EXAMS_COLLECTION)
      .where('workspace_id', '==', input.workspaceId)
      .where('is_primary', '==', true)
      .get();

    if (!existingPrimary.empty) {
      const batch = db.batch();
      existingPrimary.docs
        .filter((doc) => doc.id !== input.examId)
        .forEach((doc) => {
          batch.update(doc.ref, { is_primary: false, updated_at: now });
        });
      await batch.commit();
    }
  }

  const updateData: Partial<StudyExamRecord> = { updated_at: now };
  if (input.payload.title !== undefined) {
    updateData.title = input.payload.title.trim();
  }
  if (input.payload.subject !== undefined) {
    updateData.subject = input.payload.subject.trim();
  }
  if (input.payload.examDate !== undefined) {
    updateData.exam_date = input.payload.examDate;
  }
  if (input.payload.venue !== undefined) {
    updateData.venue = input.payload.venue.trim();
  }
  if (input.payload.notes !== undefined) {
    updateData.notes = input.payload.notes.trim();
  }
  if (input.payload.isPrimary !== undefined) {
    updateData.is_primary = input.payload.isPrimary;
  }

  await ref.update(updateData);
  const updatedDoc = await ref.get();
  const updatedData = updatedDoc.data() as StudyExamRecord | undefined;
  if (!updatedData) {
    throw new ValidationError('Exam date not found after update');
  }
  return mapExam(updatedDoc.id, updatedData);
}

export async function deleteExam(workspaceId: string, examId: string, userId: string): Promise<void> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const { ref } = await ensureExamInWorkspace(db, examId, workspaceId);
  await ref.delete();
}

export async function listWorkspaceStudyPlans(
  workspaceId: string,
  userId: string,
): Promise<{ plans: StudyPlanSummary[] }> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const snapshot = await db.collection(STUDY_PLANS_COLLECTION).where('workspace_id', '==', workspaceId).get();

  const plans = snapshot.docs
    .map((doc) => mapPlan(doc.id, doc.data() as StudyPlanRecord))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return { plans };
}

export async function getStudyPlan(
  workspaceId: string,
  planId: string,
  userId: string,
): Promise<StudyPlanSummary> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const { data } = await ensurePlanInWorkspace(db, planId, workspaceId, userId);
  return mapPlan(planId, data);
}

export async function generateStudyPlan(input: {
  workspaceId: string;
  userId: string;
  payload: GenerateStudyPlanRequest;
}): Promise<StudyPlanSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();

  const examDate = parseIsoDate(input.payload.exam_date, 'exam_date');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExam < 1) {
    throw new ValidationError('Exam date must be in the future');
  }

  const aiQuota = await consumeAiQueryQuota(input.userId);
  if (!aiQuota.allowed) {
    throw new AuthorizationError('You have reached your daily AI query limit. Upgrade your plan.');
  }

  const maxDays = Math.min(input.payload.max_days || daysUntilExam, 60);
  const prompt = createStudyPlanPrompt({
    examDate: input.payload.exam_date,
    daysUntilExam,
    dailyStudyHours: input.payload.daily_study_hours,
    focusTopics: input.payload.focus_topics,
    maxDays,
  });

  const rawResponse = await getChatCompletion([{ role: 'user', content: prompt }], {
    mockType: 'study_plan',
    responseMimeType: 'application/json',
    responseSchema: STUDY_PLAN_RESPONSE_SCHEMA,
  });

  let generatedSchedule: GeneratedScheduleItem[];
  try {
    generatedSchedule = generatedScheduleSchema.parse(JSON.parse(rawResponse));
  } catch (error) {
    throw new ValidationError('Failed to parse generated study plan', {
      cause: error instanceof Error ? error.message : 'Invalid model output',
    });
  }

  const now = Timestamp.now();
  const ref = db.collection(STUDY_PLANS_COLLECTION).doc();
  const record: StudyPlanRecord = {
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: input.payload.title?.trim() || 'AI Study Plan',
    exam_date: Timestamp.fromDate(examDate),
    daily_study_hours: input.payload.daily_study_hours,
    topics_to_cover: input.payload.focus_topics,
    generated_schedule: generatedSchedule,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  await ref.set(record);
  return mapPlan(ref.id, record);
}

export async function updateStudyPlan(input: {
  workspaceId: string;
  planId: string;
  userId: string;
  payload: UpdateStudyPlanRequest;
}): Promise<StudyPlanSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const { ref } = await ensurePlanInWorkspace(db, input.planId, input.workspaceId, input.userId);

  const updateData: Partial<StudyPlanRecord> = {
    updated_at: Timestamp.now(),
  };

  if (input.payload.title !== undefined) {
    updateData.title = input.payload.title.trim();
  }
  if (input.payload.status !== undefined) {
    updateData.status = input.payload.status;
  }
  if (input.payload.exam_date !== undefined) {
    updateData.exam_date = Timestamp.fromDate(parseIsoDate(input.payload.exam_date, 'exam_date'));
  }
  if (input.payload.daily_study_hours !== undefined) {
    updateData.daily_study_hours = input.payload.daily_study_hours;
  }
  if (input.payload.focus_topics !== undefined) {
    updateData.topics_to_cover = input.payload.focus_topics;
  }
  if (input.payload.generated_schedule !== undefined) {
    updateData.generated_schedule = input.payload.generated_schedule;
  }

  await ref.update(updateData);
  const updatedDoc = await ref.get();
  const updatedData = updatedDoc.data() as StudyPlanRecord | undefined;
  if (!updatedData) {
    throw new ValidationError('Study plan not found after update');
  }
  return mapPlan(updatedDoc.id, updatedData);
}

export async function completeStudyPlanItem(input: {
  workspaceId: string;
  planId: string;
  itemIndex: number;
  userId: string;
  completed: boolean;
}): Promise<StudyPlanSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const ref = db.collection(STUDY_PLANS_COLLECTION).doc(input.planId);

  let resultingRecord: StudyPlanRecord | null = null;
  let shouldRecordActivity = false;
  let completedDuration = 0;

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new ValidationError('Study plan not found');
    }

    const record = snapshot.data() as StudyPlanRecord | undefined;
    if (!record || String(record.workspace_id || '') !== input.workspaceId) {
      throw new ValidationError('Study plan not found');
    }

    if (String(record.user_id || '') !== input.userId) {
      throw new AuthorizationError('You do not have permission to modify this study plan');
    }

    const schedule = Array.isArray(record.generated_schedule) ? [...record.generated_schedule] : [];
    if (input.itemIndex < 0 || input.itemIndex >= schedule.length) {
      throw new ValidationError('Study plan item index out of range');
    }

    const currentItem = schedule[input.itemIndex];
    if (currentItem.completed === input.completed) {
      resultingRecord = record;
      return;
    }

    schedule[input.itemIndex] = {
      ...currentItem,
      completed: input.completed,
    };

    const now = Timestamp.now();
    const nextRecord: StudyPlanRecord = {
      ...record,
      generated_schedule: schedule,
      updated_at: now,
    };

    tx.update(ref, {
      generated_schedule: schedule,
      updated_at: now,
    });

    resultingRecord = nextRecord;
    shouldRecordActivity = input.completed;
    completedDuration = currentItem.duration_minutes;
  });

  if (!resultingRecord) {
    throw new ValidationError('Study plan not found');
  }

  if (shouldRecordActivity) {
    const duration = Math.max(0, Number(completedDuration || 0));
    await updateUserStats(db, input.userId, {
      workspace_id: input.workspaceId,
      sessions_completed: 1,
      study_time_minutes: duration,
      xp_earned: duration > 0 ? Math.max(5, Math.round(duration / 10)) : 0,
    });
  }

  return mapPlan(input.planId, resultingRecord);
}

