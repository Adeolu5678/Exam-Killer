'use client';
// =============================================================================
// features/sources/ui/UploadZone.tsx
// Layer: features → sources → ui
// Purpose: Drag-and-drop upload zone with multi-file support, progress tracking,
//          and per-file queue display.
// Imports: @/shared/ui/index.ts ONLY — no feature cross-imports.
// =============================================================================

import { useCallback, useRef } from 'react';

import { UploadCloud, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';

import { Button, Spinner } from '@/shared/ui';

import styles from './UploadZone.module.css';
import { useSourcesStore } from '../model/sourcesStore';
import { ACCEPTED_FILE_TYPES, type UploadStatus } from '../model/types';
import { useUploadSource } from '../model/useSources';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_MIME = ACCEPTED_FILE_TYPES.join(',');
const MAX_SIZE_MB = 50;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UploadZoneProps {
  workspaceId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: UploadStatus) {
  if (status === 'done') return <CheckCircle2 size={16} className={styles.statusDone} />;
  if (status === 'error') return <XCircle size={16} className={styles.statusError} />;
  return <Spinner size="xs" className={styles.statusLoading} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UploadZone({ workspaceId, className }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadQueue, isDragActive, setDragActive, enqueueFiles, removeFromQueue, clearFinished } =
    useSourcesStore();

  const { mutate: upload } = useUploadSource(workspaceId);

  // ---
  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const valid = fileArray.filter((f) => {
        if (f.size > MAX_SIZE_MB * 1024 * 1024) return false;
        return ACCEPTED_FILE_TYPES.includes(f.type as (typeof ACCEPTED_FILE_TYPES)[number]);
      });
      if (!valid.length) return;

      // Pre-enqueue so UI is immediately responsive (actual upload runs via mutate)
      const entries = valid.map((f) => ({
        id: nanoid(),
        file: f,
        status: 'pending' as const,
        progress: { loaded: 0, total: f.size, percent: 0 },
      }));
      enqueueFiles(entries);

      // Upload each file via the mutation (which will re-enqueue internally with XHR)
      valid.forEach((f) => {
        upload(f, {
          onError: (err) => {
            toast.error(
              `Failed to upload ${f.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
            );
          },
          onSuccess: () => {
            toast.success(`Uploaded ${f.name} successfully`);
          },
        });
      });
    },
    [upload, enqueueFiles],
  );

  // --- Drag handlers ---
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(true);
    },
    [setDragActive],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      // Only deactivate when leaving the zone entirely
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragActive(false);
      }
    },
    [setDragActive],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
    },
    [processFiles, setDragActive],
  );

  // --- Click to open file picker ---
  const handleClick = () => inputRef.current?.click();
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const hasQueue = uploadQueue.length > 0;
  const hasFinished = uploadQueue.some((e) => e.status === 'done' || e.status === 'error');

  return (
    <div
      className={[styles.zone, isDragActive ? styles.dragActive : '', className]
        .filter(Boolean)
        .join(' ')}
      role="button"
      tabIndex={0}
      aria-label="Upload documents — click or drag and drop"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME}
        className={styles.input}
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleInputChange}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Drag-active overlay text */}
      <span className={styles.dragLabel} aria-hidden="true">
        Drop to upload
      </span>

      {/* Icon */}
      <div className={styles.iconWrap} aria-hidden="true">
        <UploadCloud size={28} />
      </div>

      {/* Text */}
      <p className={styles.title}>
        <span className={styles.highlight}>Click to upload</span> or drag &amp; drop
      </p>
      <p className={styles.subtitle}>
        PDF, PNG, JPEG, WebP, or plain text · Max {MAX_SIZE_MB} MB per file
      </p>

      {/* Accepted type pills */}
      <div className={styles.acceptedTypes} aria-label="Accepted file types">
        {['PDF', 'PNG', 'JPEG', 'WebP', 'TXT'].map((t) => (
          <span key={t} className={styles.typePill}>
            .{t.toLowerCase()}
          </span>
        ))}
      </div>

      {/* Upload queue */}
      {hasQueue && (
        <div
          className={styles.queue}
          role="list"
          aria-label="Upload queue"
          onClick={(e) => e.stopPropagation()}
        >
          {uploadQueue.map((entry) => (
            <div key={entry.id} className={styles.queueItem} role="listitem">
              {statusIcon(entry.status)}

              <span className={styles.queueFileName} title={entry.file.name}>
                {entry.file.name}
              </span>

              {/* Progress bar (shown while uploading) */}
              {entry.status === 'uploading' && (
                <div className={styles.progressBar} aria-hidden="true">
                  <div
                    className={styles.progressFill}
                    style={{ width: `${entry.progress.percent}%` }}
                  />
                </div>
              )}

              {/* Dismiss button */}
              {(entry.status === 'done' || entry.status === 'error') && (
                <button
                  type="button"
                  aria-label={`Dismiss ${entry.file.name}`}
                  className={styles.deleteBtn}
                  onClick={() => removeFromQueue(entry.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {/* Clear all finished */}
          {hasFinished && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFinished();
              }}
              style={{ alignSelf: 'flex-end' }}
            >
              Clear finished
            </Button>
          )}
        </div>
      )}

      {/* Loading spinner while pending but not yet shown in queue */}
      {uploadQueue.some((e) => e.status === 'uploading') && !hasQueue && (
        <Loader2
          size={18}
          style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }}
        />
      )}
    </div>
  );
}
