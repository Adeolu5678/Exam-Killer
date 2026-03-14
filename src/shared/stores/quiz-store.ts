import { create } from 'zustand';

import type {
  GenerateQuizResponse,
  QuizDetailResponse,
  SubmitQuizResponse,
  QuestionResult,
} from '@/shared/types/api';

export interface Quiz {
  id: string;
  workspace_id: string;
  questions: QuizQuestion[];
  total_questions: number;
  estimated_time_minutes: number;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options?: Record<string, string>;
  correct_answer?: string;
  explanation?: string;
  difficulty: string;
  source_reference?: string;
}

export interface QuizAnswer {
  question_id: string;
  answer: string;
  time_spent_seconds: number;
}

export interface QuizResult {
  quiz_id: string;
  score: number;
  correct_count: number;
  total_questions: number;
  time_spent_seconds: number;
  question_results: QuestionResult[];
  xp_earned: number;
}

type QuizStatus = 'idle' | 'loading' | 'ready' | 'in_progress' | 'submitting' | 'completed';

interface QuizState {
  currentQuiz: Quiz | null;
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  questionStartTimes: Record<string, number>;
  status: QuizStatus;
  results: QuizResult | null;
  error: string | null;
  setQuiz: (quiz: GenerateQuizResponse['quiz'] | QuizDetailResponse['quiz']) => void;
  startQuiz: () => void;
  setAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  submitQuiz: () => Promise<void>;
  resetQuiz: () => void;
  getCurrentQuestion: () => QuizQuestion | null;
  getProgress: () => number;
  getAnsweredCount: () => number;
}

const initialState = {
  currentQuiz: null,
  currentQuestionIndex: 0,
  userAnswers: {},
  questionStartTimes: {},
  status: 'idle' as QuizStatus,
  results: null,
  error: null,
};

export const useQuizStore = create<QuizState>((set, get) => ({
  ...initialState,

  setQuiz: (quiz) => {
    const questionStartTimes: Record<string, number> = {};
    quiz.questions.forEach((q) => {
      questionStartTimes[q.id] = Date.now();
    });
    set({
      currentQuiz: quiz,
      currentQuestionIndex: 0,
      userAnswers: {},
      questionStartTimes,
      status: 'ready',
      results: null,
      error: null,
    });
  },

  startQuiz: () => {
    set({ status: 'in_progress' });
  },

  setAnswer: (questionId: string, answer: string) => {
    set((state) => ({
      userAnswers: {
        ...state.userAnswers,
        [questionId]: answer,
      },
    }));
  },

  nextQuestion: () => {
    set((state) => {
      if (!state.currentQuiz) return state;
      const nextIndex = state.currentQuestionIndex + 1;
      if (nextIndex >= state.currentQuiz.questions.length) {
        return state;
      }
      return { currentQuestionIndex: nextIndex };
    });
  },

  prevQuestion: () => {
    set((state) => {
      const prevIndex = state.currentQuestionIndex - 1;
      if (prevIndex < 0) {
        return state;
      }
      return { currentQuestionIndex: prevIndex };
    });
  },

  goToQuestion: (index: number) => {
    set((state) => {
      if (!state.currentQuiz) return state;
      if (index < 0 || index >= state.currentQuiz.questions.length) {
        return state;
      }
      return { currentQuestionIndex: index };
    });
  },

  submitQuiz: async () => {
    const { currentQuiz, userAnswers, questionStartTimes } = get();

    if (!currentQuiz) {
      set({ error: 'No quiz to submit' });
      return;
    }

    set({ status: 'submitting', error: null });

    try {
      const answers: QuizAnswer[] = currentQuiz.questions.map((question) => {
        const startTime = questionStartTimes[question.id] || Date.now();
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        return {
          question_id: question.id,
          answer: userAnswers[question.id] || '',
          time_spent_seconds: timeSpent,
        };
      });

      const response = await fetch(`/api/quiz/${currentQuiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      const data: SubmitQuizResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.result ? 'Failed to submit quiz' : 'Failed to submit quiz');
      }

      set({
        status: 'completed',
        results: data.result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      set({
        status: 'in_progress',
        error: errorMessage,
      });
    }
  },

  resetQuiz: () => {
    set(initialState);
  },

  getCurrentQuestion: () => {
    const { currentQuiz, currentQuestionIndex } = get();
    if (!currentQuiz) return null;
    return currentQuiz.questions[currentQuestionIndex] || null;
  },

  getProgress: () => {
    const { currentQuiz, userAnswers } = get();
    if (!currentQuiz || currentQuiz.questions.length === 0) return 0;
    const answered = Object.keys(userAnswers).filter(
      (id) => userAnswers[id] && userAnswers[id].trim() !== '',
    ).length;
    return (answered / currentQuiz.questions.length) * 100;
  },

  getAnsweredCount: () => {
    const { currentQuiz, userAnswers } = get();
    if (!currentQuiz) return 0;
    return Object.keys(userAnswers).filter((id) => userAnswers[id] && userAnswers[id].trim() !== '')
      .length;
  },
}));
