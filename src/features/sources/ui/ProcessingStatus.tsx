'use client';
// =============================================================================
// features/sources/ui/ProcessingStatus.tsx
// Layer: features → sources → ui
// Purpose: Visual indicator for the backend document processing pipeline.
//          Shows a stepped pipeline: Uploading → Extracting → Embedding → Ready
//          with colour-coded badge and animated active dot.
// Imports: @/shared/ui ONLY — no feature cross-imports.
// =============================================================================

import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import styles from './ProcessingStatus.module.css';
import { PROCESSING_STAGE_LABELS, type ProcessingStage } from '../model/types';

// ---------------------------------------------------------------------------
// Pipeline step definitions
// ---------------------------------------------------------------------------

const PIPELINE_STEPS: { stage: ProcessingStage; label: string }[] = [
  { stage: 'uploading', label: 'Upload' },
  { stage: 'extracting', label: 'Extract' },
  { stage: 'embedding', label: 'Embed' },
  { stage: 'ready', label: 'Ready' },
];

const STAGE_ORDER: Record<ProcessingStage, number> = {
  uploading: 0,
  extracting: 1,
  embedding: 2,
  ready: 3,
  failed: -1,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProcessingStatusProps {
  stage: ProcessingStage;
  /** If true, shows only the compact badge (no pipeline steps) */
  compact?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProcessingStatus({ stage, compact = false, className }: ProcessingStatusProps) {
  const currentOrder = STAGE_ORDER[stage];
  const isFailed = stage === 'failed';

  const badgeClass = [styles.badge, styles[stage]].join(' ');

  // Compact mode — badge only
  if (compact) {
    return (
      <span className={[badgeClass, className].filter(Boolean).join(' ')}>
        {stage === 'ready' && <CheckCircle2 size={10} />}
        {stage === 'failed' && <AlertCircle size={10} />}
        {!['ready', 'failed'].includes(stage) && <Loader2 size={10} className={styles.spin} />}
        {PROCESSING_STAGE_LABELS[stage]}
      </span>
    );
  }

  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      {/* Badge */}
      <span className={badgeClass}>
        {stage === 'ready' && <CheckCircle2 size={11} />}
        {stage === 'failed' && <AlertCircle size={11} />}
        {!['ready', 'failed'].includes(stage) && <Loader2 size={11} className={styles.spin} />}
        {PROCESSING_STAGE_LABELS[stage]}
      </span>

      {/* Pipeline steps — hidden when failed */}
      {!isFailed && (
        <div className={styles.pipeline} role="list" aria-label="Processing pipeline">
          {PIPELINE_STEPS.map((step, idx) => {
            const stepOrder = STAGE_ORDER[step.stage];
            const isDone = stepOrder < currentOrder;
            const isActive = stepOrder === currentOrder;
            const stepClass = [
              styles.step,
              isDone ? styles.done : '',
              isActive ? styles.active : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={step.stage} className={stepClass} role="listitem">
                <div
                  className={styles.stepDot}
                  aria-label={`${step.label}: ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}
                />
                {/* Connector between steps */}
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={[styles.connector, isDone ? styles.connectorDone : '']
                      .filter(Boolean)
                      .join(' ')}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
