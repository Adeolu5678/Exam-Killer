'use client';

// =============================================================================
// widgets/CommandPalette/CommandPalette.tsx
// Layer: widgets → CommandPalette
// Global ⌘K command palette powered by cmdk, glassmorphism dark-mode surface.
//
// FSD imports:
//   @/shared/ui          — Spinner, Avatar
//   @/features/workspace — useWorkspaces, useWorkspaceStore
//   ./uiStore            — useAppShellStore (same widget layer)
// =============================================================================

import React, { useEffect, useCallback } from 'react';

import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';

import { useAppShellStore } from '@/shared/stores/ui-store';

import { useWorkspaces, useWorkspaceStore } from '@/features/workspace';

import styles from './CommandPalette.module.css';
import { useCommandPaletteCommands, type CommandGroup } from './useCommandPaletteCommands';

// ---------------------------------------------------------------------------
// CommandPaletteInner — rendered only when open (keeps cmdk clean)
// ---------------------------------------------------------------------------

function CommandPaletteInner() {
  const { closeCommandPalette } = useAppShellStore();
  const { openCreator } = useWorkspaceStore();
  const { data: workspacesResponse } = useWorkspaces();

  const groups: CommandGroup[] = useCommandPaletteCommands({
    workspaces: workspacesResponse?.workspaces ?? [],
    onClose: closeCommandPalette,
    onCreateWorkspace: openCreator,
  });

  // Close on Escape (cmdk handles this natively but we also close via store)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') closeCommandPalette();
    },
    [closeCommandPalette],
  );

  return (
    // Backdrop — clicking outside closes
    <div className={styles.backdrop} role="presentation" onClick={closeCommandPalette}>
      {/* Dialog surface — stop propagation so inner clicks don't close */}
      <motion.div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{
          duration: 0.18,
          ease: [0.34, 1.56, 0.64, 1],
        }}
      >
        <Command label="Command palette" onKeyDown={handleKeyDown} loop>
          {/* ── Search input ────────────────────────────────────────────── */}
          <div className={styles.inputRow}>
            <Search size={16} aria-hidden="true" className={styles.searchIcon} />
            <Command.Input
              className={styles.input}
              placeholder="Search commands, workspaces, and actions…"
              autoFocus
            />
            <div className={styles.kbdHint} aria-hidden="true">
              <kbd className={styles.kbd}>Esc</kbd>
            </div>
          </div>

          {/* ── Command list ─────────────────────────────────────────────── */}
          <Command.List className={styles.list}>
            <Command.Empty className={styles.empty}>No results found.</Command.Empty>

            {groups.map((group, gi) => (
              <React.Fragment key={group.heading}>
                {gi > 0 && <div className={styles.groupSeparator} role="separator" />}

                <Command.Group
                  heading={<span className={styles.groupHeading}>{group.heading}</span>}
                >
                  {group.commands.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <Command.Item
                        key={cmd.id}
                        value={`${cmd.label} ${cmd.description ?? ''}`}
                        onSelect={cmd.onSelect}
                        className={styles.item}
                      >
                        <span className={styles.iconWrap} aria-hidden="true">
                          <Icon size={15} />
                        </span>

                        <span className={styles.itemContent}>
                          <span className={styles.itemLabel}>{cmd.label}</span>
                          {cmd.description && (
                            <span className={styles.itemDescription}>{cmd.description}</span>
                          )}
                        </span>

                        {/* Enter hint — shown only when this item is selected */}
                        <span className={styles.itemEnterHint} aria-hidden="true">
                          <kbd className={styles.kbd}>
                            <CornerDownLeft size={10} />
                          </kbd>
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              </React.Fragment>
            ))}
          </Command.List>

          {/* ── Footer hint bar ──────────────────────────────────────────── */}
          <div className={styles.footer} aria-hidden="true">
            <span className={styles.footerHint}>
              <kbd className={styles.kbd}>
                <ArrowUp size={10} />
              </kbd>
              <kbd className={styles.kbd}>
                <ArrowDown size={10} />
              </kbd>
              <span>Navigate</span>
            </span>
            <span className={styles.footerHint}>
              <kbd className={styles.kbd}>
                <CornerDownLeft size={10} />
              </kbd>
              <span>Select</span>
            </span>
            <span className={styles.footerHint}>
              <kbd className={styles.kbd}>Esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </Command>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommandPalette — public component with global keydown listener
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const { isCommandPaletteOpen, toggleCommandPalette, closeCommandPalette } = useAppShellStore();

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    function listener(e: KeyboardEvent) {
      const isMac = navigator.platform.startsWith('Mac');
      const trigger =
        (isMac && e.metaKey && e.key === 'k') || (!isMac && e.ctrlKey && e.key === 'k');

      if (trigger) {
        e.preventDefault();
        toggleCommandPalette();
      }
    }

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [toggleCommandPalette]);

  // Lock body scroll while palette is open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCommandPaletteOpen]);

  return <AnimatePresence>{isCommandPaletteOpen && <CommandPaletteInner />}</AnimatePresence>;
}
