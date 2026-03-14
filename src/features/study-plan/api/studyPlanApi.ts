// =============================================================================
// features/study-plan/api/studyPlanApi.ts
// Layer: features → study-plan → api
// Rule: Only call Next.js API routes. No direct Firebase/Firestore access.
// =============================================================================

import type {
  StudySession,
  ExamDate,
  CreateStudySessionPayload,
  UpdateStudySessionPayload,
  CreateExamDatePayload,
  UpdateExamDatePayload,
} from '../model/types';

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `API error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Study Sessions
// ---------------------------------------------------------------------------

/** Fetch all study sessions for a workspace. */
export async function fetchStudySessions(workspaceId: string): Promise<StudySession[]> {
  return apiFetch<StudySession[]>(`/api/workspaces/${workspaceId}/study-plan/sessions`);
}

/** Fetch a single study session by ID. */
export async function fetchStudySession(
  workspaceId: string,
  sessionId: string,
): Promise<StudySession> {
  return apiFetch<StudySession>(`/api/workspaces/${workspaceId}/study-plan/sessions/${sessionId}`);
}

/** Create a new study session block. */
export async function createStudySession(
  workspaceId: string,
  payload: CreateStudySessionPayload,
): Promise<StudySession> {
  return apiFetch<StudySession>(`/api/workspaces/${workspaceId}/study-plan/sessions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update an existing study session. */
export async function updateStudySession(
  workspaceId: string,
  sessionId: string,
  payload: UpdateStudySessionPayload,
): Promise<StudySession> {
  return apiFetch<StudySession>(`/api/workspaces/${workspaceId}/study-plan/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Delete a study session. */
export async function deleteStudySession(workspaceId: string, sessionId: string): Promise<void> {
  await apiFetch<void>(`/api/workspaces/${workspaceId}/study-plan/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

/** Mark a study session as complete. */
export async function completeStudySession(
  workspaceId: string,
  sessionId: string,
): Promise<StudySession> {
  return apiFetch<StudySession>(
    `/api/workspaces/${workspaceId}/study-plan/sessions/${sessionId}/complete`,
    { method: 'POST' },
  );
}

// ---------------------------------------------------------------------------
// Exam Dates
// ---------------------------------------------------------------------------

/** Fetch all exam dates for a workspace. */
export async function fetchExamDates(workspaceId: string): Promise<ExamDate[]> {
  return apiFetch<ExamDate[]>(`/api/workspaces/${workspaceId}/study-plan/exams`);
}

/** Create a new exam date entry. */
export async function createExamDate(
  workspaceId: string,
  payload: CreateExamDatePayload,
): Promise<ExamDate> {
  return apiFetch<ExamDate>(`/api/workspaces/${workspaceId}/study-plan/exams`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update an existing exam date. */
export async function updateExamDate(
  workspaceId: string,
  examId: string,
  payload: UpdateExamDatePayload,
): Promise<ExamDate> {
  return apiFetch<ExamDate>(`/api/workspaces/${workspaceId}/study-plan/exams/${examId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Delete an exam date. */
export async function deleteExamDate(workspaceId: string, examId: string): Promise<void> {
  await apiFetch<void>(`/api/workspaces/${workspaceId}/study-plan/exams/${examId}`, {
    method: 'DELETE',
  });
}
