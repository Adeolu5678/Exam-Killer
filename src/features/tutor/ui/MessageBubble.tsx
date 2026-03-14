'use client';

// =============================================================================
// features/tutor/ui/MessageBubble.tsx
// Layer: features → tutor → ui
// Purpose: Renders a single chat message.
//          - User messages: right-aligned, primary-blue bubble
//          - Assistant messages: left-aligned, surface bubble with personality
//            avatar, streaming cursor while isStreaming=true, citation chips
// =============================================================================

import React, { useCallback } from 'react';

import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

import { TUTOR_PERSONALITIES, PERSONALITY_THEMES } from '../model/types';
import type { ChatMessage, TutorPersonalityId } from '../model/types';

interface MessageBubbleProps {
  message: ChatMessage;
  personalityId: TutorPersonalityId;
  onCitationClick?: (sourceId: string) => void;
}

export function MessageBubble({ message, personalityId, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const theme = PERSONALITY_THEMES[personalityId];
  const personality = TUTOR_PERSONALITIES.find((p) => p.id === personalityId);

  const handleCitationClick = useCallback(
    (sourceId: string) => {
      onCitationClick?.(sourceId);
    },
    [onCitationClick],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      style={{
        ...styles.row,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Assistant avatar — left side */}
      {!isUser && (
        <div
          style={{
            ...styles.avatar,
            background: theme.gradient,
          }}
          aria-label={`${personality?.label ?? 'AI'} avatar`}
        >
          <span style={styles.avatarEmoji}>{personality?.emoji ?? '🤖'}</span>
        </div>
      )}

      {/* Bubble container */}
      <div
        style={{
          ...styles.bubbleWrapper,
          maxWidth: isUser ? '72%' : '78%',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Personality label (assistant only) */}
        {!isUser && <span style={styles.senderLabel}>{personality?.label ?? 'AI Tutor'}</span>}

        {/* Text bubble */}
        <div style={isUser ? styles.userBubble : styles.assistantBubble}>
          {/* Content with streaming cursor */}
          <p style={styles.content}>
            {message.content}
            {message.isStreaming && (
              <span style={styles.streamCursor} aria-hidden="true">
                ▋
              </span>
            )}
          </p>
        </div>

        {/* Citation chips */}
        {message.citations && message.citations.length > 0 && (
          <div style={styles.citations} role="list" aria-label="Source citations">
            {message.citations.map((citation) => (
              <button
                key={citation.sourceId}
                role="listitem"
                onClick={() => handleCitationClick(citation.sourceId)}
                style={styles.citationChip}
                title={`Open source: ${citation.filename}`}
              >
                <FileText size={12} style={{ flexShrink: 0 }} aria-hidden="true" />
                <span style={styles.citationLabel}>{citation.filename}</span>
                {citation.page !== undefined && (
                  <span style={styles.citationPage}>p.{citation.page}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <time dateTime={message.createdAt} style={styles.timestamp}>
          {formatTime(message.createdAt)}
        </time>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stream-aware skeleton (shown during loading state before messages load)
// ---------------------------------------------------------------------------

export function MessageBubbleSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      style={{
        ...styles.row,
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      {!isUser && <div style={{ ...styles.avatar, background: 'var(--color-bg-surface)' }} />}
      <div
        style={{
          width: isUser ? '55%' : '65%',
          height: '64px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-elevated)',
        }}
        className="shimmer"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const styles = {
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 'var(--space-2)',
    width: '100%',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: '16px',
    lineHeight: 1,
  },
  bubbleWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-1)',
  },
  senderLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    fontWeight: 'var(--font-weight-medium)',
    marginLeft: 'var(--space-1)',
  },
  userBubble: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)',
    background: 'linear-gradient(135deg, var(--color-primary) 0%, #6366F1 100%)',
    color: '#fff',
  },
  assistantBubble: {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  content: {
    fontSize: 'var(--font-size-base)',
    lineHeight: 'var(--line-height-relaxed)',
    color: 'inherit',
    maxWidth: 'none',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  streamCursor: {
    display: 'inline-block',
    animation: 'blink 1s step-end infinite',
    marginLeft: '2px',
    fontSize: '1em',
    verticalAlign: 'text-bottom',
  },
  citations: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--space-1)',
    marginTop: 'var(--space-1)',
  },
  citationChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px 3px 8px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-primary-muted)',
    border: '1px solid var(--color-border-accent)',
    color: 'var(--color-primary)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition:
      'background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
    outline: 'none',
  },
  citationLabel: {
    maxWidth: '140px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  citationPage: {
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
  },
  timestamp: {
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    marginLeft: 'var(--space-1)',
  },
} as const;
