// =============================================================================
// features/flashcards/api/flashcardsApi.ts
// Layer: features → flashcards → api
// Rule: All server communication lives here. No Firebase imports. Pure fetch.
// =============================================================================

import type { FlashcardItem } from '../model/types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
    details?: Record<string, unknown>;
  };
}

type ApiError = Error & { status?: number; upgradeRequired?: boolean };

// ── Generic fetch helper ──────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || !body.success || body.data === undefined) {
    const error = new Error(
      body?.error?.message || `Request failed${res.status ? `: ${res.status}` : ''}`,
    ) as ApiError;
    error.status = res.status;
    error.upgradeRequired = Boolean(body?.error?.details?.upgradeRequired);
    throw error;
  }

  return body.data;
}

// ── API shapes (as returned by Next.js API routes) ────────────────────────────
export interface FlashcardsListResponse {
  flashcards: FlashcardItem[];
}

export interface FlashcardReviewHistoryItem {
  id: string;
  flashcard_id: string;
  front: string;
  rating: number;
  reviewed_at: string;
  next_review_after: string;
}

export interface GenerateFlashcardsBody {
  source_ids?: string[];
  topic?: string;
  count?: number;
  mockType?: string;
}

// ── Fetch all flashcards for a workspace ─────────────────────────────────────
export async function fetchFlashcards(
  workspaceId: string,
  params?: { sourceId?: string; limit?: number; offset?: number },
): Promise<FlashcardsListResponse> {
  const search = new URLSearchParams();
  if (params?.sourceId) search.set('source_id', params.sourceId);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiFetch<FlashcardsListResponse>(`/api/v1/workspaces/${workspaceId}/flashcards${suffix}`);
}

// ── Fetch a single flashcard ──────────────────────────────────────────────────
export async function fetchFlashcard(flashcardId: string): Promise<FlashcardItem> {
  const data = await apiFetch<{ flashcard: FlashcardItem }>(`/api/v1/flashcards/${flashcardId}`);
  return data.flashcard;
}

// ── Generate flashcards via AI ────────────────────────────────────────────────
export async function generateFlashcards(
  workspaceId: string,
  body: GenerateFlashcardsBody,
): Promise<FlashcardsListResponse> {
  const topics = body.topic ? [body.topic] : undefined;
  const data = await apiFetch<{ flashcards: FlashcardItem[]; generated_count: number }>(
    `/api/v1/workspaces/${workspaceId}/flashcards/generate`,
    {
      method: 'POST',
      body: JSON.stringify({
        source_ids: body.source_ids,
        count: body.count,
        topics,
      }),
    },
  );

  return { flashcards: data.flashcards };
}

export async function fetchFlashcardReviewHistory(
  workspaceId: string,
  limit: number = 20,
): Promise<{ history: FlashcardReviewHistoryItem[] }> {
  return apiFetch<{ history: FlashcardReviewHistoryItem[] }>(
    `/api/v1/workspaces/${workspaceId}/flashcards/reviews?limit=${encodeURIComponent(String(limit))}`,
  );
}

// ── Create a manual flashcard ─────────────────────────────────────────────────
export async function createFlashcard(
  workspaceId: string,
  data: { front: string; back: string; tags?: string[]; source_id?: string },
): Promise<{ flashcard: FlashcardItem }> {
  return apiFetch<{ flashcard: FlashcardItem }>(`/api/v1/workspaces/${workspaceId}/flashcards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Update a flashcard ────────────────────────────────────────────────────────
export async function updateFlashcard(
  flashcardId: string,
  data: { front?: string; back?: string },
): Promise<FlashcardItem> {
  const result = await apiFetch<{ flashcard: FlashcardItem }>(`/api/v1/flashcards/${flashcardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return result.flashcard;
}

// ── Delete a flashcard ────────────────────────────────────────────────────────
export async function deleteFlashcard(flashcardId: string): Promise<{ success: boolean }> {
  const result = await apiFetch<{ deleted: boolean }>(`/api/v1/flashcards/${flashcardId}`, {
    method: 'DELETE',
  });
  return { success: result.deleted };
}

// ── Submit a review rating (Spaced Repetition) ────────────────────────────────
export async function submitFlashcardReview(
  flashcardId: string,
  quality: number, // 0–5 (SM-2 scale)
): Promise<{ updated: FlashcardItem }> {
  return apiFetch<{ updated: FlashcardItem }>(`/api/v1/flashcards/${flashcardId}/review`, {
    method: 'POST',
    body: JSON.stringify({ rating: quality }),
  });
}
