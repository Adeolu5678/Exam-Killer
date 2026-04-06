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

function normalizeQuizQuestions(
  questions: Array<{
    id?: string;
    question_id?: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: Record<string, string>;
    difficulty?: string;
  }>,
): QuizDetail['questions'] {
  return questions.map((question) => ({
    id: question.id ?? question.question_id ?? '',
    question_text: question.question_text,
    question_type: question.question_type,
    options: Object.entries(question.options ?? {}).map(([key, text]) => ({ key, text })),
  }));
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** List all quizzes for a given workspace */
export async function fetchQuizzes(workspaceId: string): Promise<QuizListItem[]> {
  const data = await apiFetch<{ quizzes: QuizListItem[] }>(`/api/workspaces/${workspaceId}/quiz`);
  return (data.quizzes ?? []).map((quiz) => ({
    quiz_id: quiz.quiz_id,
    title: quiz.title || 'Untitled Quiz',
    topic: quiz.topic,
    question_count:
      quiz.question_count ?? (quiz as unknown as { total_questions?: number }).total_questions ?? 0,
    created_at: quiz.created_at,
    best_score: quiz.best_score,
  }));
}

/** Fetch full quiz detail (with questions + options) */
export async function fetchQuiz(quizId: string): Promise<QuizDetail> {
  const data = await apiFetch<{
    quiz: {
      quiz_id: string;
      title?: string;
      topic?: string;
      created_at: string;
      questions: Array<{
        id?: string;
        question_id?: string;
        question_text: string;
        question_type: 'multiple_choice' | 'true_false' | 'short_answer';
        options?: Record<string, string>;
      }>;
    };
  }>(`/api/quiz/${quizId}`);

  return {
    quiz_id: data.quiz.quiz_id,
    title: data.quiz.title || 'Untitled Quiz',
    topic: data.quiz.topic,
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
      id: string;
      total_questions: number;
    };
  }>(`/api/workspaces/${workspaceId}/quiz/generate`, {
    method: 'POST',
    body: JSON.stringify({
      count: payload.num_questions,
      question_types: payload.question_types,
      topics: payload.topic ? [payload.topic] : undefined,
    }),
  });

  return {
    quiz_id: data.quiz.quiz_id,
    title: payload.topic,
    topic: payload.topic,
    question_count: data.quiz.total_questions,
    created_at: new Date().toISOString(),
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
    xp_earned: number;
    results: QuizResultData['question_results'];
  }>(`/api/quiz/${quizId}/submit`, {
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

/** Delete a quiz */
export async function deleteQuiz(quizId: string): Promise<void> {
  await apiFetch<void>(`/api/quiz/${quizId}`, { method: 'DELETE' });
}
