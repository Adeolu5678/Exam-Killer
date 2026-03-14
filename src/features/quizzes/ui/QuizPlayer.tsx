'use client';

// =============================================================================
// features/quizzes/ui/QuizPlayer.tsx
// Layer: features → quizzes → ui
// Key behaviour:
//   1. On answer selection → micro-haptic box-shadow burst animation on the chosen option
//   2. On answer selection → collapse the global sidebar (useAppShellStore.collapseSidebar)
//   3. Keyboard navigation: ArrowLeft/Right for prev/next, 1–4 for option selection
// =============================================================================

import { useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, X } from 'lucide-react';

import { useAppShellStore } from '@/shared/stores/ui-store';
import { Button, Badge } from '@/shared/ui';

import styles from './QuizPlayer.module.css';
import { useQuizzesStore } from '../model/quizzesStore';
import type { QuizQuestion, QuizOption } from '../model/types';
import { useSubmitQuiz } from '../model/useQuizzes';

interface QuizPlayerProps {
  onExit?: () => void;
}

// ---------------------------------------------------------------------------
// Progress bar component
// ---------------------------------------------------------------------------
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className={styles.progressWrap} aria-label={`Question ${current + 1} of ${total}`}>
      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <span className={styles.progressLabel}>
        {current + 1} / {total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Option button with haptic burst
// ---------------------------------------------------------------------------
function OptionButton({
  option,
  index,
  isSelected,
  onSelect,
}: {
  option: QuizOption;
  index: number;
  isSelected: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <motion.button
      className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
      onClick={() => onSelect(option.key)}
      whileTap={{ scale: 0.975 }}
      animate={
        isSelected
          ? {
              boxShadow: [
                '0 0 0 0px rgba(61,123,245,0)',
                '0 0 0 6px rgba(61,123,245,0.35)',
                '0 0 16px 2px rgba(61,123,245,0.18)',
                '0 0 0 0px rgba(61,123,245,0)',
              ],
            }
          : { boxShadow: '0 0 0 0px rgba(61,123,245,0)' }
      }
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      aria-pressed={isSelected}
    >
      <span className={styles.optionKey}>{index + 1}</span>
      <span className={styles.optionText}>{option.text}</span>
      {isSelected && (
        <motion.span
          className={styles.optionCheck}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <CheckCircle2 size={16} />
        </motion.span>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Question card
// ---------------------------------------------------------------------------
function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
}: {
  question: QuizQuestion;
  selectedAnswer: string | undefined;
  onSelect: (key: string) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        className={styles.questionCard}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <p className={styles.questionText}>{question.question_text}</p>
        <div className={styles.options} role="radiogroup" aria-label="Answer options">
          {question.options.map((opt, i) => (
            <OptionButton
              key={opt.key}
              option={opt}
              index={i}
              isSelected={selectedAnswer === opt.key}
              onSelect={onSelect}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main player
// ---------------------------------------------------------------------------
export function QuizPlayer({ onExit }: QuizPlayerProps) {
  const {
    session,
    nextQuestion,
    prevQuestion,
    selectAnswer,
    setSubmitting,
    setResult,
    exitSession,
  } = useQuizzesStore();

  const { collapseSidebar } = useAppShellStore();
  const { mutateAsync: submitQuiz } = useSubmitQuiz();

  const { quiz, currentIndex, selectedAnswers, startedAt, isSubmitting } = session;

  // ── keyboard shortcuts ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!quiz) return;
      const q = quiz.questions[currentIndex];
      if (!q) return;

      if (e.key === 'ArrowRight') nextQuestion();
      if (e.key === 'ArrowLeft') prevQuestion();

      const numMatch = ['1', '2', '3', '4'].indexOf(e.key);
      if (numMatch !== -1 && q.options[numMatch]) {
        handleSelectAnswer(q.options[numMatch]!.key);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quiz, currentIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── answer selection with sidebar collapse ──────────────────────────────
  const handleSelectAnswer = useCallback(
    (key: string) => {
      if (!quiz) return;
      const q = quiz.questions[currentIndex];
      if (!q) return;
      selectAnswer(q.id, key);
      collapseSidebar(); // ← per requirement: sidebar collapses on answer select
    },
    [quiz, currentIndex, selectAnswer, collapseSidebar],
  );

  // ── submit all answers ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!quiz || isSubmitting) return;
    setSubmitting(true);
    const timeSpent = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    try {
      const result = await submitQuiz({
        quizId: quiz.quiz_id,
        submission: { answers: selectedAnswers, time_spent_seconds: timeSpent },
      });
      setResult(result);
    } catch {
      setSubmitting(false);
    }
  }, [quiz, isSubmitting, startedAt, selectedAnswers, submitQuiz, setSubmitting, setResult]);

  if (!quiz) return null;

  const currentQuestion: QuizQuestion | undefined = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const canSubmit = answeredCount === totalQuestions;

  return (
    <div className={styles.player}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.exitBtn}
            onClick={() => {
              exitSession();
              onExit?.();
            }}
            aria-label="Exit quiz"
          >
            <X size={16} />
          </button>
          <div>
            <h1 className={styles.quizTitle}>{quiz.title}</h1>
            {quiz.topic && (
              <Badge variant="default" className={styles.topicBadge}>
                {quiz.topic}
              </Badge>
            )}
          </div>
        </div>
        <div className={styles.headerStats}>
          <span className={styles.statChip}>
            <CheckCircle2 size={13} />
            {answeredCount}/{totalQuestions} answered
          </span>
          <span className={styles.statChip}>
            <Clock size={13} />
            {quiz.questions.length}Q
          </span>
        </div>
      </div>

      {/* ── Progress ── */}
      <ProgressBar current={currentIndex} total={totalQuestions} />

      {/* ── Question ── */}
      <div className={styles.body}>
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswers[currentQuestion.id]}
            onSelect={handleSelectAnswer}
          />
        )}
      </div>

      {/* ── Navigation ── */}
      <div className={styles.footer}>
        <Button variant="ghost" onClick={prevQuestion} disabled={currentIndex === 0}>
          <ChevronLeft size={16} />
          Previous
        </Button>

        <span className={styles.navHint}>Use ← → or 1–4 keys</span>

        {isLastQuestion ? (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            aria-live="polite"
          >
            {isSubmitting ? 'Submitting…' : `Submit Quiz (${answeredCount}/${totalQuestions})`}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={nextQuestion}
            disabled={currentIndex >= totalQuestions - 1}
          >
            Next
            <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
