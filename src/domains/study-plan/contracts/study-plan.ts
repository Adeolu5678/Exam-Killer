import { z } from 'zod';

export const sessionCategorySchema = z.enum(['reading', 'practice', 'review', 'exam-prep', 'break']);
export const sessionStatusSchema = z.enum(['scheduled', 'in-progress', 'completed', 'skipped']);

export const createStudySessionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  category: sessionCategorySchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const updateStudySessionSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  category: sessionCategorySchema.optional(),
  status: sessionStatusSchema.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const createExamSchema = z.object({
  title: z.string().trim().min(1).max(150),
  subject: z.string().trim().min(1).max(100),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
  isPrimary: z.boolean().optional().default(false),
});

export const updateExamSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  subject: z.string().trim().min(1).max(100).optional(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  venue: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
  isPrimary: z.boolean().optional(),
});

export const generateStudyPlanSchema = z.object({
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daily_study_hours: z.number().min(0.5).max(12),
  focus_topics: z.array(z.string().trim().min(1)).max(24).optional().default([]),
  max_days: z.number().int().min(1).max(60).optional(),
  title: z.string().trim().min(1).max(140).optional(),
});

export const generatedScheduleItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic: z.string().trim().min(1),
  duration_minutes: z.number().int().min(5).max(12 * 60),
  activity_type: z.enum(['flashcard', 'quiz', 'practice', 'review', 'tutor']),
  completed: z.boolean(),
});

export const updateStudyPlanSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  status: z.enum(['active', 'paused', 'completed']).optional(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  daily_study_hours: z.number().min(0.5).max(12).optional(),
  focus_topics: z.array(z.string().trim().min(1)).max(24).optional(),
  generated_schedule: z.array(generatedScheduleItemSchema).optional(),
});

export const completeStudyPlanItemSchema = z.object({
  completed: z.boolean(),
});

export type CreateStudySessionRequest = z.infer<typeof createStudySessionSchema>;
export type UpdateStudySessionRequest = z.infer<typeof updateStudySessionSchema>;
export type CreateExamRequest = z.infer<typeof createExamSchema>;
export type UpdateExamRequest = z.infer<typeof updateExamSchema>;
export type GenerateStudyPlanRequest = z.infer<typeof generateStudyPlanSchema>;
export type GeneratedScheduleItem = z.infer<typeof generatedScheduleItemSchema>;
export type UpdateStudyPlanRequest = z.infer<typeof updateStudyPlanSchema>;
export type CompleteStudyPlanItemRequest = z.infer<typeof completeStudyPlanItemSchema>;

export type SessionCategory = z.infer<typeof sessionCategorySchema>;
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export interface StudySessionSummary {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  category: SessionCategory;
  status: SessionStatus;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isRecurring: boolean;
  recurrenceDays?: number[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyExamSummary {
  id: string;
  workspaceId: string;
  title: string;
  subject: string;
  examDate: string;
  venue?: string;
  notes?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanSummary {
  id: string;
  workspaceId: string;
  title: string;
  examDate: string;
  dailyStudyHours: number;
  focusTopics: string[];
  status: 'active' | 'paused' | 'completed';
  generatedSchedule: GeneratedScheduleItem[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceStudyPlanBundle {
  sessions: StudySessionSummary[];
  exams: StudyExamSummary[];
  plans: StudyPlanSummary[];
}

