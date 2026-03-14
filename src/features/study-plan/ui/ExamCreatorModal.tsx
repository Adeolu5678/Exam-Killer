'use client';

// =============================================================================
// features/study-plan/ui/ExamCreatorModal.tsx
// Layer: features → study-plan → ui
// FSD: imports ONLY from @/shared/ui (primitives) and internal model layer.
// =============================================================================

import React, { useState, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarCheck2, Loader2 } from 'lucide-react';

import { Button, Input, Textarea } from '@/shared/ui';

import styles from './ExamCreatorModal.module.css';
import { useStudyPlanStore } from '../model/studyPlanStore';
import { createExamDateSchema, type CreateExamDatePayload } from '../model/types';
import { useCreateExamDate } from '../model/useStudyPlan';

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  title: string;
  subject: string;
  examDate: string;
  venue: string;
  notes: string;
  isPrimary: boolean;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) errors.title = 'Exam title is required.';
  else if (form.title.length > 150) errors.title = 'Title must be ≤ 150 characters.';

  if (!form.subject.trim()) errors.subject = 'Subject is required.';
  else if (form.subject.length > 100) errors.subject = 'Subject must be ≤ 100 characters.';

  if (!form.examDate) errors.examDate = 'Exam date is required.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.examDate))
    errors.examDate = 'Date must be in YYYY-MM-DD format.';

  if (form.venue.length > 200) errors.venue = 'Venue must be ≤ 200 characters.';

  if (form.notes.length > 500) errors.notes = 'Notes must be ≤ 500 characters.';

  return errors;
}

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// ExamCreatorModal — public component
// ---------------------------------------------------------------------------

interface ExamCreatorModalProps {
  workspaceId: string;
}

export function ExamCreatorModal({ workspaceId }: ExamCreatorModalProps) {
  const { isExamCreatorOpen, closeExamCreator } = useStudyPlanStore();
  const createExam = useCreateExamDate(workspaceId);

  const [form, setForm] = useState<FormState>({
    title: '',
    subject: '',
    examDate: todayDateStr(),
    venue: '',
    notes: '',
    isPrimary: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  function handleClose() {
    setForm({
      title: '',
      subject: '',
      examDate: todayDateStr(),
      venue: '',
      notes: '',
      isPrimary: false,
    });
    setErrors({});
    setSubmitError(null);
    closeExamCreator();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: CreateExamDatePayload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      examDate: form.examDate,
      venue: form.venue.trim() || undefined,
      notes: form.notes.trim() || undefined,
      isPrimary: form.isPrimary,
    };

    const parsed = createExamDateSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Validation error.');
      return;
    }

    setSubmitError(null);
    createExam.mutate(payload, {
      onSuccess: () => handleClose(),
      onError: (err: Error) => setSubmitError(err.message),
    });
  }

  return (
    <AnimatePresence>
      {isExamCreatorOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="exam-backdrop"
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            key="exam-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-creator-title"
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.headerIcon} aria-hidden="true">
                  <CalendarCheck2 size={16} />
                </div>
                <h2 id="exam-creator-title" className={styles.title}>
                  Add Exam Date
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className={styles.closeBtn}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className={styles.form}>
              {/* Title */}
              <div className={styles.field}>
                <label htmlFor="exam-title" className={styles.label}>
                  Exam Title <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="exam-title"
                  placeholder="e.g. MTH 302 Final Exam"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'exam-title-err' : undefined}
                />
                {errors.title && (
                  <p id="exam-title-err" className={styles.fieldError}>
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Subject + Date row */}
              <div className={styles.twoCol}>
                <div className={styles.field}>
                  <label htmlFor="exam-subject" className={styles.label}>
                    Subject <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="exam-subject"
                    placeholder="e.g. Mathematics"
                    value={form.subject}
                    onChange={(e) => setField('subject', e.target.value)}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? 'exam-subject-err' : undefined}
                  />
                  {errors.subject && (
                    <p id="exam-subject-err" className={styles.fieldError}>
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="exam-date" className={styles.label}>
                    Exam Date <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setField('examDate', e.target.value)}
                    aria-invalid={Boolean(errors.examDate)}
                    aria-describedby={errors.examDate ? 'exam-date-err' : undefined}
                  />
                  {errors.examDate && (
                    <p id="exam-date-err" className={styles.fieldError}>
                      {errors.examDate}
                    </p>
                  )}
                </div>
              </div>

              {/* Venue */}
              <div className={styles.field}>
                <label htmlFor="exam-venue" className={styles.label}>
                  Venue <span className={styles.optional}>(optional)</span>
                </label>
                <Input
                  id="exam-venue"
                  placeholder="e.g. Faculty Hall A, Room 201"
                  value={form.venue}
                  onChange={(e) => setField('venue', e.target.value)}
                  aria-invalid={Boolean(errors.venue)}
                />
                {errors.venue && <p className={styles.fieldError}>{errors.venue}</p>}
              </div>

              {/* Notes */}
              <div className={styles.field}>
                <label htmlFor="exam-notes" className={styles.label}>
                  Notes <span className={styles.optional}>(optional)</span>
                </label>
                <Textarea
                  id="exam-notes"
                  placeholder="Any reminders about this exam — materials to bring, sections to focus on…"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  rows={3}
                  aria-invalid={Boolean(errors.notes)}
                  aria-describedby={errors.notes ? 'exam-notes-err' : undefined}
                />
                {errors.notes && (
                  <p id="exam-notes-err" className={styles.fieldError}>
                    {errors.notes}
                  </p>
                )}
              </div>

              {/* Primary exam toggle */}
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isPrimary}
                  onClick={() => setField('isPrimary', !form.isPrimary)}
                  className={styles.toggle}
                  data-checked={form.isPrimary}
                >
                  <span className={styles.toggleThumb} />
                </button>
                <div>
                  <p className={styles.toggleLabel}>Mark as Primary Exam</p>
                  <p className={styles.toggleHint}>
                    Primary exams appear first in the countdown and are highlighted with an amber
                    accent.
                  </p>
                </div>
              </div>

              {/* Submission error */}
              {submitError && (
                <p className={styles.submitError} role="alert">
                  {submitError}
                </p>
              )}

              {/* Footer */}
              <div className={styles.footer}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={createExam.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createExam.isPending}
                  leftIcon={
                    createExam.isPending ? (
                      <Loader2 size={14} className={styles.spinner} />
                    ) : (
                      <CalendarCheck2 size={14} />
                    )
                  }
                >
                  {createExam.isPending ? 'Saving…' : 'Add Exam'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
