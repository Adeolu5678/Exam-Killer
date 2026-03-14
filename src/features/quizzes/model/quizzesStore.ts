// =============================================================================
// features/quizzes/model/quizzesStore.ts
// Layer: features → quizzes → model
// Tool: Zustand + immer — ephemeral session UI state only.
//       Never store server data here; that lives in TanStack Query cache.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { QuizDetail, QuizResultData, QuizSessionState } from './types';

// ---------------------------------------------------------------------------
// State & Actions
// ---------------------------------------------------------------------------

interface QuizzesUIState {
  /** View shown to the user */
  view: 'list' | 'builder' | 'player' | 'reveal';
  /** Whether the builder dialog is open */
  isBuilderOpen: boolean;
  /** Active quiz session */
  session: QuizSessionState;
}

interface QuizzesUIActions {
  openBuilder: () => void;
  closeBuilder: () => void;

  /** Start a quiz session (transitions to 'player' view) */
  startSession: (quiz: QuizDetail) => void;
  /** Record the user's selected answer for the current question */
  selectAnswer: (questionId: string, answerKey: string) => void;
  /** Navigate to the next question */
  nextQuestion: () => void;
  /** Navigate to the previous question */
  prevQuestion: () => void;
  /** Mark the submission in-flight */
  setSubmitting: (submitting: boolean) => void;
  /** Store result and transition to 'reveal' view */
  setResult: (result: QuizResultData) => void;
  /** Reset everything back to the list view */
  exitSession: () => void;
}

// ---------------------------------------------------------------------------
// Initial values
// ---------------------------------------------------------------------------

const initialSession: QuizSessionState = {
  quiz: null,
  currentIndex: 0,
  selectedAnswers: {},
  startedAt: null,
  isSubmitting: false,
  result: null,
};

const initial: QuizzesUIState = {
  view: 'list',
  isBuilderOpen: false,
  session: initialSession,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useQuizzesStore = create<QuizzesUIState & QuizzesUIActions>()(
  immer((set) => ({
    ...initial,

    openBuilder: () =>
      set((s) => {
        s.isBuilderOpen = true;
      }),

    closeBuilder: () =>
      set((s) => {
        s.isBuilderOpen = false;
      }),

    startSession: (quiz) =>
      set((s) => {
        s.session = {
          quiz,
          currentIndex: 0,
          selectedAnswers: {},
          startedAt: Date.now(),
          isSubmitting: false,
          result: null,
        };
        s.view = 'player';
        s.isBuilderOpen = false;
      }),

    selectAnswer: (questionId, answerKey) =>
      set((s) => {
        s.session.selectedAnswers[questionId] = answerKey;
      }),

    nextQuestion: () =>
      set((s) => {
        const total = s.session.quiz?.questions.length ?? 0;
        if (s.session.currentIndex < total - 1) {
          s.session.currentIndex += 1;
        }
      }),

    prevQuestion: () =>
      set((s) => {
        if (s.session.currentIndex > 0) {
          s.session.currentIndex -= 1;
        }
      }),

    setSubmitting: (submitting) =>
      set((s) => {
        s.session.isSubmitting = submitting;
      }),

    setResult: (result) =>
      set((s) => {
        s.session.result = result;
        s.session.isSubmitting = false;
        s.view = 'reveal';
      }),

    exitSession: () =>
      set((s) => {
        s.session = initialSession;
        s.view = 'list';
      }),
  })),
);
