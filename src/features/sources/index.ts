// =============================================================================
// features/sources/index.ts  —  PUBLIC API
// Layer: features → sources
// Rule: Consumers may ONLY import from this file.
//   ✅  import { SourceList, useSources } from '@/features/sources'
//   ❌  import { SourceCard } from '@/features/sources/ui/SourceCard'
// =============================================================================

// ── UI components ──────────────────────────────────────────────────────────
export { UploadZone } from './ui/UploadZone';
export { SourceCard } from './ui/SourceCard';
export { ProcessingStatus } from './ui/ProcessingStatus';
export { SourceList } from './ui/SourceList';
export { SourceCardSkeleton, SourceListSkeleton } from './ui/SourceCardSkeleton';

// ── TanStack Query hooks ────────────────────────────────────────────────────
export {
  useSources,
  useUploadSource,
  useDeleteSource,
  useProcessSource,
  sourceKeys,
} from './model/useSources';

// ── Zustand store (ephemeral UI state) ──────────────────────────────────────
export { useSourcesStore } from './model/sourcesStore';

// ── Types (re-exported for FSD consumers) ──────────────────────────────────
export type {
  SourceItem,
  ProcessingStage,
  UploadProgress,
  UploadQueueEntry,
  UploadStatus,
} from './model/types';
export {
  getProcessingStage,
  getSourceIconName,
  formatFileSize,
  PROCESSING_STAGE_LABELS,
  PROCESSING_STAGE_COLORS,
  ACCEPTED_FILE_TYPES,
  uploadFileSchema,
} from './model/types';

// ── API functions (for advanced consumers, e.g. server components) ──────────
export { fetchSources, uploadSource, deleteSource, processSource } from './api/sourcesApi';
export type {
  SourcesListResponse,
  UploadSourceResponse,
  DeleteSourceResponse,
  ProcessSourceResponse,
} from './api/sourcesApi';
