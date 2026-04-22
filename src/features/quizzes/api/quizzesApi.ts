// =============================================================================
// features/quizzes/api/quizzesApi.ts
// Layer: features → quizzes → api
// Rule: Pure fetch functions only. No React, no Zustand. Called by model/useQuizzes.ts.
// =============================================================================

import type {
  GenerateQuizPayload,
  QuizAttemptHistoryItem,
  QuizDetail,
  QuizListItem,
  QuizResultData,
  QuizSubmission,
} from '../model/types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
    details?: Record<string, unknown>;
  };
}

type ApiError = Error & { status?: number; upgradeRequired?: boolean };

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
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

function normalizeQuizQuestions(
  questions: Array<{
    question_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: Record<string, string>;
  }>,
): QuizDetail['questions'] {
  return questions.map((question) => ({
    id: question.question_id,
    question_text: question.question_text,
    question_type: question.question_type,
    options: Object.entries(question.options ?? {}).map(([key, text]) => ({ key, text })),
  }));
}

/** List all quizzes for a given workspace */
export async function fetchQuizzes(workspaceId: string): Promise<QuizListItem[]> {
  const data = await apiFetch<{ quizzes: Array<QuizListItem & { question_count?: number }> }>(
    `/api/v1/workspaces/${workspaceId}/quizzes`,
  );

  return (data.quizzes ?? []).map((quiz) => ({
    quiz_id: quiz.quiz_id,
    title: quiz.title || 'Untitled Quiz',
    topic: quiz.topic,
    question_count: quiz.question_count ?? 0,
    created_at: quiz.created_at,
    best_score: quiz.best_score ?? undefined,
  }));
}

/** Fetch full quiz detail (with questions + options) */
export async function fetchQuiz(quizId: string): Promise<QuizDetail> {
  const data = await apiFetch<{
    quiz: {
      quiz_id: string;
      title?: string;
      topic?: string | null;
      created_at: string;
      questions: Array<{
        question_id: string;
        question_text: string;
        question_type: 'multiple_choice' | 'true_false' | 'short_answer';
        options?: Record<string, string>;
      }>;
    };
  }>(`/api/v1/quizzes/${quizId}`);

  return {
    quiz_id: data.quiz.quiz_id,
    title: data.quiz.title || 'Untitled Quiz',
    topic: data.quiz.topic || undefined,
    created_at: data.quiz.created_at,
    questions: normalizeQuizQuestions(data.quiz.questions),
  };
}

/** Generate a new AI quiz for a workspace */
export async function generateQuiz(
  workspaceId: string,
  payload: GenerateQuizPayload,
): Promise<QuizListItem> {
  const data = await apiFetch<{
    quiz: {
      quiz_id: string;
      title: string;
      topic: string | null;
      question_count?: number;
      questions?: Array<unknown>;
      created_at: string;
      best_score: number | null;
    };
  }>(`/api/v1/workspaces/${workspaceId}/quizzes/generate`, {
    method: 'POST',
    body: JSON.stringify({
      count: payload.num_questions,
      question_types: payload.question_types,
      topics: payload.topic ? [payload.topic] : undefined,
    }),
  });

  return {
    quiz_id: data.quiz.quiz_id,
    title: data.quiz.title || payload.topic || 'Untitled Quiz',
    topic: data.quiz.topic || payload.topic,
    question_count: data.quiz.question_count ?? data.quiz.questions?.length ?? payload.num_questions,
    created_at: data.quiz.created_at,
    best_score: data.quiz.best_score ?? undefined,
  };
}

/** Submit answers and receive scored results */
export async function submitQuiz(
  quizId: string,
  submission: QuizSubmission,
): Promise<QuizResultData> {
  const data = await apiFetch<{
    quiz_id: string;
    score: number;
    correct_count: number;
    total_questions: number;
    time_spent_seconds: number;
    completed_at: string;
    xp_earned: number;
    results: QuizResultData['question_results'];
  }>(`/api/v1/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify(submission),
  });

  return {
    quiz_id: data.quiz_id,
    score: data.score,
    correct_count: data.correct_count,
    total_questions: data.total_questions,
    time_spent_seconds: data.time_spent_seconds,
    question_results: data.results,
    xp_earned: data.xp_earned,
  };
}

/** Fetch quiz attempt history for workspace review screens */
export async function fetchQuizAttemptHistory(
  workspaceId: string,
  limit: number = 20,
): Promise<QuizAttemptHistoryItem[]> {
  const data = await apiFetch<{ attempts: QuizAttemptHistoryItem[] }>(
    `/api/v1/workspaces/${workspaceId}/quizzes/attempts?limit=${encodeURIComponent(String(limit))}`,
  );
  return data.attempts;
}

/** Delete a quiz */
export async function deleteQuiz(quizId: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/api/v1/quizzes/${quizId}`, {
    method: 'DELETE',
  });
}
