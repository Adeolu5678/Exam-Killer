'use client';
// =============================================================================
// features/sources/ui/SourceCard.tsx
// Layer: features → sources → ui
// Purpose: Displays a single source document — file icon, name, size, status badge,
//          delete and reprocess action buttons.
// Imports: @/shared/ui/index.ts ONLY — no feature cross-imports.
// =============================================================================

import { FileText, Image as ImageIcon, File, Trash2, RefreshCw } from 'lucide-react';

import { ProcessingStatus } from './ProcessingStatus';
import styles from './SourceCard.module.css';
import {
  getProcessingStage,
  getSourceIconName,
  formatFileSize,
  type SourceItem,
} from '../model/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SourceCardProps {
  source: SourceItem;
  onDelete?: (id: string) => void;
  onReprocess?: (id: string) => void;
  isDeleting?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-component: file type icon
// ---------------------------------------------------------------------------

function SourceIcon({ type }: { type: string }) {
  const iconName = getSourceIconName(type);
  const typeClass =
    iconName === 'file-text' ? styles.pdf : iconName === 'image' ? styles.image : styles.file;

  if (iconName === 'file-text') {
    return (
      <div className={[styles.iconWrap, typeClass].join(' ')}>
        <FileText size={20} />
      </div>
    );
  }
  if (iconName === 'image') {
    return (
      <div className={[styles.iconWrap, typeClass].join(' ')}>
        <ImageIcon size={20} />
      </div>
    );
  }
  return (
    <div className={[styles.iconWrap, styles.file].join(' ')}>
      <File size={20} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SourceCard({ source, onDelete, onReprocess, isDeleting = false }: SourceCardProps) {
  const stage = getProcessingStage(source);

  const formattedDate = new Date(source.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className={styles.card} aria-label={`Source: ${source.file_name}`}>
      {/* Icon */}
      <SourceIcon type={source.type} />

      {/* Content */}
      <div className={styles.content}>
        <span className={styles.fileName} title={source.file_name}>
          {source.file_name}
        </span>

        {/* Meta row */}
        <div className={styles.meta}>
          <span className={styles.metaItem}>{formatFileSize(source.file_size_bytes)}</span>
          <span className={styles.metaDot} aria-hidden="true" />
          <span className={styles.metaItem}>{source.type.toUpperCase()}</span>

          {source.chunk_count > 0 && (
            <>
              <span className={styles.metaDot} aria-hidden="true" />
              <span className={styles.metaItem}>{source.chunk_count} chunks</span>
            </>
          )}

          <span className={styles.metaDot} aria-hidden="true" />
          <span className={styles.metaItem}>{formattedDate}</span>
        </div>

        {/* Processing status — compact badge */}
        <ProcessingStatus stage={stage} compact />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {/* Reprocess button — shown if failed or unprocessed */}
        {(stage === 'failed' || (!source.processed && stage !== 'ready')) && onReprocess && (
          <button
            type="button"
            className={styles.reprocessBtn}
            aria-label={`Re-process ${source.file_name}`}
            title="Re-process"
            onClick={() => onReprocess(source.id)}
          >
            <RefreshCw size={14} />
          </button>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            type="button"
            className={styles.deleteBtn}
            aria-label={`Delete ${source.file_name}`}
            title="Delete"
            disabled={isDeleting}
            onClick={() => onDelete(source.id)}
            aria-busy={isDeleting}
          >
            {isDeleting ? (
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        )}
      </div>
    </article>
  );
}
