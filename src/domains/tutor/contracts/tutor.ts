import { z } from 'zod';

export const TUTOR_PERSONALITIES = [
  'mentor',
  'drill',
  'peer',
  'professor',
  'storyteller',
  'coach',
] as const;
export type TutorPersonality = (typeof TUTOR_PERSONALITIES)[number];
export const tutorPersonalitySchema = z.enum(TUTOR_PERSONALITIES);

export const TUTOR_THREAD_TITLE_MAX_LENGTH = 120;
export const TUTOR_MESSAGE_MAX_LENGTH = 8_000;

export const createTutorThreadRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Thread title is required')
    .max(TUTOR_THREAD_TITLE_MAX_LENGTH)
    .optional(),
});

export type CreateTutorThreadRequest = z.infer<typeof createTutorThreadRequestSchema>;

export const updateTutorThreadRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Thread title is required')
    .max(TUTOR_THREAD_TITLE_MAX_LENGTH),
});

export type UpdateTutorThreadRequest = z.infer<typeof updateTutorThreadRequestSchema>;

export const sendTutorMessageRequestSchema = z.object({
  thread_id: z.string().trim().min(1).optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(TUTOR_MESSAGE_MAX_LENGTH, 'Message is too long'),
  personality: tutorPersonalitySchema.optional(),
  custom_instructions: z.string().trim().max(1000).optional(),
  stream: z.boolean().optional().default(true),
});

export type SendTutorMessageRequest = z.infer<typeof sendTutorMessageRequestSchema>;

export interface TutorThreadSummary {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface TutorCitation {
  source_id: string;
  file_name: string;
  label: string;
  page_number: number | null;
  chunk_id: string;
  chunk_index: number;
}

export interface TutorMessageSummary {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  citations?: TutorCitation[];
}

