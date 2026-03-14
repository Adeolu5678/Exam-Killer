// =============================================================================
// features/flashcards/model/flashcardsStore.ts
// Layer: features → flashcards → model
// Rule: Zustand store for EPHEMERAL UI state only. No server data stored here.
// =============================================================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { ReviewSessionState, FlashcardItem } from './types';

// ── State shape ───────────────────────────────────────────────────────────────
interface FlashcardsUIState {
  /** Is the full-screen review mode active? */
  isReviewMode: boolean;
  /** Is the card creator dialog open? */
  isCreatorOpen: boolean;
  /** Active review session */
  session: ReviewSessionState;
}

interface FlashcardsUIActions {
  openReview: (cards: FlashcardItem[]) => void;
  exitReview: () => void;
  openCreator: () => void;
  closeCreator: () => void;
  flipCard: () => void;
  nextCard: (ratingQuality?: number) => void;
  prevCard: () => void;
  setSubmitting: (v: boolean) => void;
}

type FlashcardsStore = FlashcardsUIState & FlashcardsUIActions;

// ── Default session ───────────────────────────────────────────────────────────
const emptySession: ReviewSessionState = {
  cards: [],
  currentIndex: 0,
  isFlipped: false,
  ratings: [],
  isSubmitting: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const useFlashcardsStore = create<FlashcardsStore>()(
  immer((set) => ({
    isReviewMode: false,
    isCreatorOpen: false,
    session: { ...emptySession },

    openReview: (cards) =>
      set((s) => {
        s.isReviewMode = true;
        s.session = { ...emptySession, cards };
      }),

    exitReview: () =>
      set((s) => {
        s.isReviewMode = false;
        s.session = { ...emptySession };
      }),

    openCreator: () =>
      set((s) => {
        s.isCreatorOpen = true;
      }),
    closeCreator: () =>
      set((s) => {
        s.isCreatorOpen = false;
      }),

    flipCard: () =>
      set((s) => {
        s.session.isFlipped = !s.session.isFlipped;
      }),

    nextCard: (ratingQuality) =>
      set((s) => {
        // Record rating if provided
        if (ratingQuality !== undefined) {
          s.session.ratings.push(ratingQuality);
        }
        const next = s.session.currentIndex + 1;
        if (next < s.session.cards.length) {
          s.session.currentIndex = next;
          s.session.isFlipped = false;
        }
      }),

    prevCard: () =>
      set((s) => {
        const prev = s.session.currentIndex - 1;
        if (prev >= 0) {
          s.session.currentIndex = prev;
          s.session.isFlipped = false;
        }
      }),

    setSubmitting: (v) =>
      set((s) => {
        s.session.isSubmitting = v;
      }),
  })),
);
