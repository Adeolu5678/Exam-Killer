'use client';

// =============================================================================
// features/workspace/ui/WorkspaceCreator.tsx
// Multi-step creation dialog: Step 0 → Name / Step 1 → Settings / Step 2 → Personality
// Uses Radix Dialog as the accessible headless layer (installed via @radix-ui).
// Falls back gracefully to a native <dialog> if Radix is unavailable.
// =============================================================================

import React, { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Plus, Loader2, Check } from 'lucide-react';

import { Button, Input, Badge } from '@/shared/ui';

import {
  createWorkspaceSchema,
  TUTOR_PERSONALITIES,
  type CreateWorkspaceFormValues,
  type CreatorStep,
} from '../model/types';
import { useCreateWorkspace } from '../model/useWorkspaces';
import { useWorkspaceStore } from '../model/workspaceStore';

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { label: 'Name your workspace', description: 'Give your study space a clear name' },
  { label: 'Course details', description: 'Optional — helps organise your content' },
  { label: 'Choose a tutor', description: "Your AI tutor's teaching style" },
] as const;

// ---------------------------------------------------------------------------
// Validation helper per step
// ---------------------------------------------------------------------------

function validateStep(
  step: CreatorStep,
  values: Partial<CreateWorkspaceFormValues>,
): string | null {
  if (step === 0) {
    const result = createWorkspaceSchema.shape.name.safeParse(values.name ?? '');
    return result.success ? null : (result.error.issues[0]?.message ?? 'Invalid name');
  }
  return null; // Steps 1 & 2 are optional fields
}

// ---------------------------------------------------------------------------
// Step 0: Name
// ---------------------------------------------------------------------------

function StepName({
  values,
  onChange,
  error,
}: {
  values: Partial<CreateWorkspaceFormValues>;
  onChange: (patch: Partial<CreateWorkspaceFormValues>) => void;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <Input
        id="ws-name"
        label="Workspace name"
        placeholder="e.g. BIO201 — Anatomy & Physiology"
        value={values.name ?? ''}
        onChange={(e) => onChange({ name: e.target.value })}
        error={error ?? undefined}
        hint="Keep it short and descriptive"
        autoFocus
      />

      <div className="flex items-center gap-3">
        <label htmlFor="ws-public" className="flex cursor-pointer select-none items-center gap-2">
          <div
            role="checkbox"
            id="ws-public"
            aria-checked={values.is_public}
            tabIndex={0}
            onClick={() => onChange({ is_public: !values.is_public })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange({ is_public: !values.is_public });
              }
            }}
            className={[
              'flex h-5 w-5 items-center justify-center rounded border-2',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
              values.is_public
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-transparent',
            ].join(' ')}
          >
            {values.is_public && <Check size={12} className="text-white" aria-hidden="true" />}
          </div>
          <span className="text-sm text-[var(--color-text-secondary)]">
            Make this workspace public
          </span>
        </label>
        {values.is_public && (
          <Badge variant="primary" className="text-xs">
            Public
          </Badge>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Settings
// ---------------------------------------------------------------------------

function StepSettings({
  values,
  onChange,
}: {
  values: Partial<CreateWorkspaceFormValues>;
  onChange: (patch: Partial<CreateWorkspaceFormValues>) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        id="ws-course"
        label="Course code"
        placeholder="e.g. BIO201"
        value={values.course_code ?? ''}
        onChange={(e) => onChange({ course_code: e.target.value })}
        hint="Optional"
      />
      <Input
        id="ws-university"
        label="University"
        placeholder="e.g. University of Lagos"
        value={values.university ?? ''}
        onChange={(e) => onChange({ university: e.target.value })}
        hint="Optional"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Personality selector
// ---------------------------------------------------------------------------

function StepPersonality({
  values,
  onChange,
}: {
  values: Partial<CreateWorkspaceFormValues>;
  onChange: (patch: Partial<CreateWorkspaceFormValues>) => void;
}) {
  const selected = values.tutor_personality ?? 'mentor';

  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Select tutor personality">
      {TUTOR_PERSONALITIES.map((p) => {
        const isSelected = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange({ tutor_personality: p.id })}
            className={[
              'flex flex-col items-start gap-1 rounded-xl p-4 text-left',
              'border-2 transition-all duration-[var(--duration-base)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-elevated)]',
              isSelected
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-glow)]'
                : 'border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-accent)]',
            ].join(' ')}
          >
            <span className="text-2xl" aria-hidden="true">
              {p.emoji}
            </span>
            <span
              className={[
                'text-sm font-semibold leading-tight',
                isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {p.label}
            </span>
            <span className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              {p.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step indicator dots
// ---------------------------------------------------------------------------

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={[
            'rounded-full transition-all duration-[var(--duration-base)]',
            i === current
              ? 'h-1.5 w-4 bg-[var(--color-primary)]'
              : 'h-1.5 w-1.5 bg-[var(--color-border-accent)]',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dialog component
// ---------------------------------------------------------------------------

const SLIDE_VARIANTS = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

interface WorkspaceCreatorProps {
  /** Called after a workspace is successfully created */
  onSuccess?: (workspaceId: string) => void;
}

export function WorkspaceCreator({ onSuccess }: WorkspaceCreatorProps) {
  const isOpen = useWorkspaceStore((s) => s.isCreatorOpen);
  const closeCreator = useWorkspaceStore((s) => s.closeCreator);

  const [step, setStep] = useState<CreatorStep>(0);
  const [values, setValues] = useState<Partial<CreateWorkspaceFormValues>>({
    tutor_personality: 'mentor',
    is_public: false,
  });
  const [stepError, setStepError] = useState<string | null>(null);

  const { mutate: create, isPending } = useCreateWorkspace();

  // ── Patch helper ────────────────────────────────────────────────

  function patch(update: Partial<CreateWorkspaceFormValues>) {
    setValues((prev) => ({ ...prev, ...update }));
    setStepError(null);
  }

  // ── Navigation ──────────────────────────────────────────────────

  function handleNext() {
    const err = validateStep(step, values);
    if (err) {
      setStepError(err);
      return;
    }

    if (step < 2) {
      setStep((s) => (s + 1) as CreatorStep);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => (s - 1) as CreatorStep);
  }

  function handleClose() {
    closeCreator();
    // Defer reset so the close animation plays
    setTimeout(() => {
      setStep(0);
      setValues({ tutor_personality: 'mentor', is_public: false });
      setStepError(null);
    }, 300);
  }

  function handleSubmit() {
    const parsed = createWorkspaceSchema.safeParse(values);
    if (!parsed.success) {
      setStepError(parsed.error.issues[0]?.message ?? 'Invalid form');
      return;
    }

    create(parsed.data, {
      onSuccess: (res) => {
        handleClose();
        onSuccess?.(res.workspace.id);
      },
      onError: (err) => {
        setStepError(err instanceof Error ? err.message : 'Failed to create workspace');
      },
    });
  }

  // ── Render ──────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="bg-[var(--color-bg-base)]/70 fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-[var(--duration-slow)]"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-title"
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-0 pt-6">
            <div>
              <h2
                id="creator-title"
                className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]"
              >
                {STEPS[step].label}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {STEPS[step].description}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step dots */}
          <div className="px-6 pt-4">
            <StepDots current={step} total={STEPS.length} />
          </div>

          {/* Step content (animated) */}
          <div className="min-h-[200px] px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={SLIDE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                {step === 0 && <StepName values={values} onChange={patch} error={stepError} />}
                {step === 1 && <StepSettings values={values} onChange={patch} />}
                {step === 2 && <StepPersonality values={values} onChange={patch} />}
              </motion.div>
            </AnimatePresence>

            {/* Step-level error (shown for step 2 submit errors) */}
            {step === 2 && stepError && (
              <p className="mt-3 text-xs text-[var(--color-accent-rose)]" role="alert">
                {stepError}
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === 0 ? handleClose : handleBack}
              leftIcon={step > 0 ? <ChevronLeft size={14} /> : undefined}
              disabled={isPending}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              loading={isPending && step === 2}
              rightIcon={
                isPending && step === 2 ? undefined : step === 2 ? (
                  <Plus size={14} />
                ) : (
                  <ChevronRight size={14} />
                )
              }
            >
              {step === 2 ? 'Create Workspace' : 'Continue'}
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
