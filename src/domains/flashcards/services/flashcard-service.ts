import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import { retrieveTutorContext } from '@/domains/retrieval';
import { verifyWorkspaceAccess } from '@/domains/workspaces';

import { updateUserStats } from '@/shared/lib/analytics/stats';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import { getChatCompletion } from '@/shared/lib/openai/client';
import { createFlashcardPrompt, FLASHCARD_RESPONSE_SCHEMA } from '@/shared/lib/openai/prompts';
import { getUserSubscription, getUserUsageStats, consumeAiQueryQuota } from '@/shared/lib/paystack/db';
import { canAccessFeature, getEffectivePlan, getPlanDetails } from '@/shared/lib/paystack/subscription';
import { RAG_CONFIG } from '@/shared/lib/rag/config';
import { fetchRAGContent, truncateContent } from '@/shared/lib/rag/content';
import { AppError, AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';
import { calculateNextReview, getInitialFlashcardData } from '@/shared/lib/spaced-repetition';

import type { CreateFlashcardRequest, FlashcardReviewHistoryItem, FlashcardSummary } from '../contracts/flashcard';

const FLASHCARDS_COLLECTION = 'flashcards';
const FLASHCARD_REVIEWS_COLLECTION = 'flashcard_reviews';

interface FlashcardRecord {
  flashcard_id?: string;
  workspace_id?: string;
  user_id?: string;
  source_id?: string | null;
  front?: string;
  back?: string;
  tags?: string[];
  difficulty?: number;
  ease_factor?: number;
  interval?: number;
  repetitions?: number;
  review_count?: number;
  next_review?: Timestamp | Date;
  last_review?: Timestamp | Date | null;
  created_at?: Timestamp | Date;
  updated_at?: Timestamp | Date | null;
}

interface FlashcardReviewRecord {
  review_id?: string;
  flashcard_id?: string;
  workspace_id?: string;
  user_id?: string;
  rating?: number;
  reviewed_at?: Timestamp | Date;
  interval_after_review?: number;
  ease_factor_after_review?: number;
  repetitions_after_review?: number;
  next_review_after_review?: Timestamp | Date;
}

const generatedFlashcardSchema = z.array(
  z.object({
    front: z.string().trim().min(1),
    back: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)).default([]),
  }),
);

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

function toMillis(value: Timestamp | Date | null | undefined): number {
  if (!value) {
    return 0;
  }
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  return value.getTime();
}

function mapFlashcardSummary(id: string, record: FlashcardRecord): FlashcardSummary {
  return {
    id,
    flashcard_id: String(record.flashcard_id || id),
    workspace_id: String(record.workspace_id || ''),
    source_id: record.source_id ? String(record.source_id) : null,
    front: String(record.front || ''),
    back: String(record.back || ''),
    tags: Array.isArray(record.tags) ? record.tags.map((tag) => String(tag)) : [],
    difficulty: typeof record.difficulty === 'number' ? record.difficulty : 0,
    ease_factor: typeof record.ease_factor === 'number' ? record.ease_factor : 2.5,
    interval: typeof record.interval === 'number' ? record.interval : 0,
    repetitions: typeof record.repetitions === 'number' ? record.repetitions : 0,
    review_count: typeof record.review_count === 'number' ? record.review_count : 0,
    next_review: toIsoString(record.next_review),
    last_review: record.last_review ? toIsoString(record.last_review) : null,
    created_at: toIsoString(record.created_at),
    updated_at: record.updated_at ? toIsoString(record.updated_at) : null,
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

async function getFlashcardDoc(
  flashcardId: string,
  userId: string,
): Promise<{ id: string; data: FlashcardRecord }> {
  const db = getDb();
  const doc = await db.collection(FLASHCARDS_COLLECTION).doc(flashcardId).get();

  if (!doc.exists) {
    throw new ValidationError('Flashcard not found');
  }

  const data = doc.data() as FlashcardRecord | undefined;
  if (!data) {
    throw new ValidationError('Flashcard data is missing');
  }

  const workspaceId = String(data.workspace_id || '');
  if (!workspaceId) {
    throw new ValidationError('Flashcard workspace is missing');
  }

  await assertWorkspaceAccess(workspaceId, userId);

  return { id: doc.id, data };
}

function buildGenerationQuery(topics?: string[]): string {
  if (topics && topics.length > 0) {
    return `Generate exam-prep flashcards focused on: ${topics.join(', ')}`;
  }
  return 'Generate exam-prep flashcards from the most important concepts and facts';
}

async function resolveGenerationContext(input: {
  workspaceId: string;
  sourceIds?: string[];
  topics?: string[];
}): Promise<string> {
  const retrieval = await retrieveTutorContext({
    workspaceId: input.workspaceId,
    sourceIds: input.sourceIds,
    query: buildGenerationQuery(input.topics),
    conversationHistory: [],
    topK: 16,
  });

  if (retrieval.context.trim().length > 0) {
    return retrieval.context;
  }

  const db = getDb();
  const rawContent = await fetchRAGContent(db, input.workspaceId, input.sourceIds);
  const truncated = truncateContent(rawContent);
  if (truncated.trim().length === 0) {
    throw new ValidationError('No source content available. Please upload and process sources first.');
  }
  return truncated;
}

async function ensureFlashcardEntitlement(userId: string, requestedCount: number): Promise<void> {
  const [subscription, usage] = await Promise.all([
    getUserSubscription(userId),
    getUserUsageStats(userId),
  ]);
  const plan = getPlanDetails(getEffectivePlan(subscription));
  const flashcardLimit =
    plan.features.flashcards === 'unlimited' ? Infinity : plan.features.flashcards;

  if (Number.isFinite(flashcardLimit) && usage.flashcardsCount + requestedCount > flashcardLimit) {
    throw new AuthorizationError(
      'You have reached your flashcard limit. Upgrade your plan for unlimited flashcards.',
    );
  }

  const aiQuota = await consumeAiQueryQuota(userId);
  if (!aiQuota.allowed) {
    throw new AuthorizationError(
      'You have reached your daily AI query limit. Upgrade your plan for a higher limit.',
    );
  }
}

export async function listWorkspaceFlashcards(
  workspaceId: string,
  userId: string,
  options: { sourceId?: string; limit?: number; offset?: number } = {},
): Promise<{ flashcards: FlashcardSummary[]; total: number }> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const snapshot = await db.collection(FLASHCARDS_COLLECTION).where('workspace_id', '==', workspaceId).get();

  let flashcards = snapshot.docs
    .map((doc) => mapFlashcardSummary(doc.id, doc.data() as FlashcardRecord))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  if (options.sourceId) {
    flashcards = flashcards.filter((flashcard) => flashcard.source_id === options.sourceId);
  }

  return {
    flashcards: flashcards.slice(offset, offset + limit),
    total: flashcards.length,
  };
}

export async function getFlashcardDetail(flashcardId: string, userId: string): Promise<FlashcardSummary> {
  const flashcard = await getFlashcardDoc(flashcardId, userId);
  return mapFlashcardSummary(flashcard.id, flashcard.data);
}

export async function createWorkspaceFlashcard(input: {
  workspaceId: string;
  userId: string;
  payload: CreateFlashcardRequest;
}): Promise<FlashcardSummary> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  const db = getDb();
  const flashcardRef = db.collection(FLASHCARDS_COLLECTION).doc();
  const now = Timestamp.now();
  const initial = getInitialFlashcardData();

  const record: FlashcardRecord = {
    flashcard_id: flashcardRef.id,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    source_id: input.payload.source_id ?? null,
    front: input.payload.front.trim(),
    back: input.payload.back.trim(),
    tags: input.payload.tags ?? [],
    difficulty: 0,
    ease_factor: initial.ease_factor,
    interval: initial.interval,
    repetitions: initial.repetitions,
    review_count: 0,
    next_review: initial.next_review,
    last_review: null,
    created_at: now,
    updated_at: now,
  };

  await flashcardRef.set(record);
  appLogger.info('Flashcard created', { flashcardId: flashcardRef.id, workspaceId: input.workspaceId });

  return mapFlashcardSummary(flashcardRef.id, record);
}

export async function updateFlashcard(input: {
  flashcardId: string;
  userId: string;
  payload: { front?: string; back?: string };
}): Promise<FlashcardSummary> {
  const db = getDb();
  const flashcard = await getFlashcardDoc(input.flashcardId, input.userId);

  const updateData: Record<string, unknown> = {};
  if (typeof input.payload.front === 'string') {
    updateData.front = input.payload.front.trim();
  }
  if (typeof input.payload.back === 'string') {
    updateData.back = input.payload.back.trim();
  }

  if (Object.keys(updateData).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  updateData.updated_at = Timestamp.now();
  await db.collection(FLASHCARDS_COLLECTION).doc(flashcard.id).update(updateData);

  const updatedDoc = await db.collection(FLASHCARDS_COLLECTION).doc(flashcard.id).get();
  const updated = updatedDoc.data() as FlashcardRecord | undefined;
  if (!updated) {
    throw new ValidationError('Flashcard not found after update');
  }

  return mapFlashcardSummary(flashcard.id, updated);
}

export async function deleteFlashcard(flashcardId: string, userId: string): Promise<void> {
  const db = getDb();
  const flashcard = await getFlashcardDoc(flashcardId, userId);

  await db.collection(FLASHCARDS_COLLECTION).doc(flashcard.id).delete();
  appLogger.info('Flashcard deleted', { flashcardId: flashcard.id, workspaceId: flashcard.data.workspace_id });
}

export async function generateWorkspaceFlashcards(input: {
  workspaceId: string;
  userId: string;
  sourceIds?: string[];
  count: number;
  topics?: string[];
}): Promise<{ flashcards: FlashcardSummary[]; generated_count: number }> {
  await assertWorkspaceAccess(input.workspaceId, input.userId);
  await ensureFlashcardEntitlement(input.userId, input.count);

  const context = await resolveGenerationContext({
    workspaceId: input.workspaceId,
    sourceIds: input.sourceIds,
    topics: input.topics,
  });

  const prompt = createFlashcardPrompt(context, input.count, input.topics?.join(', '));
  const response = await getChatCompletion([{ role: 'user', content: prompt }], {
    temperature: RAG_CONFIG.AI.DEFAULT_TEMPERATURE,
    maxTokens: RAG_CONFIG.AI.MAX_TOKENS,
    mockType: 'flashcards',
    responseMimeType: 'application/json',
    responseSchema: FLASHCARD_RESPONSE_SCHEMA,
  });

  let generated = generatedFlashcardSchema.parse(JSON.parse(response));
  generated = generated.filter((item) => item.front.trim().length > 0 && item.back.trim().length > 0);

  if (generated.length === 0) {
    throw new ValidationError('No flashcards were generated. Please try again.');
  }

  const db = getDb();
  const now = Timestamp.now();
  const initial = getInitialFlashcardData();

  const created: FlashcardSummary[] = [];
  for (const card of generated) {
    const ref = db.collection(FLASHCARDS_COLLECTION).doc();
    const record: FlashcardRecord = {
      flashcard_id: ref.id,
      workspace_id: input.workspaceId,
      user_id: input.userId,
      source_id: input.sourceIds?.[0] ?? null,
      front: card.front.trim(),
      back: card.back.trim(),
      tags: card.tags.map((tag) => tag.toLowerCase()),
      difficulty: 0,
      ease_factor: initial.ease_factor,
      interval: initial.interval,
      repetitions: initial.repetitions,
      review_count: 0,
      next_review: initial.next_review,
      last_review: null,
      created_at: now,
      updated_at: now,
    };
    await ref.set(record);
    created.push(mapFlashcardSummary(ref.id, record));
  }

  appLogger.info('Flashcards generated', {
    workspaceId: input.workspaceId,
    userId: input.userId,
    generatedCount: created.length,
  });

  return {
    flashcards: created,
    generated_count: created.length,
  };
}

export async function reviewFlashcard(input: {
  flashcardId: string;
  userId: string;
  rating: number;
}): Promise<{ updated: FlashcardSummary }> {
  const subscription = await getUserSubscription(input.userId);
  if (!canAccessFeature(subscription, 'spacedRepetition')) {
    throw new AppError({
      code: 'SPACED_REPETITION_REQUIRES_PREMIUM',
      message: 'Spaced repetition reviews require a Premium subscription.',
      status: 403,
      details: { upgradeRequired: true },
    });
  }

  const db = getDb();
  const flashcard = await getFlashcardDoc(input.flashcardId, input.userId);
  const current = flashcard.data;

  const currentInterval = typeof current.interval === 'number' ? current.interval : 0;
  const currentEaseFactor = typeof current.ease_factor === 'number' ? current.ease_factor : 2.5;
  const currentRepetitions = typeof current.repetitions === 'number' ? current.repetitions : 0;

  const reviewResult = calculateNextReview(
    input.rating,
    currentInterval,
    currentEaseFactor,
    currentRepetitions,
  );
  const now = Timestamp.now();

  const updateData: Partial<FlashcardRecord> = {
    difficulty: input.rating,
    interval: reviewResult.newInterval,
    ease_factor: reviewResult.newEaseFactor,
    repetitions: reviewResult.newRepetitions,
    next_review: reviewResult.nextReviewDate,
    review_count: (typeof current.review_count === 'number' ? current.review_count : 0) + 1,
    last_review: now,
    updated_at: now,
  };

  await db.collection(FLASHCARDS_COLLECTION).doc(flashcard.id).update(updateData);

  const reviewRef = db.collection(FLASHCARD_REVIEWS_COLLECTION).doc();
  const reviewRecord: FlashcardReviewRecord = {
    review_id: reviewRef.id,
    flashcard_id: flashcard.id,
    workspace_id: String(current.workspace_id || ''),
    user_id: input.userId,
    rating: input.rating,
    reviewed_at: now,
    interval_after_review: reviewResult.newInterval,
    ease_factor_after_review: reviewResult.newEaseFactor,
    repetitions_after_review: reviewResult.newRepetitions,
    next_review_after_review: reviewResult.nextReviewDate,
  };
  await reviewRef.set(reviewRecord);

  const updatedDoc = await db.collection(FLASHCARDS_COLLECTION).doc(flashcard.id).get();
  const updatedData = updatedDoc.data() as FlashcardRecord | undefined;
  if (!updatedData) {
    throw new ValidationError('Flashcard not found after review update');
  }

  const workspaceId = String(current.workspace_id || '');
  if (workspaceId.length > 0) {
    await updateUserStats(db, input.userId, {
      workspace_id: workspaceId,
      flashcards_reviewed: 1,
      flashcards_mastered: input.rating >= 4 ? 1 : 0,
      study_time_minutes: 1,
      xp_earned: 5,
    });
  }

  appLogger.info('Flashcard reviewed', {
    flashcardId: flashcard.id,
    workspaceId: current.workspace_id,
    userId: input.userId,
    rating: input.rating,
  });

  return { updated: mapFlashcardSummary(flashcard.id, updatedData) };
}

export async function listWorkspaceFlashcardReviewHistory(
  workspaceId: string,
  userId: string,
  limit: number = 50,
): Promise<{ history: FlashcardReviewHistoryItem[] }> {
  await assertWorkspaceAccess(workspaceId, userId);
  const db = getDb();

  const reviewsSnapshot = await db
    .collection(FLASHCARD_REVIEWS_COLLECTION)
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .get();

  const reviewDocs = reviewsSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      data: doc.data() as FlashcardReviewRecord,
    }))
    .sort((a, b) => toMillis(b.data.reviewed_at) - toMillis(a.data.reviewed_at))
    .slice(0, limit);

  const flashcardIds = Array.from(
    new Set(
      reviewDocs
        .map((reviewDoc) => String(reviewDoc.data.flashcard_id || ''))
        .filter((id) => id.length > 0),
    ),
  );

  const flashcardFrontMap = new Map<string, string>();
  for (let i = 0; i < flashcardIds.length; i += 30) {
    const batch = flashcardIds.slice(i, i + 30);
    const snapshot = await db.collection(FLASHCARDS_COLLECTION).where('__name__', 'in', batch).get();
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as FlashcardRecord;
      flashcardFrontMap.set(doc.id, String(data.front || 'Untitled flashcard'));
    });
  }

  const history: FlashcardReviewHistoryItem[] = reviewDocs.map(({ id, data }) => {
    const flashcardId = String(data.flashcard_id || '');
    return {
      id,
      flashcard_id: flashcardId,
      workspace_id: String(data.workspace_id || workspaceId),
      user_id: String(data.user_id || userId),
      front: flashcardFrontMap.get(flashcardId) || 'Untitled flashcard',
      rating: typeof data.rating === 'number' ? data.rating : 0,
      reviewed_at: toIsoString(data.reviewed_at),
      next_review_after: toIsoString(data.next_review_after_review),
      interval_after: typeof data.interval_after_review === 'number' ? data.interval_after_review : 0,
      ease_factor_after:
        typeof data.ease_factor_after_review === 'number' ? data.ease_factor_after_review : 2.5,
      repetitions_after:
        typeof data.repetitions_after_review === 'number' ? data.repetitions_after_review : 0,
    };
  });

  return { history };
}
