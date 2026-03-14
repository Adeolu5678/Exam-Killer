'use client';

// =============================================================================
// features/study-plan/ui/SessionCreatorModal.tsx
// Layer: features → study-plan → ui
// FSD: imports ONLY from @/shared/ui (primitives) and internal model layer.
// =============================================================================

import React, { useState, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle, Loader2 } from 'lucide-react';

import { Button, Input, Textarea } from '@/shared/ui';

import styles from './SessionCreatorModal.module.css';
import { useStudyPlanStore } from '../model/studyPlanStore';
import {
  createStudySessionSchema,
  SESSION_CATEGORY_CONFIG,
  formatDateStr,
  type SessionCategory,
  type CreateStudySessionPayload,
} from '../model/types';
import { useCreateStudySession } from '../model/useStudyPlan';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDateStr(): string {
  return formatDateStr(new Date());
}

function toISODateTime(dateStr: string, timeStr: string): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  return `${dateStr}T${timeStr}:00.000Z`;
}

// ---------------------------------------------------------------------------
// Category pill selector
// ---------------------------------------------------------------------------

const CATEGORIES = Object.entries(SESSION_CATEGORY_CONFIG) as [
  SessionCategory,
  { label: string; color: string; bgColor: string },
][];

interface CategoryPillProps {
  category: SessionCategory;
  label: string;
  color: string;
  bgColor: string;
  selected: boolean;
  onSelect: (c: SessionCategory) => void;
}

function CategoryPill({ category, label, color, bgColor, selected, onSelect }: CategoryPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(category)}
      className={styles.categoryPill}
      data-selected={selected}
      style={selected ? { background: bgColor, borderColor: color, color } : undefined}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormState {
  title: string;
  description: string;
  category: SessionCategory;
  date: string;
  startTime: string;
  endTime: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!form.title.trim()) errors.title = 'Session title is required.';
  else if (form.title.length > 100) errors.title = 'Title must be ≤ 100 characters.';

  if (!form.date) errors.date = 'Date is required.';

  if (!form.startTime) errors.startTime = 'Start time is required.';

  if (!form.endTime) {
    errors.endTime = 'End time is required.';
  } else if (form.startTime && form.endTime <= form.startTime) {
    errors.endTime = 'End time must be after start time.';
  }

  if (form.description.length > 500) errors.description = 'Description must be ≤ 500 characters.';

  return errors;
}

// ---------------------------------------------------------------------------
// SessionCreatorModal — public component
// ---------------------------------------------------------------------------

interface SessionCreatorModalProps {
  workspaceId: string;
}

export function SessionCreatorModal({ workspaceId }: SessionCreatorModalProps) {
  const { isSessionCreatorOpen, closeSessionCreator, selectedDate } = useStudyPlanStore();
  const createSession = useCreateStudySession(workspaceId);

  const defaultDate = selectedDate ?? todayDateStr();

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: 'reading',
    date: defaultDate,
    startTime: '09:00',
    endTime: '10:00',
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
      description: '',
      category: 'reading',
      date: defaultDate,
      startTime: '09:00',
      endTime: '10:00',
    });
    setErrors({});
    setSubmitError(null);
    closeSessionCreator();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const startISO = toISODateTime(form.date, form.startTime);
    const endISO = toISODateTime(form.date, form.endTime);

    const [startH, startM] = form.startTime.split(':').map(Number);
    const [endH, endM] = form.endTime.split(':').map(Number);
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM);

    const payload: CreateStudySessionPayload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      startTime: startISO,
      endTime: endISO,
      isRecurring: false,
    };

    // Zod schema parse (throws on invalid, but we already validated above)
    const parsed = createStudySessionSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? 'Validation error.');
      return;
    }

    setSubmitError(null);
    createSession.mutate(payload, {
      onSuccess: () => handleClose(),
      onError: (err: Error) => setSubmitError(err.message),
    });
  }

  return (
    <AnimatePresence>
      {isSessionCreatorOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="session-backdrop"
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
            key="session-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-creator-title"
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
                  <PlusCircle size={16} />
                </div>
                <h2 id="session-creator-title" className={styles.title}>
                  Add Study Session
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
                <label htmlFor="session-title" className={styles.label}>
                  Session Title <span aria-hidden="true">*</span>
                </label>
                <Input
                  id="session-title"
                  placeholder="e.g. Chapter 4 Reading"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'session-title-err' : undefined}
                />
                {errors.title && (
                  <p id="session-title-err" className={styles.fieldError}>
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Date + Time row */}
              <div className={styles.timeRow}>
                <div className={styles.field}>
                  <label htmlFor="session-date" className={styles.label}>
                    Date <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="session-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setField('date', e.target.value)}
                    aria-invalid={Boolean(errors.date)}
                  />
                  {errors.date && <p className={styles.fieldError}>{errors.date}</p>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="session-start" className={styles.label}>
                    Start Time <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="session-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setField('startTime', e.target.value)}
                    aria-invalid={Boolean(errors.startTime)}
                  />
                  {errors.startTime && <p className={styles.fieldError}>{errors.startTime}</p>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="session-end" className={styles.label}>
                    End Time <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    id="session-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setField('endTime', e.target.value)}
                    aria-invalid={Boolean(errors.endTime)}
                  />
                  {errors.endTime && <p className={styles.fieldError}>{errors.endTime}</p>}
                </div>
              </div>

              {/* Category */}
              <div className={styles.field}>
                <p className={styles.label} id="session-category-label">
                  Category
                </p>
                <div
                  className={styles.categoryRow}
                  role="group"
                  aria-labelledby="session-category-label"
                >
                  {CATEGORIES.map(([cat, cfg]) => (
                    <CategoryPill
                      key={cat}
                      category={cat}
                      label={cfg.label}
                      color={cfg.color}
                      bgColor={cfg.bgColor}
                      selected={form.category === cat}
                      onSelect={(c) => setField('category', c)}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className={styles.field}>
                <label htmlFor="session-desc" className={styles.label}>
                  Description <span className={styles.optional}>(optional)</span>
                </label>
                <Textarea
                  id="session-desc"
                  placeholder="What will you cover in this session?"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={3}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? 'session-desc-err' : undefined}
                />
                {errors.description && (
                  <p id="session-desc-err" className={styles.fieldError}>
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Submission error */}
              {submitError && (
                <p className={styles.submitError} role="alert">
                  {submitError}
                </p>
              )}

              {/* Footer actions */}
              <div className={styles.footer}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  disabled={createSession.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createSession.isPending}
                  leftIcon={
                    createSession.isPending ? (
                      <Loader2 size={14} className={styles.spinner} />
                    ) : (
                      <PlusCircle size={14} />
                    )
                  }
                >
                  {createSession.isPending ? 'Saving…' : 'Add Session'}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
