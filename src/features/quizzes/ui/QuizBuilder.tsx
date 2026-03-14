'use client';

// =============================================================================
// features/quizzes/ui/QuizBuilder.tsx
// Layer: features → quizzes → ui
// Rule: Imports ONLY from @/shared/ui and local feature model.
// =============================================================================

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronRight } from 'lucide-react';

import { Button, Input, Badge, Spinner } from '@/shared/ui';

import styles from './QuizBuilder.module.css';
import { useQuizzesStore } from '../model/quizzesStore';
import { generateQuizSchema, DIFFICULTY_LABELS } from '../model/types';
import type { GenerateQuizPayload } from '../model/types';
import { useGenerateQuiz } from '../model/useQuizzes';

interface QuizBuilderProps {
  workspaceId: string;
  onSuccess?: (quizId: string) => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20, 30];
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export function QuizBuilder({ workspaceId, onSuccess }: QuizBuilderProps) {
  const { closeBuilder } = useQuizzesStore();
  const { mutateAsync: generate, isPending } = useGenerateQuiz(workspaceId);

  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState<GenerateQuizPayload['difficulty']>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = generateQuizSchema.safeParse({ topic, num_questions: numQuestions, difficulty });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString() ?? 'root';
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      const quiz = await generate(result.data);
      onSuccess?.(quiz.quiz_id);
      closeBuilder();
    } catch {
      setErrors({ root: 'Failed to generate quiz. Please try again.' });
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeBuilder}
      />

      {/* Dialog */}
      <motion.div
        className={styles.dialog}
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrap}>
              <Zap size={18} />
            </div>
            <div>
              <h2 id="builder-title" className={styles.title}>
                Generate Quiz
              </h2>
              <p className={styles.subtitle}>AI-powered from your workspace sources</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={closeBuilder} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Topic */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="quiz-topic">
              Topic
            </label>
            <Input
              id="quiz-topic"
              placeholder="e.g. Cell division, Newton's laws of motion…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              error={errors.topic}
            />
          </div>

          {/* Number of questions */}
          <div className={styles.field}>
            <label className={styles.label}>Number of Questions</label>
            <div className={styles.pillGroup} role="radiogroup" aria-label="Question count">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={numQuestions === n}
                  className={`${styles.pill} ${numQuestions === n ? styles.pillActive : ''}`}
                  onClick={() => setNumQuestions(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className={styles.field}>
            <label className={styles.label}>Difficulty</label>
            <div className={styles.pillGroup} role="radiogroup" aria-label="Difficulty level">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d}
                  className={`${styles.pill} ${styles[`pill_${d}`]} ${difficulty === d ? styles.pillActive : ''}`}
                  onClick={() => setDifficulty(d)}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Root error */}
          {errors.root && <p className={styles.rootError}>{errors.root}</p>}

          {/* Actions */}
          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={closeBuilder} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || !topic.trim()}
              className={styles.generateBtn}
            >
              {isPending ? (
                <>
                  <Spinner size="sm" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Generate</span>
                  <ChevronRight size={14} />
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
