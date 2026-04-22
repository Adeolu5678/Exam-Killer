import { z } from 'zod';

// -----------------------------------------------------------------------------
// Source type classifications
// -----------------------------------------------------------------------------
export const SOURCE_TYPES = ['pdf', 'image', 'text', 'link', 'note'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// -----------------------------------------------------------------------------
// Processing status values (job state machine)
// -----------------------------------------------------------------------------
export const PROCESSING_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export const PROCESSING_STATUS_VALUES = PROCESSING_STATUSES; // Alias for test compatibility
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

// -----------------------------------------------------------------------------
// Source entity (Firestore document shape)
// -----------------------------------------------------------------------------
export interface SourceRecord {
  source_id: string;
  workspace_id: string;
  user_id: string;
  type: SourceType;
  storage_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  processed: boolean;
  chunk_count: number;
  embedding_status: ProcessingStatus;
  processing_error: string | null;
  created_at: Date;
  processed_at: Date | null;
}

// -----------------------------------------------------------------------------
// Allowed upload MIME types and size limits
// -----------------------------------------------------------------------------
// NOTE: Image types removed for MVP - OCR not yet implemented.
// Images will be re-enabled when OCR pipeline is ready (Phase 5+).
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_SIGNED_URL_EXPIRY_MINUTES = 15;
export const MIN_SIGNED_URL_EXPIRY_MINUTES = 1;
export const MAX_SIGNED_URL_EXPIRY_MINUTES = 60;

export function normalizeSignedUrlExpiryMinutes(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SIGNED_URL_EXPIRY_MINUTES;
  }

  const normalized = Math.trunc(value);
  if (normalized < MIN_SIGNED_URL_EXPIRY_MINUTES) {
    return MIN_SIGNED_URL_EXPIRY_MINUTES;
  }

  if (normalized > MAX_SIGNED_URL_EXPIRY_MINUTES) {
    return MAX_SIGNED_URL_EXPIRY_MINUTES;
  }

  return normalized;
}

// -----------------------------------------------------------------------------
// Upload metadata schema (used after file validation)
// -----------------------------------------------------------------------------
export const uploadSourceMetadataSchema = z.object({
  workspace_id: z.string().min(1, 'Workspace ID is required'),
  file_name: z.string().min(1, 'File name is required'),
  file_size_bytes: z.number().positive().max(MAX_FILE_SIZE_BYTES, 'File exceeds 50MB limit'),
  mime_type: z.enum(ALLOWED_MIME_TYPES).describe('MIME type of the uploaded file'),
});

export type UploadSourceMetadata = z.infer<typeof uploadSourceMetadataSchema>;

// -----------------------------------------------------------------------------
// Create source request schema (for test compatibility)
// -----------------------------------------------------------------------------
export const CreateSourceRequestSchema = z.object({
  workspace_id: z.string().min(1, 'Workspace ID is required'),
  filename: z.string().min(1, 'Filename is required'),
  content_type: z.string().min(1, 'Content type is required'),
  size_bytes: z.number().positive('File size must be greater than 0'),
  source_type: z.string().optional(),
});

export type CreateSourceRequest = z.infer<typeof CreateSourceRequestSchema>;

// -----------------------------------------------------------------------------
// Source schema for validation (Zod schema for SourceRecord-like objects)
// -----------------------------------------------------------------------------
export const SourceSchema = z.object({
  id: z.string().min(1),
  workspace_id: z.string().min(1),
  user_id: z.string().min(1),
  filename: z.string().min(1),
  original_filename: z.string().optional(),
  content_type: z.string().min(1),
  size_bytes: z.number().positive(),
  storage_path: z.string().min(1),
  embedding_status: z.enum(PROCESSING_STATUSES),
  processed: z.boolean(),
  created_at: z.string(),
  processed_at: z.string().optional().nullable(),
});

export type Source = z.infer<typeof SourceSchema>;

// -----------------------------------------------------------------------------
// Processing job request schema
// -----------------------------------------------------------------------------
export const processSourceRequestSchema = z.object({
  source_id: z.string().min(1, 'Source ID is required'),
});

export type ProcessSourceRequest = z.infer<typeof processSourceRequestSchema>;

// -----------------------------------------------------------------------------
// API Response types
// -----------------------------------------------------------------------------
export interface SourceSummary {
  id: string;
  workspace_id: string;
  type: SourceType;
  file_name: string;
  file_size_bytes: number;
  processed: boolean;
  chunk_count: number;
  embedding_status: ProcessingStatus;
  processing_error: string | null;
  created_at: string;
}

export interface SourceListResponse {
  sources: SourceSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface UploadSourceResponse {
  source: {
    id: string;
    file_name: string;
    file_size_bytes: number;
    type: SourceType;
    embedding_status: ProcessingStatus;
  };
}

export interface ProcessSourceResponse {
  success: boolean;
  source_id: string;
  chunk_count: number;
  embedding_status: ProcessingStatus;
}

export interface SourceDetailResponse {
  source: SourceSummary;
  signed_url?: string;
}

// -----------------------------------------------------------------------------
// Helper to derive source type from MIME type
// -----------------------------------------------------------------------------
export function deriveSourceType(mimeType: string): SourceType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  return 'text';
}
