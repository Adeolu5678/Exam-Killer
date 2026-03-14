// =============================================================================
// features/sources/model/types.ts
// Layer: features → sources → model
// Purpose: Domain types, Zod schemas, and pure helper functions for sources.
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

/**
 * Mirrors the backend SourceListItem shape from the existing API contract.
 * NOTE: We define this locally to remain FSD-compliant (no @/types/api import).
 */
export interface SourceItem {
  id: string;
  workspace_id: string;
  user_id: string;
  /** "pdf" | "image" | "text" */
  type: string;
  file_url: string;
  file_name: string;
  file_size_bytes: number;
  processed: boolean;
  chunk_count: number;
  /**
   * Backend embedding pipeline stage. Used to derive ProcessingStage below.
   * Known values: "pending" | "processing" | "completed" | "failed"
   */
  embedding_status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Processing pipeline stages (derived from embedding_status)
// ---------------------------------------------------------------------------

/**
 * The four UI states reflecting the backend document pipeline.
 * Maps to the animated steps rendered by ProcessingStatus.tsx.
 */
export type ProcessingStage =
  | 'uploading' // XHR in-flight
  | 'extracting' // embedding_status === "processing", !processed
  | 'embedding' // embedding_status === "processing", near completion
  | 'ready' // processed === true && embedding_status === "completed"
  | 'failed'; // embedding_status === "failed"

/**
 * Derives the UI–visible processing stage from a SourceItem's server state.
 */
export function getProcessingStage(source: SourceItem): ProcessingStage {
  if (source.embedding_status === 'failed') return 'failed';
  if (source.processed && source.embedding_status === 'completed') return 'ready';
  if (source.embedding_status === 'processing' && source.chunk_count > 0) return 'embedding';
  if (source.embedding_status === 'processing') return 'extracting';
  return 'extracting';
}

/**
 * Returns a human-readable label for each pipeline stage.
 */
export const PROCESSING_STAGE_LABELS: Record<ProcessingStage, string> = {
  uploading: 'Uploading…',
  extracting: 'Extracting Text…',
  embedding: 'Generating Embeddings…',
  ready: 'Ready',
  failed: 'Failed',
};

/**
 * Returns the accent colour token for each pipeline stage.
 */
export const PROCESSING_STAGE_COLORS: Record<ProcessingStage, string> = {
  uploading: 'var(--color-primary)',
  extracting: 'var(--color-accent-amber)',
  embedding: 'var(--color-accent-violet)',
  ready: 'var(--color-accent-emerald)',
  failed: 'var(--color-accent-rose)',
};

// ---------------------------------------------------------------------------
// Upload progress shape (used by XHR progress callback)
// ---------------------------------------------------------------------------

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

// ---------------------------------------------------------------------------
// Upload queue entry (ephemeral client state for pending uploads)
// ---------------------------------------------------------------------------

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadQueueEntry {
  /** Temporary client-side ID (nanoid) */
  id: string;
  file: File;
  status: UploadStatus;
  progress: UploadProgress;
  /** Populated once upload succeeds */
  sourceId?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Zod Schemas (used by future form validation)
// ---------------------------------------------------------------------------

/** Accepted MIME types for the upload zone. */
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
] as const;

export const uploadFileSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (f) => ACCEPTED_FILE_TYPES.includes(f.type as (typeof ACCEPTED_FILE_TYPES)[number]),
      'Only PDF, images (PNG/JPEG/WebP), and plain-text files are accepted.',
    )
    .refine((f) => f.size <= 50 * 1024 * 1024, 'File must be ≤ 50 MB.'),
});

// ---------------------------------------------------------------------------
// Source file icon helpers
// ---------------------------------------------------------------------------

/** Maps a source type string to an icon name from lucide-react */
export function getSourceIconName(type: string): 'file-text' | 'image' | 'file' {
  if (type === 'pdf') return 'file-text';
  if (type === 'image') return 'image';
  return 'file';
}

/** Formats bytes into a human-readable string (KB / MB) */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
