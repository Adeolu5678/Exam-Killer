// =============================================================================
// features/workspace/index.ts  —  PUBLIC API
// Layer: features → workspace
// Rule: Consumers may ONLY import from this file.
//   ✅  import { WorkspaceGrid, useWorkspaces } from '@/features/workspace'
//   ❌  import { WorkspaceCard } from '@/features/workspace/ui/WorkspaceCard'
// =============================================================================

// ── UI components ──────────────────────────────────────────────────────────
export { WorkspaceCard } from './ui/WorkspaceCard';
export { WorkspaceGrid } from './ui/WorkspaceGrid';
export { WorkspaceCreator } from './ui/WorkspaceCreator';
export { WorkspaceEmptyState } from './ui/WorkspaceEmptyState';
export { WorkspaceCardSkeleton, WorkspaceGridSkeleton } from './ui/WorkspaceCardSkeleton';
export { DeleteWorkspaceModal } from './ui/DeleteWorkspaceModal';

// ── TanStack Query hooks ────────────────────────────────────────────────────
export {
  useWorkspaces,
  useWorkspace,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  workspaceKeys,
} from './model/useWorkspaces';

// ── Zustand store (UI state only) ───────────────────────────────────────────
export { useWorkspaceStore } from './model/workspaceStore';

// ── Types (re-exported for FSD consumers) ──────────────────────────────────
export type { WorkspaceListItem, WorkspaceDetail } from './model/types';
export { createWorkspaceSchema, updateWorkspaceSchema, TUTOR_PERSONALITIES } from './model/types';
export type {
  CreateWorkspaceFormValues,
  UpdateWorkspaceFormValues,
  TutorPersonalityId,
  CreatorStep,
} from './model/types';

// ── API functions (for advanced consumers, e.g. server components) ──────────
export {
  fetchWorkspaces,
  fetchWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  fetchWorkspaceMembers,
  inviteMember,
} from './api/workspaceApi';
