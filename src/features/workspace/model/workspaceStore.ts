// =============================================================================
// features/workspace/model/workspaceStore.ts
// Layer: features → workspace → model
// Tool: Zustand (ephemeral UI state ONLY — no server data stored here)
// Rule: Never cache server data in Zustand. Use TanStack Query cache for that.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface WorkspaceUIState {
  /** Whether the "Create Workspace" dialog is open */
  isCreatorOpen: boolean;
  /** ID of the workspace whose delete-confirmation dialog is open */
  pendingDeleteId: string | null;
  /** Current search/filter string applied to the workspace grid */
  searchQuery: string;
  /** Whether to show only public workspaces */
  showPublicOnly: boolean;
}

interface WorkspaceUIActions {
  openCreator: () => void;
  closeCreator: () => void;
  setPendingDelete: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  togglePublicOnly: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: WorkspaceUIState = {
  isCreatorOpen: false,
  pendingDeleteId: null,
  searchQuery: '',
  showPublicOnly: false,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkspaceStore = create<WorkspaceUIState & WorkspaceUIActions>()(
  immer((set) => ({
    ...initialState,

    openCreator: () =>
      set((state) => {
        state.isCreatorOpen = true;
      }),

    closeCreator: () =>
      set((state) => {
        state.isCreatorOpen = false;
      }),

    setPendingDelete: (id) =>
      set((state) => {
        state.pendingDeleteId = id;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),

    togglePublicOnly: () =>
      set((state) => {
        state.showPublicOnly = !state.showPublicOnly;
      }),

    reset: () => set(() => initialState),
  })),
);
