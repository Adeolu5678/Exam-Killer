// =============================================================================
// features/tutor/api/tutorApi.ts
// Layer: features → tutor → api
// Purpose: Typed fetch wrappers for rebuild Phase 3 tutor endpoints.
// =============================================================================

import type { TutorPersonalityId } from '../model/types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
  };
}

interface ApiError {
  message: string;
  status: number;
}

export interface CitationChip {
  sourceId: string;
  label: string;
  filename: string;
  page?: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: CitationChip[];
  isStreaming?: boolean;
}

export interface TutorThread {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  workspaceId: string;
  threadId?: string | null;
  message: string;
  personalityId: TutorPersonalityId;
  customInstructions?: string;
}

export interface SendMessageResponse {
  thread: TutorThread;
  assistantMessage: ChatMessage;
}

export type TutorStreamEvent =
  | { type: 'thread'; thread: { id: string; title: string } }
  | { type: 'token'; delta: string }
  | { type: 'error'; message: string }
  | {
      type: 'done';
      thread_id: string;
      assistant_message_id: string;
      citations: Array<{
        source_id: string;
        file_name: string;
        label: string;
        page_number: number | null;
      }>;
    };

interface TutorThreadApi {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface TutorMessageApi {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  citations?: Array<{
    source_id: string;
    file_name: string;
    label: string;
    page_number: number | null;
  }>;
}

interface FetchThreadsResponse {
  threads: TutorThreadApi[];
}

interface FetchMessagesResponse {
  thread: TutorThreadApi;
  messages: TutorMessageApi[];
}

interface NonStreamingMessageResponse {
  thread: TutorThreadApi;
  assistant_message: TutorMessageApi;
}

function toTutorThread(thread: TutorThreadApi): TutorThread {
  return {
    id: thread.id,
    workspaceId: thread.workspace_id,
    title: thread.title,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
  };
}

function toCitation(citation: {
  source_id: string;
  file_name: string;
  label: string;
  page_number: number | null;
}): CitationChip {
  return {
    sourceId: citation.source_id,
    filename: citation.file_name,
    label: citation.label,
    page: typeof citation.page_number === 'number' ? citation.page_number : undefined,
  };
}

function toChatMessage(message: TutorMessageApi): ChatMessage {
  return {
    id: message.id,
    threadId: message.thread_id,
    role: message.role,
    content: message.content,
    createdAt: message.created_at,
    citations: message.citations?.map(toCitation),
  };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    // keep null and throw a generic error below
  }

  if (!res.ok || !body || !body.success || body.data === undefined) {
    const message = body?.error?.message || `Request failed: ${res.status}`;
    throw { message, status: res.status } satisfies ApiError;
  }

  return body.data;
}

export async function fetchTutorThreads(workspaceId: string): Promise<{ threads: TutorThread[] }> {
  const data = await apiFetch<FetchThreadsResponse>(
    `/api/v1/workspaces/${workspaceId}/tutor/threads`,
    { method: 'GET' },
  );

  return {
    threads: data.threads.map(toTutorThread),
  };
}

export async function createTutorThread(
  workspaceId: string,
  title?: string,
): Promise<{ thread: TutorThread }> {
  const data = await apiFetch<{ thread: TutorThreadApi }>(
    `/api/v1/workspaces/${workspaceId}/tutor/threads`,
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    },
  );

  return {
    thread: toTutorThread(data.thread),
  };
}

export async function fetchThreadMessages(
  threadId: string,
  limit: number = 200,
): Promise<{ thread: TutorThread; messages: ChatMessage[] }> {
  const data = await apiFetch<FetchMessagesResponse>(
    `/api/v1/tutor/threads/${threadId}/messages?limit=${encodeURIComponent(String(limit))}`,
    { method: 'GET' },
  );

  return {
    thread: toTutorThread(data.thread),
    messages: data.messages.map(toChatMessage),
  };
}

export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  const data = await apiFetch<NonStreamingMessageResponse>(
    `/api/v1/workspaces/${payload.workspaceId}/tutor/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        thread_id: payload.threadId || undefined,
        message: payload.message,
        personality: payload.personalityId,
        custom_instructions: payload.customInstructions,
        stream: false,
      }),
    },
  );

  return {
    thread: toTutorThread(data.thread),
    assistantMessage: toChatMessage(data.assistant_message),
  };
}

export async function sendMessageStream(
  payload: SendMessagePayload,
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`/api/v1/workspaces/${payload.workspaceId}/tutor/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: payload.threadId || undefined,
      message: payload.message,
      personality: payload.personalityId,
      custom_instructions: payload.customInstructions,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    let message = `Stream failed: ${res.status}`;
    try {
      const body = (await res.json()) as ApiEnvelope<unknown>;
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // use fallback message
    }
    throw new Error(message);
  }

  return res.body;
}
