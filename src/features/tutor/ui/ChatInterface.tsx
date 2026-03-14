'use client';

// =============================================================================
// features/tutor/ui/ChatInterface.tsx
// Layer: features → tutor → ui
// Purpose: Full-screen chat UI — the primary assembly for the tutor page.
//   ┌──────────────────────────────────────────┬──────────────────┐
//   │  Header: PersonalitySelector             │  [⊞ Sources]     │
//   ├──────────────────────────────────────────┼──────────────────┤
//   │                                          │                  │
//   │  MessageList (scrollable)                │  SourcesPanel    │
//   │                                          │  (collapsible)   │
//   │                                          │                  │
//   ├──────────────────────────────────────────┴──────────────────┤
//   │  InputBar (sticky footer)                                    │
//   └──────────────────────────────────────────────────────────────┘
// =============================================================================

import React, { useCallback, useEffect, useRef, KeyboardEvent } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronRight, ChevronLeft, BookOpen, Sparkles, X, Plus } from 'lucide-react';

import { Button } from '@/shared/ui';

import styles from './ChatInterface.module.css';
import { MessageBubble, MessageBubbleSkeleton } from './MessageBubble';
import { PersonalitySelector } from './PersonalitySelector';
import { useTutorStore } from '../model/tutorStore';
import { useConversation, useSendMessage } from '../model/useTutor';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatInterfaceProps {
  workspaceId: string;
  workspaceName?: string;
  UploadZone: React.ComponentType<{ workspaceId: string }>;
  SourceList: React.ComponentType<{ workspaceId: string }>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatInterface({
  workspaceId,
  workspaceName,
  UploadZone,
  SourceList,
}: ChatInterfaceProps) {
  const {
    isSourcesPanelOpen,
    toggleSourcesPanel,
    inputValue,
    setInputValue,
    isStreaming,
    selectedPersonality,
  } = useTutorStore();

  const { messages, isLoadingHistory, loadHistory, appendMessage, updateMessage } =
    useConversation(workspaceId);

  const { sendMessage } = useSendMessage({
    workspaceId,
    appendMessage,
    updateMessage,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage],
  );

  const handleSend = useCallback(() => {
    void sendMessage();
  }, [sendMessage]);

  const handleCitationClick = useCallback((sourceId: string) => {
    // Open source panel and highlight source
    useTutorStore.getState().setSourcesPanelOpen(true);
    // TODO: scroll to sourceId in the sources panel
    console.info('Citation clicked:', sourceId);
  }, []);

  return (
    <div className={styles.shell}>
      {/* ── Top bar: Personality selector ───────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={16} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          <span className={styles.headerLabel}>Tutor Personality</span>
        </div>
        <PersonalitySelector className={styles.personalityRow} />
        <button
          className={styles.panelToggle}
          onClick={toggleSourcesPanel}
          aria-label={isSourcesPanelOpen ? 'Close sources panel' : 'Open sources panel'}
          title={isSourcesPanelOpen ? 'Hide sources' : 'Show sources'}
        >
          <BookOpen size={16} aria-hidden="true" />
          <span className={styles.panelToggleLabel}>Sources</span>
          {isSourcesPanelOpen ? (
            <ChevronRight size={14} aria-hidden="true" />
          ) : (
            <ChevronLeft size={14} aria-hidden="true" />
          )}
        </button>
      </header>

      {/* ── Content row ─────────────────────────────────────────────── */}
      <div className={styles.content}>
        {/* Message list */}
        <main className={styles.messageArea} role="log" aria-live="polite">
          {/* Empty state */}
          {!isLoadingHistory && messages.length === 0 && (
            <EmptyState personalityId={selectedPersonality} workspaceName={workspaceName} />
          )}

          {/* Loading skeleton */}
          {isLoadingHistory && (
            <>
              <MessageBubbleSkeleton />
              <MessageBubbleSkeleton isUser />
              <MessageBubbleSkeleton />
            </>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              personalityId={selectedPersonality}
              onCitationClick={handleCitationClick}
            />
          ))}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} aria-hidden="true" />
        </main>

        {/* Collapsible sources panel */}
        <AnimatePresence initial={false}>
          {isSourcesPanelOpen && (
            <motion.aside
              key="sources-panel"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={styles.sourcesPanel}
              aria-label="Workspace sources"
            >
              <SourcesPanel
                workspaceId={workspaceId}
                onClose={() => useTutorStore.getState().setSourcesPanelOpen(false)}
                UploadZone={UploadZone}
                SourceList={SourceList}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input bar (sticky footer) ───────────────────────────────── */}
      <footer className={styles.inputBar}>
        <div className={styles.inputWrap}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your study material…"
            rows={1}
            aria-label="Chat message input"
            disabled={isStreaming}
          />
          <Button
            variant="primary"
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            aria-label="Send message"
            className={styles.sendBtn}
          >
            {isStreaming ? (
              <span className={styles.streamDot} aria-hidden="true" />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
          </Button>
        </div>
        <p className={styles.hint}>
          <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline
        </p>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state sub-component
// ---------------------------------------------------------------------------

function EmptyState({
  personalityId,
  workspaceName,
}: {
  personalityId: string;
  workspaceName?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={styles.emptyState}
    >
      {/* Decorative speech bubble SVG */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={styles.emptySvg}
      >
        <circle cx="32" cy="32" r="32" fill="var(--color-primary-muted)" />
        <path
          d="M20 24C20 21.8 21.8 20 24 20H40C42.2 20 44 21.8 44 24V35C44 37.2 42.2 39 40 39H34L28 45V39H24C21.8 39 20 37.2 20 35V24Z"
          fill="var(--color-primary)"
          opacity="0.8"
        />
        <circle cx="26" cy="30" r="2" fill="white" opacity="0.9" />
        <circle cx="32" cy="30" r="2" fill="white" opacity="0.9" />
        <circle cx="38" cy="30" r="2" fill="white" opacity="0.9" />
      </svg>

      <h3 className={styles.emptyTitle}>
        {workspaceName ? `Ask anything about ${workspaceName}` : 'Start a conversation'}
      </h3>
      <p className={styles.emptySubtitle}>
        Your AI tutor is ready. Ask a question, request an explanation, or start studying with one
        of the prompts below.
      </p>

      {/* Suggested prompts */}
      <div className={styles.suggestions}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <SuggestionChip key={prompt} text={prompt} />
        ))}
      </div>
    </motion.div>
  );
}

function SuggestionChip({ text }: { text: string }) {
  const { setInputValue } = useTutorStore();
  return (
    <button className={styles.suggestionChip} onClick={() => setInputValue(text)}>
      {text}
    </button>
  );
}

const SUGGESTED_PROMPTS = [
  'Summarize the key concepts',
  'Quiz me on what I just uploaded',
  'Explain this in simple terms',
  'What are the most likely exam questions?',
];

// ---------------------------------------------------------------------------
// Sources panel sub-component
// ---------------------------------------------------------------------------

function SourcesPanel({
  workspaceId,
  onClose,
  UploadZone,
  SourceList,
}: {
  workspaceId: string;
  onClose: () => void;
  UploadZone: React.ComponentType<{ workspaceId: string }>;
  SourceList: React.ComponentType<{ workspaceId: string }>;
}) {
  const [showUpload, setShowUpload] = React.useState(false);

  return (
    <div className={styles.sourcesPanelInner}>
      <div className={styles.sourcesPanelHeader}>
        <div className="flex flex-1 items-center gap-2">
          <BookOpen size={14} aria-hidden="true" />
          <span className="truncate">Sources</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowUpload(!showUpload)}
            className={styles.actionBtn}
            title={showUpload ? 'Show sources' : 'Add source'}
            aria-label={showUpload ? 'Show sources' : 'Add source'}
          >
            {showUpload ? <BookOpen size={14} /> : <Plus size={16} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={styles.actionBtn}
            aria-label="Close sources"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={styles.sourcesScrollArea}>
        {showUpload ? (
          <div className="p-4">
            <UploadZone workspaceId={workspaceId} />
          </div>
        ) : (
          <div className="p-4">
            <SourceList workspaceId={workspaceId} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lazy-loadable export (for next/dynamic)
// ---------------------------------------------------------------------------

export default ChatInterface;
