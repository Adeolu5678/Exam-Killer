// =============================================================================
// features/tutor/model/useTutor.ts
// Layer: features → tutor → model
// Purpose: React hooks orchestrating the streaming chat.
//          - useConversation: manages local message list state
//          - useSendMessage: handles stream consumption + token rendering
// =============================================================================

'use client';

import { useCallback, useRef, useState } from 'react';

import { nanoid } from 'nanoid';

import { useTutorStore } from './tutorStore';
import type { ChatMessage, CitationChip } from './types';
import type { TutorPersonalityId } from './types';
import { sendMessageStream, fetchConversationHistory } from '../api/tutorApi';

// ---------------------------------------------------------------------------
// useConversation — manages the local message array
// ---------------------------------------------------------------------------

export function useConversation(workspaceId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { messages: history } = await fetchConversationHistory(workspaceId);
      setMessages(history);
    } catch {
      // Silently fail — backend may not persist history yet
    } finally {
      setIsLoadingHistory(false);
    }
  }, [workspaceId]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  return { messages, isLoadingHistory, loadHistory, appendMessage, updateMessage };
}

// ---------------------------------------------------------------------------
// useSendMessage — streams tokens and appends them progressively
// ---------------------------------------------------------------------------

export function useSendMessage({
  workspaceId,
  appendMessage,
  updateMessage,
}: {
  workspaceId: string;
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
}) {
  const { selectedPersonality, inputValue, setInputValue, setIsStreaming, setStreamingMessageId } =
    useTutorStore();

  const isStreamingRef = useRef(false);

  const sendMessage = useCallback(
    async (overridePersonality?: TutorPersonalityId) => {
      const text = inputValue.trim();
      if (!text || isStreamingRef.current) return;

      const personality = overridePersonality ?? selectedPersonality;

      // 1. Optimistically append user message
      const userMsgId = nanoid();
      appendMessage({
        id: userMsgId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      });
      setInputValue('');

      // 2. Create a placeholder streaming assistant message
      const assistantMsgId = nanoid();
      appendMessage({
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        isStreaming: true,
      });

      setIsStreaming(true);
      setStreamingMessageId(assistantMsgId);
      isStreamingRef.current = true;

      try {
        // We pass an empty history for now; a real implementation would read
        // the full message list from state and pass it here.
        const stream = await sendMessageStream({
          workspaceId,
          message: text,
          personalityId: personality,
          history: [],
          stream: true,
        });

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let finalCitations: CitationChip[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // The API may send JSON citations as a last chunk: [CITATIONS]:base64
          if (chunk.startsWith('[CITATIONS]:')) {
            try {
              const raw = chunk.replace('[CITATIONS]:', '');
              finalCitations = JSON.parse(atob(raw)) as CitationChip[];
            } catch {
              // not a citations chunk
            }
          } else {
            accumulatedContent += chunk;
            updateMessage(assistantMsgId, {
              content: accumulatedContent,
              isStreaming: true,
            });
          }
        }

        // Finalize the message
        updateMessage(assistantMsgId, {
          content: accumulatedContent,
          citations: finalCitations.length > 0 ? finalCitations : undefined,
          isStreaming: false,
        });
      } catch (err) {
        const errorText =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        updateMessage(assistantMsgId, {
          content: errorText,
          isStreaming: false,
        });
      } finally {
        setIsStreaming(false);
        setStreamingMessageId(null);
        isStreamingRef.current = false;
      }
    },
    [
      inputValue,
      selectedPersonality,
      workspaceId,
      appendMessage,
      updateMessage,
      setInputValue,
      setIsStreaming,
      setStreamingMessageId,
    ],
  );

  return { sendMessage };
}
