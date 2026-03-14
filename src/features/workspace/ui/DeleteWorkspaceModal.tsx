'use client';

import React from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/shared/ui';

import { useDeleteWorkspace, useWorkspaces } from '../model/useWorkspaces';
import { useWorkspaceStore } from '../model/workspaceStore';

export function DeleteWorkspaceModal() {
  const pendingId = useWorkspaceStore((s) => s.pendingDeleteId);
  const setPendingDelete = useWorkspaceStore((s) => s.setPendingDelete);

  const { data } = useWorkspaces();
  const workspace = data?.workspaces.find((w) => w.id === pendingId);

  const { mutate: deleteWs, isPending } = useDeleteWorkspace();

  function handleClose() {
    setPendingDelete(null);
  }

  function handleConfirm() {
    if (!pendingId) return;
    deleteWs(pendingId, {
      onSuccess: () => {
        handleClose();
      },
    });
  }

  if (!pendingId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="bg-[var(--color-bg-base)]/80 absolute inset-0 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="border-[var(--color-accent-rose)]/20 relative w-full max-w-sm overflow-hidden rounded-2xl border bg-[var(--color-bg-elevated)] p-6 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-[rgba(244,63,94,0.1)] p-3 text-[var(--color-accent-rose)]">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                Delete Workspace
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {workspace?.name ?? 'this workspace'}
                </span>
                ? This will permanently remove all sources, flashcards, and tutor history.
              </p>
            </div>

            <div className="mt-2 flex w-full gap-3">
              <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 border-none bg-[var(--color-accent-rose)] hover:bg-[var(--color-accent-rose-hover)]"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
