'use client';

import React, { useState } from 'react';

import { motion } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';

import { Button, Input, Textarea } from '@/shared/ui';

import { useFlashcardsStore } from '../model/flashcardsStore';
import { createFlashcardSchema } from '../model/types';
import { useCreateFlashcard } from '../model/useFlashcards';

interface FlashcardCreatorProps {
  workspaceId: string;
}

export function FlashcardCreator({ workspaceId }: FlashcardCreatorProps) {
  const { isCreatorOpen, closeCreator } = useFlashcardsStore();
  const { mutate: create, isPending } = useCreateFlashcard(workspaceId);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    closeCreator();
    // Reset state after animation
    setTimeout(() => {
      setFront('');
      setBack('');
      setTags('');
      setError(null);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const result = createFlashcardSchema.safeParse({ front, back, tags: tagList });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid card data');
      return;
    }

    create(result.data, {
      onSuccess: () => {
        handleClose();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to create flashcard');
      },
    });
  };

  if (!isCreatorOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="bg-[var(--color-bg-base)]/70 fixed inset-0 z-40 backdrop-blur-sm"
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
          className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border-accent)] bg-[var(--color-bg-elevated)] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 pb-4 pt-6">
            <div>
              <h2
                id="creator-title"
                className="text-lg font-semibold text-[var(--color-text-primary)]"
              >
                Create Flashcard
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                Add a new card to your deck for active recall.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <form id="flashcard-form" onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <Textarea
              id="fc-front"
              label="Front (Question/Term)"
              placeholder="What is active recall?"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={3}
              autoFocus
              required
            />

            <Textarea
              id="fc-back"
              label="Back (Answer/Definition)"
              placeholder="A principle of efficient learning that involves actively stimulating memory."
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={3}
              required
            />

            <Input
              id="fc-tags"
              label="Tags (Optional)"
              placeholder="psychology, learning, space-repetition"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              hint="Separate tags with commas"
            />

            {error && (
              <p className="text-xs font-medium text-[var(--color-accent-rose)]" role="alert">
                {error}
              </p>
            )}
          </form>

          {/* Footer */}
          <div className="bg-[var(--color-bg-surface)]/50 flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="flashcard-form"
              variant="primary"
              size="sm"
              loading={isPending}
              leftIcon={<Plus size={14} />}
            >
              Add Card
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
