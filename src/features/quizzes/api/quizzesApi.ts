// =============================================================================
// features/quizzes/api/quizzesApi.ts
// Layer: features → quizzes → api
// Rule: Pure fetch functions only. No React, no Zustand. Called by model/useQuizzes.ts.
// =============================================================================

import type {
  QuizListItem,
  QuizDetail,
  QuizSubmission,
  QuizResultData,
  GenerateQuizPayload,
} from '../model/types';

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** List all quizzes for a given workspace */
export async function fetchQuizzes(workspaceId: string): Promise<QuizListItem[]> {
  const data = await apiFetch<{ quizzes: QuizListItem[] }>(`/api/workspaces/${workspaceId}/quiz`);
  return data.quizzes ?? [];
}

/** Fetch full quiz detail (with questions + options) */
export async function fetchQuiz(quizId: string): Promise<QuizDetail> {
  const data = await apiFetch<{ quiz: QuizDetail }>(`/api/quiz/${quizId}`);
  return data.quiz;
}

/** Generate a new AI quiz for a workspace */
export async function generateQuiz(
  workspaceId: string,
  payload: GenerateQuizPayload,
): Promise<QuizListItem> {
  const data = await apiFetch<{ quiz: QuizListItem }>(`/api/workspaces/${workspaceId}/quiz`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.quiz;
}

/** Submit answers and receive scored results */
export async function submitQuiz(
  quizId: string,
  submission: QuizSubmission,
): Promise<QuizResultData> {
  const data = await apiFetch<{ result: QuizResultData }>(`/api/quiz/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify(submission),
  });
  return data.result;
}

/** Delete a quiz */
export async function deleteQuiz(quizId: string): Promise<void> {
  await apiFetch<void>(`/api/quiz/${quizId}`, { method: 'DELETE' });
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
    return null;
  }
}

/**
 * Generate a quiz via NotebookLM.
 */
export async function generateNlmQuiz(
  notebookId: string,
  workspaceId: string,
): Promise<QuizListItem> {
  const data = await apiFetch<{ quiz: QuizListItem }>(
    `/api/notebooklm/notebooks/${notebookId}/quiz`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    },
  );
  return data.quiz;
}
