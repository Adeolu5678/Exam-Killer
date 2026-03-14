// =============================================================================
// features/tutor/model/tutorStore.ts
// Layer: features → tutor → model
// Purpose: Zustand (immer) slice for ephemeral tutor UI state.
//          Manages selected personality, sidebar visibility, and chat input.
//          All server/message state lives in useTutor.ts (TanStack Query).
// =============================================================================

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { TutorPersonalityId } from './types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface TutorState {
  /** Currently active tutor personality */
  selectedPersonality: TutorPersonalityId;

  /** Whether the right-side sources panel is collapsed */
  isSourcesPanelOpen: boolean;

  /** Controlled input value for the chat textarea */
  inputValue: string;

  /** Whether a response is currently being streamed */
  isStreaming: boolean;

  /** ID of the message currently being streamed (for progressive render) */
  streamingMessageId: string | null;
}

interface TutorActions {
  setPersonality: (id: TutorPersonalityId) => void;
  toggleSourcesPanel: () => void;
  setSourcesPanelOpen: (open: boolean) => void;
  setInputValue: (value: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTutorStore = create<TutorState & TutorActions>()(
  immer((set) => ({
    // --- initial state ---
    selectedPersonality: 'mentor',
    isSourcesPanelOpen: true,
    inputValue: '',
    isStreaming: false,
    streamingMessageId: null,

    // --- actions ---
    setPersonality: (id) =>
      set((s) => {
        s.selectedPersonality = id;
      }),

    toggleSourcesPanel: () =>
      set((s) => {
        s.isSourcesPanelOpen = !s.isSourcesPanelOpen;
      }),

    setSourcesPanelOpen: (open) =>
      set((s) => {
        s.isSourcesPanelOpen = open;
      }),

    setInputValue: (value) =>
      set((s) => {
        s.inputValue = value;
      }),

    setIsStreaming: (streaming) =>
      set((s) => {
        s.isStreaming = streaming;
      }),

    setStreamingMessageId: (id) =>
      set((s) => {
        s.streamingMessageId = id;
      }),
  })),
);
