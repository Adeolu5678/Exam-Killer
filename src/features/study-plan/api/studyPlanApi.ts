// =============================================================================
// features/study-plan/api/studyPlanApi.ts
// Layer: features → study-plan → api
// Rule: Only call Next.js API routes. No direct Firebase/Firestore access.
// =============================================================================

import type {
  StudySession,
  ExamDate,
  GeneratedStudyPlan,
  WorkspaceStudyPlanBundle,
  CreateStudySessionPayload,
  UpdateStudySessionPayload,
  CreateExamDatePayload,
  UpdateExamDatePayload,
  GenerateStudyPlanPayload,
  UpdateGeneratedStudyPlanPayload,
} from '../model/types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    message?: string;
    details?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Shared fetch helper
// ---------------------------------------------------------------------------
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || !body.success || body.data === undefined) {
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }

  return body.data;
}

function toStudyPlanApiPayload(payload: GenerateStudyPlanPayload): Record<string, unknown> {
  return {
    exam_date: payload.examDate,
    daily_study_hours: payload.dailyStudyHours,
    focus_topics: payload.focusTopics ?? [],
    max_days: payload.maxDays,
    title: payload.title,
  };
}

function toStudyPlanUpdatePayload(
  payload: UpdateGeneratedStudyPlanPayload,
): Record<string, unknown> {
  return {
    title: payload.title,
    status: payload.status,
    exam_date: payload.examDate,
    daily_study_hours: payload.dailyStudyHours,
    focus_topics: payload.focusTopics,
    generated_schedule: payload.generatedSchedule,
  };
}

// ---------------------------------------------------------------------------
// Study Sessions
// ---------------------------------------------------------------------------

/** Fetch all study sessions for a workspace. */
export async function fetchStudySessions(workspaceId: string): Promise<StudySession[]> {
  return apiFetch<StudySession[]>(`/api/v1/workspaces/${workspaceId}/study-plan/sessions`);
}

/** Fetch a single study session by ID. */
export async function fetchStudySession(
  workspaceId: string,
  sessionId: string,
): Promise<StudySession> {
  return apiFetch<StudySession>(`/api/v1/workspaces/${workspaceId}/study-plan/sessions/${sessionId}`);
}

/** Fetch study-plan aggregate bundle for a workspace. */
export async function fetchStudyPlanBundle(workspaceId: string): Promise<WorkspaceStudyPlanBundle> {
  return apiFetch<WorkspaceStudyPlanBundle>(`/api/v1/workspaces/${workspaceId}/study-plan`);
}

/** Fetch generated study plans for a workspace. */
export async function fetchStudyPlans(workspaceId: string): Promise<GeneratedStudyPlan[]> {
  const bundle = await fetchStudyPlanBundle(workspaceId);
  return bundle.plans ?? [];
}

/** Create a new study session block. */
export async function createStudySession(
  workspaceId: string,
  payload: CreateStudySessionPayload,
): Promise<StudySession> {
  return apiFetch<StudySession>(`/api/v1/workspaces/${workspaceId}/study-plan/sessions`, {
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
  return apiFetch<StudySession>(`/api/v1/workspaces/${workspaceId}/study-plan/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Delete a study session. */
export async function deleteStudySession(workspaceId: string, sessionId: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(
    `/api/v1/workspaces/${workspaceId}/study-plan/sessions/${sessionId}`,
    {
      method: 'DELETE',
    },
  );
}

/** Mark a study session as complete. */
export async function completeStudySession(
  workspaceId: string,
  sessionId: string,
): Promise<StudySession> {
  return apiFetch<StudySession>(
    `/api/v1/workspaces/${workspaceId}/study-plan/sessions/${sessionId}/complete`,
    { method: 'POST' },
  );
  }

  // ---------------------------------------------------------------------------
  // Generated Study Plans
  // ---------------------------------------------------------------------------

  /** Generate an AI study plan for a workspace. */
  export async function generateWorkspaceStudyPlan(
    workspaceId: string,
    payload: GenerateStudyPlanPayload,
  ): Promise<GeneratedStudyPlan> {
    const data = await apiFetch<{ plan: GeneratedStudyPlan }>(
      `/api/v1/workspaces/${workspaceId}/study-plan/generate`,
      {
        method: 'POST',
        body: JSON.stringify(toStudyPlanApiPayload(payload)),
      },
    );
    return data.plan;
  }

  /** Update generated study plan metadata or schedule. */
  export async function updateGeneratedStudyPlan(
    workspaceId: string,
    planId: string,
    payload: UpdateGeneratedStudyPlanPayload,
  ): Promise<GeneratedStudyPlan> {
    const data = await apiFetch<{ plan: GeneratedStudyPlan }>(
      `/api/v1/workspaces/${workspaceId}/study-plan/plans/${planId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(toStudyPlanUpdatePayload(payload)),
      },
    );
    return data.plan;
  }

  /** Mark a generated study-plan item as complete/incomplete. */
  export async function completeGeneratedStudyPlanItem(
    workspaceId: string,
    planId: string,
    itemIndex: number,
    completed: boolean,
  ): Promise<GeneratedStudyPlan> {
    const data = await apiFetch<{ plan: GeneratedStudyPlan }>(
      `/api/v1/workspaces/${workspaceId}/study-plan/plans/${planId}/items/${itemIndex}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ completed }),
      },
    );
    return data.plan;
  }

  // ---------------------------------------------------------------------------
  // Exam Dates
  // ---------------------------------------------------------------------------

/** Fetch all exam dates for a workspace. */
export async function fetchExamDates(workspaceId: string): Promise<ExamDate[]> {
  return apiFetch<ExamDate[]>(`/api/v1/workspaces/${workspaceId}/study-plan/exams`);
}

/** Create a new exam date entry. */
export async function createExamDate(
  workspaceId: string,
  payload: CreateExamDatePayload,
): Promise<ExamDate> {
  return apiFetch<ExamDate>(`/api/v1/workspaces/${workspaceId}/study-plan/exams`, {
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
  return apiFetch<ExamDate>(`/api/v1/workspaces/${workspaceId}/study-plan/exams/${examId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Delete an exam date. */
export async function deleteExamDate(workspaceId: string, examId: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/api/v1/workspaces/${workspaceId}/study-plan/exams/${examId}`, {
    method: 'DELETE',
  });
}
