import { create } from 'zustand';

import type { Flashcard } from '@/shared/types/database';

interface ReviewSession {
  flashcards: Flashcard[];
  currentIndex: number;
  isFlipped: boolean;
  isLoading: boolean;
  error: string | null;
  completedRatings: number[];
}

interface FlashcardState {
  reviewSession: ReviewSession;
  startReview: (flashcards: Flashcard[]) => void;
  flipCard: () => void;
  nextCard: () => void;
  prevCard: () => void;
  setRating: (rating: number) => void;
  endReview: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getCurrentCard: () => Flashcard | null;
  getProgress: () => { current: number; total: number };
  getIsComplete: () => boolean;
}

const initialSession: ReviewSession = {
  flashcards: [],
  currentIndex: 0,
  isFlipped: false,
  isLoading: false,
  error: null,
  completedRatings: [],
};

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  reviewSession: { ...initialSession },

  startReview: (flashcards: Flashcard[]) => {
    set({
      reviewSession: {
        flashcards,
        currentIndex: 0,
        isFlipped: false,
        isLoading: false,
        error: null,
        completedRatings: [],
      },
    });
  },

  flipCard: () => {
    set((state) => ({
      reviewSession: {
        ...state.reviewSession,
        isFlipped: !state.reviewSession.isFlipped,
      },
    }));
  },

  nextCard: () => {
    set((state) => {
      const nextIndex = state.reviewSession.currentIndex + 1;
      if (nextIndex >= state.reviewSession.flashcards.length) {
        return state;
      }
      return {
        reviewSession: {
          ...state.reviewSession,
          currentIndex: nextIndex,
          isFlipped: false,
        },
      };
    });
  },

  prevCard: () => {
    set((state) => {
      const prevIndex = state.reviewSession.currentIndex - 1;
      if (prevIndex < 0) {
        return state;
      }
      return {
        reviewSession: {
          ...state.reviewSession,
          currentIndex: prevIndex,
          isFlipped: false,
        },
      };
    });
  },

  setRating: (rating: number) => {
    set((state) => ({
      reviewSession: {
        ...state.reviewSession,
        completedRatings: [...state.reviewSession.completedRatings, rating],
      },
    }));
  },

  endReview: () => {
    set({ reviewSession: { ...initialSession } });
  },

  setLoading: (loading: boolean) => {
    set((state) => ({
      reviewSession: {
        ...state.reviewSession,
        isLoading: loading,
      },
    }));
  },

  setError: (error: string | null) => {
    set((state) => ({
      reviewSession: {
        ...state.reviewSession,
        error,
      },
    }));
  },

  getCurrentCard: () => {
    const { reviewSession } = get();
    return reviewSession.flashcards[reviewSession.currentIndex] || null;
  },

  getProgress: () => {
    const { reviewSession } = get();
    return {
      current: reviewSession.currentIndex + 1,
      total: reviewSession.flashcards.length,
    };
  },

  getIsComplete: () => {
    const { reviewSession } = get();
    return reviewSession.completedRatings.length >= reviewSession.flashcards.length;
  },
}));
