// =============================================================================
// features/tutor/api/tutorApi.ts
// Layer: features → tutor → api
// Purpose: Typed fetch wrappers for the /api/chat/tutor endpoint.
//          All streaming + non-streaming surface goes here.
//          Consumers use the model hooks, not this file directly.
// =============================================================================

import type { TutorPersonalityId } from '../model/types';

// ---------------------------------------------------------------------------
// Internal fetch helper (mirrors workspaceApi pattern)
// ---------------------------------------------------------------------------

interface ApiError {
  message: string;
  status: number;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore json parse errors
    }
    const err: ApiError = { message, status: res.status };
    throw err;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types for request / response shapes
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** ISO timestamp */
  createdAt: string;
  /** Sources referenced by the AI in this message */
  citations?: CitationChip[];
  /** True while tokens are streaming in */
  isStreaming?: boolean;
}

export interface CitationChip {
  sourceId: string;
  label: string;
  /** Truncated filename, e.g. "Chapter 3.pdf" */
  filename: string;
  /** Page or section hint if available */
  page?: number;
}

export interface SendMessagePayload {
  workspaceId: string;
  message: string;
  personalityId: TutorPersonalityId;
  /** Full conversation history for context window */
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Whether the caller wants a streaming response */
  stream?: boolean;
}

export interface SendMessageResponse {
  reply: string;
  citations?: CitationChip[];
}

// ---------------------------------------------------------------------------
// Non-streaming send (for simple / fallback use)
// ---------------------------------------------------------------------------

export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  return apiFetch<SendMessageResponse>('/api/chat/tutor', {
    method: 'POST',
    body: JSON.stringify({ ...payload, stream: false }),
  });
}

// ---------------------------------------------------------------------------
// Streaming send — returns a ReadableStream of text chunks
// ---------------------------------------------------------------------------

/**
 * Initiates a streaming POST to /api/chat/tutor.
 * Returns the raw Response so the caller can consume the body as a stream.
 * Throws if the HTTP status is not 2xx.
 */
export async function sendMessageStream(
  payload: SendMessagePayload,
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch('/api/chat/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, stream: true }),
  });

  if (!res.ok || !res.body) {
    let message = `Stream failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.body;
}

// ---------------------------------------------------------------------------
// Fetch conversation history (if backend persists it)
// ---------------------------------------------------------------------------

export interface ConversationHistoryResponse {
  messages: ChatMessage[];
}

export async function fetchConversationHistory(
  workspaceId: string,
): Promise<ConversationHistoryResponse> {
  return apiFetch<ConversationHistoryResponse>(
    `/api/chat/tutor?workspaceId=${encodeURIComponent(workspaceId)}`,
    { method: 'GET' },
  );
}

/**
 * Sends a query to a NotebookLM notebook.
 * This is used for high-quality, source-focused AI tutoring.
 */
export async function sendNlmQuery(
  notebookId: string,
  workspaceId: string,
  prompt: string,
): Promise<{ answer: string }> {
  return apiFetch<{ answer: string }>(`/api/notebooklm/notebooks/${notebookId}/query`, {
    method: 'POST',
    body: JSON.stringify({ workspaceId, prompt }),
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
    if (err.status === 404) return null;
    throw err;
  }
}
