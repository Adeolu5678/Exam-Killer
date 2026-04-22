import { z } from 'zod';

export const FLASHCARD_MIN_COUNT = 1;
export const FLASHCARD_MAX_COUNT = 50;
export const FLASHCARD_FRONT_MAX_LENGTH = 2_000;
export const FLASHCARD_BACK_MAX_LENGTH = 4_000;
export const FLASHCARD_TAG_MAX_LENGTH = 40;
export const FLASHCARD_MAX_TAGS = 12;

const flashcardTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(FLASHCARD_TAG_MAX_LENGTH)
  .transform((value) => value.toLowerCase());

export const createFlashcardRequestSchema = z.object({
  front: z.string().trim().min(1).max(FLASHCARD_FRONT_MAX_LENGTH),
  back: z.string().trim().min(1).max(FLASHCARD_BACK_MAX_LENGTH),
  tags: z.array(flashcardTagSchema).max(FLASHCARD_MAX_TAGS).optional().default([]),
  source_id: z.string().trim().min(1).optional(),
});

export const generateFlashcardsRequestSchema = z.object({
  source_ids: z.array(z.string().trim().min(1)).max(30).optional(),
  count: z.number().int().min(FLASHCARD_MIN_COUNT).max(FLASHCARD_MAX_COUNT).optional().default(10),
  topics: z.array(z.string().trim().min(1)).max(12).optional(),
});

export const reviewFlashcardRequestSchema = z
  .object({
    rating: z.number().int().min(0).max(5).optional(),
    quality: z.number().int().min(0).max(5).optional(),
  })
  .refine((value) => value.rating !== undefined || value.quality !== undefined, {
    message: 'Either rating or quality is required',
    path: ['rating'],
  });

export const flashcardListQuerySchema = z.object({
  source_id: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const flashcardReviewHistoryQuerySchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type CreateFlashcardRequest = z.infer<typeof createFlashcardRequestSchema>;
export type GenerateFlashcardsRequest = z.infer<typeof generateFlashcardsRequestSchema>;
export type ReviewFlashcardRequest = z.infer<typeof reviewFlashcardRequestSchema>;
export type FlashcardListQuery = z.infer<typeof flashcardListQuerySchema>;
export type FlashcardReviewHistoryQuery = z.infer<typeof flashcardReviewHistoryQuerySchema>;

export interface FlashcardSummary {
  id: string;
  flashcard_id: string;
  workspace_id: string;
  source_id: string | null;
  front: string;
  back: string;
  tags: string[];
  difficulty: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  review_count: number;
  next_review: string;
  last_review: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface FlashcardReviewHistoryItem {
  id: string;
  flashcard_id: string;
  workspace_id: string;
  user_id: string;
  front: string;
  rating: number;
  reviewed_at: string;
  next_review_after: string;
  interval_after: number;
  ease_factor_after: number;
  repetitions_after: number;
}
