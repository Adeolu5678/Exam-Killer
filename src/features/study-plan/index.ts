// =============================================================================
// features/study-plan/index.ts  —  PUBLIC API
// Layer: features → study-plan
// Rule: Consumers may ONLY import from this file.
//   ✅  import { PlannerCalendar, useStudySessions } from '@/features/study-plan'
//   ❌  import { PlannerCalendar } from '@/features/study-plan/ui/PlannerCalendar'
// =============================================================================

// ── UI components ──────────────────────────────────────────────────────────
export { PlannerCalendar } from './ui/PlannerCalendar';
export { ExamCountdown } from './ui/ExamCountdown';
export { StudyPlanPageShell } from './ui/StudyPlanPageShell';
export { StudyPlanSkeleton } from './ui/StudyPlanSkeleton';
export { SessionCreatorModal } from './ui/SessionCreatorModal';
export { ExamCreatorModal } from './ui/ExamCreatorModal';

// ── TanStack Query hooks ────────────────────────────────────────────────────
export {
  useStudySessions,
  useStudySession,
  useStudyPlans,
  useCreateStudySession,
  useUpdateStudySession,
  useDeleteStudySession,
  useCompleteStudySession,
  useGenerateStudyPlan,
  useUpdateGeneratedStudyPlan,
  useCompleteStudyPlanItem,
  useExamDates,
  useCreateExamDate,
  useUpdateExamDate,
  useDeleteExamDate,
} from './model/useStudyPlan';

// ── Zustand store (ephemeral UI only) ───────────────────────────────────────
export { useStudyPlanStore } from './model/studyPlanStore';

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  StudySession,
  ExamDate,
  CalendarDay,
  CountdownData,
  StudyPlanStats,
  GeneratedStudyPlan,
  GeneratedStudyPlanItem,
  StudyPlanStatus,
  StudyPlanActivityType,
  WorkspaceStudyPlanBundle,
  SessionStatus,
  SessionCategory,
  CalendarView,
  CreateStudySessionPayload,
  UpdateStudySessionPayload,
  CreateExamDatePayload,
  UpdateExamDatePayload,
  GenerateStudyPlanPayload,
  UpdateGeneratedStudyPlanPayload,
} from './model/types';

export {
  createStudySessionSchema,
  createExamDateSchema,
  generateStudyPlanSchema,
  updateGeneratedStudyPlanSchema,
  studyPlanKeys,
  SESSION_CATEGORY_CONFIG,
  computeCountdown,
  buildMonthGrid,
  buildWeekGrid,
  computeWeekStats,
  formatDateStr,
  formatTime,
  formatDuration,
} from './model/types';

// ── API functions ────────────────────────────────────────────────────────────
export {
  fetchStudyPlanBundle,
  fetchStudyPlans,
  fetchStudySessions,
  fetchStudySession,
  createStudySession,
  updateStudySession,
  deleteStudySession,
  completeStudySession,
  generateWorkspaceStudyPlan,
  updateGeneratedStudyPlan,
  completeGeneratedStudyPlanItem,
  fetchExamDates,
  createExamDate,
  updateExamDate,
  deleteExamDate,
} from './api/studyPlanApi';
