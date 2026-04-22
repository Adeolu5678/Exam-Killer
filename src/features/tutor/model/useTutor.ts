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
import type { ChatMessage, CitationChip, TutorThread } from './types';
import type { TutorPersonalityId } from './types';
import {
  sendMessageStream,
  fetchTutorThreads,
  fetchThreadMessages,
  createTutorThread,
  type TutorStreamEvent,
} from '../api/tutorApi';

// ---------------------------------------------------------------------------
// useConversation — manages the local message array
// ---------------------------------------------------------------------------

export function useConversation(workspaceId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<TutorThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const upsertThread = useCallback(
    (thread: TutorThread) => {
      setThreads((prev) => [thread, ...prev.filter((item) => item.id !== thread.id)]);
    },
    [setThreads],
  );

  const setActiveThreadFromEvent = useCallback(
    (thread: { id: string; title: string }) => {
      const now = new Date().toISOString();
      setActiveThreadId(thread.id);
      upsertThread({
        id: thread.id,
        workspaceId,
        title: thread.title,
        createdAt: now,
        updatedAt: now,
      });
    },
    [upsertThread, workspaceId],
  );

  const loadThreadMessages = useCallback(
    async (threadId: string) => {
      const { thread, messages: threadMessages } = await fetchThreadMessages(threadId);
      setActiveThreadId(thread.id);
      upsertThread(thread);
      setMessages(threadMessages);
    },
    [upsertThread],
  );

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { threads: availableThreads } = await fetchTutorThreads(workspaceId);
      setThreads(availableThreads);

      if (availableThreads.length === 0) {
        setActiveThreadId(null);
        setMessages([]);
        return;
      }

      await loadThreadMessages(availableThreads[0].id);
    } catch {
      setActiveThreadId(null);
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [loadThreadMessages, workspaceId]);

  const startNewThread = useCallback(async () => {
    const { thread } = await createTutorThread(workspaceId);
    upsertThread(thread);
    setActiveThreadId(thread.id);
    setMessages([]);
    return thread.id;
  }, [upsertThread, workspaceId]);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return {
    messages,
    threads,
    activeThreadId,
    isLoadingHistory,
    loadHistory,
    loadThreadMessages,
    startNewThread,
    setActiveThreadFromEvent,
    appendMessage,
    updateMessage,
    removeMessage,
  };
}

// ---------------------------------------------------------------------------
// useSendMessage — streams tokens and appends them progressively
// ---------------------------------------------------------------------------

export function useSendMessage({
  workspaceId,
  activeThreadId,
  setActiveThreadFromEvent,
  appendMessage,
  updateMessage,
  removeMessage,
}: {
  workspaceId: string;
  activeThreadId: string | null;
  setActiveThreadFromEvent: (thread: { id: string; title: string }) => void;
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
        threadId: activeThreadId ?? undefined,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      });
      setInputValue('');

      // 2. Create a placeholder streaming assistant message
      const assistantMsgId = nanoid();
      appendMessage({
        id: assistantMsgId,
        threadId: activeThreadId ?? undefined,
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
          threadId: activeThreadId,
          message: text,
          personalityId: personality,
        });

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let streamBuffer = '';
        let assembledContent = '';
        let finalCitations: CitationChip[] = [];
        let resolvedThreadId = activeThreadId ?? undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              continue;
            }

            let event: TutorStreamEvent | null = null;
            try {
              event = JSON.parse(trimmed) as TutorStreamEvent;
            } catch {
              continue;
            }

            if (event.type === 'thread') {
              resolvedThreadId = event.thread.id;
              setActiveThreadFromEvent(event.thread);
              updateMessage(userMsgId, { threadId: resolvedThreadId });
              updateMessage(assistantMsgId, { threadId: resolvedThreadId });
              continue;
            }

            if (event.type === 'token') {
              assembledContent += event.delta;
              updateMessage(assistantMsgId, {
                threadId: resolvedThreadId,
                content: assembledContent,
                isStreaming: true,
              });
              continue;
            }

            if (event.type === 'done') {
              resolvedThreadId = event.thread_id;
              finalCitations = event.citations.map((citation) => ({
                sourceId: citation.source_id,
                filename: citation.file_name,
                label: citation.label,
                page: typeof citation.page_number === 'number' ? citation.page_number : undefined,
              }));
              continue;
            }

            if (event.type === 'error') {
              throw new Error(event.message);
            }
          }
        }

        // Finalize the message
        updateMessage(assistantMsgId, {
          threadId: resolvedThreadId,
          content: assembledContent,
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
      activeThreadId,
      appendMessage,
      updateMessage,
      removeMessage,
      setActiveThreadFromEvent,
      setInputValue,
      setIsStreaming,
      setStreamingMessageId,
    ],
  );

  return { sendMessage };
}
