// =============================================================================
// features/flashcards/api/flashcardsApi.ts
// Layer: features → flashcards → api
// Rule: All server communication lives here. No Firebase imports. Pure fetch.
// =============================================================================

import type { FlashcardItem } from '../model/types';

// ── Generic fetch helper ──────────────────────────────────────────────────────
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error((err as { message?: string }).message ?? 'Request failed');
  }

  return res.json() as Promise<T>;
}

// ── API shapes (as returned by Next.js API routes) ────────────────────────────
export interface FlashcardsListResponse {
  flashcards: FlashcardItem[];
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
  const url = new URL(`/api/workspaces/${workspaceId}/flashcards`, window.location.origin);
  if (params?.sourceId) url.searchParams.set('source_id', params.sourceId);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));

  return apiFetch<FlashcardsListResponse>(url.toString());
}

// ── Fetch a single flashcard ──────────────────────────────────────────────────
export async function fetchFlashcard(flashcardId: string): Promise<FlashcardItem> {
  return apiFetch<FlashcardItem>(`/api/flashcards/${flashcardId}`);
}

// ── Generate flashcards via AI ────────────────────────────────────────────────
export async function generateFlashcards(
  workspaceId: string,
  body: GenerateFlashcardsBody,
): Promise<FlashcardsListResponse> {
  return apiFetch<FlashcardsListResponse>(`/api/workspaces/${workspaceId}/flashcards/generate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ── Create a manual flashcard ─────────────────────────────────────────────────
export async function createFlashcard(
  workspaceId: string,
  data: { front: string; back: string; tags?: string[]; source_id?: string },
): Promise<{ flashcard: FlashcardItem }> {
  return apiFetch<{ flashcard: FlashcardItem }>(`/api/workspaces/${workspaceId}/flashcards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Update a flashcard ────────────────────────────────────────────────────────
export async function updateFlashcard(
  flashcardId: string,
  data: { front?: string; back?: string },
): Promise<FlashcardItem> {
  return apiFetch<FlashcardItem>(`/api/flashcards/${flashcardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Delete a flashcard ────────────────────────────────────────────────────────
export async function deleteFlashcard(flashcardId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/flashcards/${flashcardId}`, {
    method: 'DELETE',
  });
}

// ── Submit a review rating (Spaced Repetition) ────────────────────────────────
export async function submitFlashcardReview(
  flashcardId: string,
  quality: number, // 0–5 (SM-2 scale)
): Promise<{ updated: FlashcardItem }> {
  return apiFetch<{ updated: FlashcardItem }>(`/api/flashcards/${flashcardId}/review`, {
    method: 'POST',
    body: JSON.stringify({ quality }),
  });
}

/**
 * Generate flashcards via NotebookLM.
 * Note: Returns a list of flashcards directly.
 */
export async function generateNlmFlashcards(
  notebookId: string,
  workspaceId: string,
): Promise<FlashcardsListResponse> {
  return apiFetch<FlashcardsListResponse>(`/api/notebooklm/notebooks/${notebookId}/flashcards`, {
    method: 'POST',
    body: JSON.stringify({ workspaceId }),
  });
}

/**
 * Fetches the NLM notebook associated with a workspace.
 */
export async function getNlmNotebook(
  workspaceId: string,
): Promise<{ notebook_id: string; profile_name: string } | null> {
  try {
    return apiFetch<{ notebook_id: string; profile_name: string }>(
      `/api/notebooklm/notebooks?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: 'GET' },
    );
  } catch (err: any) {
    // API returns 404 if no notebook exists for the workspace
    return null;
  }
}
