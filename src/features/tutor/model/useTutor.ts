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
import { toast } from 'sonner';

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

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, isLoadingHistory, loadHistory, appendMessage, updateMessage, removeMessage };
}

// ---------------------------------------------------------------------------
// useSendMessage — streams tokens and appends them progressively
// ---------------------------------------------------------------------------

export function useSendMessage({
  workspaceId,
  messages,
  appendMessage,
  updateMessage,
  removeMessage,
}: {
  workspaceId: string;
  messages: ChatMessage[];
  appendMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
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
        // 4. Default OpenAI Streaming path
        const stream = await sendMessageStream({
          workspaceId,
          message: text,
          personalityId: personality,
          history: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          stream: true,
        });

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let rawResponse = '';
        let finalCitations: CitationChip[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          rawResponse += chunk;

          const markerIndex = rawResponse.indexOf('[CITATIONS]:');
          const visibleContent =
            markerIndex === -1 ? rawResponse : rawResponse.slice(0, markerIndex);

          updateMessage(assistantMsgId, {
            content: visibleContent,
            isStreaming: true,
          });
        }

        const markerIndex = rawResponse.indexOf('[CITATIONS]:');
        let accumulatedContent = rawResponse;

        if (markerIndex !== -1) {
          accumulatedContent = rawResponse.slice(0, markerIndex);
          const rawCitations = rawResponse.slice(markerIndex + '[CITATIONS]:'.length);

          try {
            finalCitations = JSON.parse(atob(rawCitations)) as CitationChip[];
          } catch {
            finalCitations = [];
          }
        }

        // Finalize the message
        updateMessage(assistantMsgId, {
          content: accumulatedContent,
          citations: finalCitations.length > 0 ? finalCitations : undefined,
          isStreaming: false,
        });
      } catch (err) {
        removeMessage(assistantMsgId);
        const errorText =
          err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        toast.error(errorText);
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
      messages,
      appendMessage,
      updateMessage,
      removeMessage,
      setInputValue,
      setIsStreaming,
      setStreamingMessageId,
    ],
  );

  return { sendMessage };
}
