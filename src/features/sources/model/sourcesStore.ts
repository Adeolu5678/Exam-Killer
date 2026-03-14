// =============================================================================
// features/sources/model/sourcesStore.ts
// Layer: features → sources → model
// Purpose: Zustand (immer) store for ephemeral UI state.
//          Server data lives in TanStack Query — this store is for:
//            - Upload queue (pending/in-progress client uploads)
//            - Drag-and-drop active state
//            - Selected source filter
// =============================================================================

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { UploadQueueEntry, UploadProgress } from './types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface SourcesState {
  /** Files currently being uploaded or queued for upload. */
  uploadQueue: UploadQueueEntry[];

  /** True when a file is being dragged over the UploadZone. */
  isDragActive: boolean;

  /** Currently previewed/selected source ID (for a future detail panel). */
  selectedSourceId: string | null;
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

interface SourcesActions {
  /** Enqueue one or many files for upload (status = 'pending'). */
  enqueueFiles: (entries: UploadQueueEntry[]) => void;

  /** Mark an entry as 'uploading'. */
  startUpload: (id: string) => void;

  /** Update progress for an in-flight upload. */
  updateProgress: (id: string, progress: UploadProgress) => void;

  /** Mark an entry as 'done' and associate a real sourceId. */
  completeUpload: (id: string, sourceId: string) => void;

  /** Mark an entry as 'error'. */
  failUpload: (id: string, error: string) => void;

  /** Remove a completed or failed entry from the queue. */
  removeFromQueue: (id: string) => void;

  /** Clear all done/error entries from the queue. */
  clearFinished: () => void;

  setDragActive: (active: boolean) => void;
  setSelectedSource: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSourcesStore = create<SourcesState & SourcesActions>()(
  immer((set) => ({
    // --- initial state ---
    uploadQueue: [],
    isDragActive: false,
    selectedSourceId: null,

    // --- actions ---
    enqueueFiles: (entries) =>
      set((s) => {
        s.uploadQueue.push(...entries);
      }),

    startUpload: (id) =>
      set((s) => {
        const entry = s.uploadQueue.find((e) => e.id === id);
        if (entry) entry.status = 'uploading';
      }),

    updateProgress: (id, progress) =>
      set((s) => {
        const entry = s.uploadQueue.find((e) => e.id === id);
        if (entry) entry.progress = progress;
      }),

    completeUpload: (id, sourceId) =>
      set((s) => {
        const entry = s.uploadQueue.find((e) => e.id === id);
        if (entry) {
          entry.status = 'done';
          entry.sourceId = sourceId;
          entry.progress = { loaded: 1, total: 1, percent: 100 };
        }
      }),

    failUpload: (id, error) =>
      set((s) => {
        const entry = s.uploadQueue.find((e) => e.id === id);
        if (entry) {
          entry.status = 'error';
          entry.error = error;
        }
      }),

    removeFromQueue: (id) =>
      set((s) => {
        s.uploadQueue = s.uploadQueue.filter((e) => e.id !== id);
      }),

    clearFinished: () =>
      set((s) => {
        s.uploadQueue = s.uploadQueue.filter(
          (e) => e.status === 'pending' || e.status === 'uploading',
        );
      }),

    setDragActive: (active) =>
      set((s) => {
        s.isDragActive = active;
      }),

    setSelectedSource: (id) =>
      set((s) => {
        s.selectedSourceId = id;
      }),
  })),
);
