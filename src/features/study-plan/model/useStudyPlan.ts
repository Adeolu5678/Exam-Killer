// =============================================================================
// features/study-plan/model/useStudyPlan.ts
// Layer: features → study-plan → model
// =============================================================================

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  studyPlanKeys,
  type StudySession,
  type ExamDate,
  type CreateStudySessionPayload,
  type UpdateStudySessionPayload,
  type CreateExamDatePayload,
  type UpdateExamDatePayload,
} from './types';
import {
  fetchStudySessions,
  fetchStudySession,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  completeStudySession,
  fetchExamDates,
  createExamDate,
  updateExamDate,
  deleteExamDate,
} from '../api/studyPlanApi';

// ---------------------------------------------------------------------------
// Study Session Hooks
// ---------------------------------------------------------------------------

/** Query: fetch all study sessions for a workspace. */
export function useStudySessions(workspaceId: string) {
  return useQuery({
    queryKey: studyPlanKeys.sessions(workspaceId),
    queryFn: () => fetchStudySessions(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 2 * 60 * 1000, // 2 minutes — sessions change often
  });
}

/** Query: fetch a single study session. */
export function useStudySession(workspaceId: string, sessionId: string) {
  return useQuery({
    queryKey: studyPlanKeys.session(workspaceId, sessionId),
    queryFn: () => fetchStudySession(workspaceId, sessionId),
    enabled: Boolean(workspaceId) && Boolean(sessionId),
    staleTime: 5 * 60 * 1000,
  });
}

/** Mutation: create a study session. */
export function useCreateStudySession(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStudySessionPayload) => createStudySession(workspaceId, payload),
    onSuccess: () => {
      toast.success('Study session created!');
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create study session');
    },
  });
}

/** Mutation: update a study session (optimistic). */
export function useUpdateStudySession(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: UpdateStudySessionPayload;
    }) => updateStudySession(workspaceId, sessionId, payload),
    onMutate: async ({ sessionId, payload }) => {
      await queryClient.cancelQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
      const prev = queryClient.getQueryData<StudySession[]>(studyPlanKeys.sessions(workspaceId));
      if (prev) {
        queryClient.setQueryData<StudySession[]>(
          studyPlanKeys.sessions(workspaceId),
          prev.map((s) => (s.id === sessionId ? { ...s, ...payload } : s)),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success('Session updated');
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message || 'Failed to update session');
      if (ctx?.prev) {
        queryClient.setQueryData(studyPlanKeys.sessions(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
    },
  });
}

/** Mutation: delete a study session (optimistic removal). */
export function useDeleteStudySession(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteStudySession(workspaceId, sessionId),
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
      const prev = queryClient.getQueryData<StudySession[]>(studyPlanKeys.sessions(workspaceId));
      if (prev) {
        queryClient.setQueryData<StudySession[]>(
          studyPlanKeys.sessions(workspaceId),
          prev.filter((s) => s.id !== sessionId),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success('Session deleted');
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message || 'Failed to delete session');
      if (ctx?.prev) {
        queryClient.setQueryData(studyPlanKeys.sessions(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
    },
  });
}

/** Mutation: mark a session as complete. */
export function useCompleteStudySession(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => completeStudySession(workspaceId, sessionId),
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
      const prev = queryClient.getQueryData<StudySession[]>(studyPlanKeys.sessions(workspaceId));
      if (prev) {
        queryClient.setQueryData<StudySession[]>(
          studyPlanKeys.sessions(workspaceId),
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, status: 'completed' as const, completedAt: new Date().toISOString() }
              : s,
          ),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success('Session completed! Keep it up! 🎯');
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message || 'Failed to complete session');
      if (ctx?.prev) {
        queryClient.setQueryData(studyPlanKeys.sessions(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.sessions(workspaceId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Exam Date Hooks
// ---------------------------------------------------------------------------

/** Query: fetch all exam dates for a workspace. */
export function useExamDates(workspaceId: string) {
  return useQuery({
    queryKey: studyPlanKeys.exams(workspaceId),
    queryFn: () => fetchExamDates(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000, // 5 minutes — exam dates are more stable
  });
}

/** Mutation: create an exam date. */
export function useCreateExamDate(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateExamDatePayload) => createExamDate(workspaceId, payload),
    onSuccess: () => {
      toast.success('Exam date added');
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.exams(workspaceId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add exam date');
    },
  });
}

/** Mutation: update an exam date (optimistic). */
export function useUpdateExamDate(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, payload }: { examId: string; payload: UpdateExamDatePayload }) =>
      updateExamDate(workspaceId, examId, payload),
    onMutate: async ({ examId, payload }) => {
      await queryClient.cancelQueries({
        queryKey: studyPlanKeys.exams(workspaceId),
      });
      const prev = queryClient.getQueryData<ExamDate[]>(studyPlanKeys.exams(workspaceId));
      if (prev) {
        queryClient.setQueryData<ExamDate[]>(
          studyPlanKeys.exams(workspaceId),
          prev.map((e) => (e.id === examId ? { ...e, ...payload } : e)),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success('Exam date updated');
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message || 'Failed to update exam date');
      if (ctx?.prev) {
        queryClient.setQueryData(studyPlanKeys.exams(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.exams(workspaceId),
      });
    },
  });
}

/** Mutation: delete an exam date (optimistic). */
export function useDeleteExamDate(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (examId: string) => deleteExamDate(workspaceId, examId),
    onMutate: async (examId) => {
      await queryClient.cancelQueries({
        queryKey: studyPlanKeys.exams(workspaceId),
      });
      const prev = queryClient.getQueryData<ExamDate[]>(studyPlanKeys.exams(workspaceId));
      if (prev) {
        queryClient.setQueryData<ExamDate[]>(
          studyPlanKeys.exams(workspaceId),
          prev.filter((e) => e.id !== examId),
        );
      }
      return { prev };
    },
    onSuccess: () => {
      toast.success('Exam date removed');
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message || 'Failed to remove exam date');
      if (ctx?.prev) {
        queryClient.setQueryData(studyPlanKeys.exams(workspaceId), ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: studyPlanKeys.exams(workspaceId),
      });
    },
  });
}
