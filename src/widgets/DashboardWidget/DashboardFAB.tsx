'use client';

// =============================================================================
// widgets/DashboardWidget/DashboardFAB.tsx
// Layer: widgets → DashboardWidget
// Floating Action Button — opens the WorkspaceCreator dialog.
// Blueprint §2.6: "Quick Actions FAB → New Workspace or Continue last session"
// =============================================================================

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';

import { useWorkspaces, useWorkspaceStore } from '@/features/workspace';

// ---------------------------------------------------------------------------
// FAB action item (expanded menu)
// ---------------------------------------------------------------------------

interface FABActionProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  index: number;
}

function FABAction({ label, icon, onClick, index }: FABActionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.9 }}
      transition={{ delay: index * 0.05, duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
      className="flex items-center justify-end gap-3"
    >
      {/* Label */}
      <span className="max-w-[140px] truncate whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)] shadow-[var(--shadow-md)] sm:max-w-none">
        {label}
      </span>

      {/* Icon button */}
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] shadow-[var(--shadow-md)] transition-all duration-[var(--duration-base)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      >
        {icon}
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// DashboardFAB
// ---------------------------------------------------------------------------

export function DashboardFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const openCreator = useWorkspaceStore((s) => s.openCreator);
  const router = useRouter();
  const { data: workspaces } = useWorkspaces();

  function handleNewWorkspace() {
    setIsExpanded(false);
    openCreator();
  }

  function handleContinue() {
    setIsExpanded(false);
    // Navigate to the most-recently-updated workspace's study-plan sub-route.
    // WorkspacesResponse shape: { workspaces: WorkspaceListItem[], ... }
    // The server returns workspaces sorted by updatedAt desc, so [0] is always
    // the most recently active workspace.
    const recent = workspaces?.workspaces?.[0];
    if (recent) {
      router.push(`/dashboard/workspace/${recent.id}/study-plan`);
    } else {
      router.push('/dashboard/workspaces');
    }
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-3"
      role="complementary"
      aria-label="Quick actions"
    >
      {/* Expanded action items */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <FABAction
              label="New Workspace"
              icon={<BookOpen size={18} />}
              onClick={handleNewWorkspace}
              index={1}
            />
            <FABAction
              label="Continue Last Session"
              icon={<ArrowRight size={18} />}
              onClick={handleContinue}
              index={0}
            />
          </>
        )}
      </AnimatePresence>

      {/* Primary FAB button */}
      <motion.button
        type="button"
        aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[0_4px_24px_var(--color-primary-glow),0_2px_8px_rgba(0,0,0,0.4)] transition-[background-color,box-shadow] duration-[var(--duration-base)] hover:bg-[var(--color-primary-hover)] hover:shadow-[0_6px_32px_var(--color-primary-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-base)]"
      >
        <Plus size={22} aria-hidden="true" />
      </motion.button>
    </div>
  );
}
