import { NextRequest } from 'next/server';

import {
  sendTutorMessageRequestSchema,
  prepareTutorAssistantReply,
  finalizeTutorAssistantReply,
} from '@/domains/tutor';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { getChatCompletion, streamChatCompletion } from '@/shared/lib/openai/client';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ workspaceId: string }>;
}

type StreamEvent =
  | { type: 'thread'; thread: { id: string; title: string } }
  | { type: 'token'; delta: string }
  | {
      type: 'done';
      thread_id: string;
      assistant_message_id: string;
      citations: Array<{
        source_id: string;
        file_name: string;
        label: string;
        page_number: number | null;
        chunk_id: string;
        chunk_index: number;
      }>;
    }
  | { type: 'error'; message: string };

function encodeEvent(event: StreamEvent, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { workspaceId } = await context.params;
    if (!workspaceId) {
      throw new ValidationError('Workspace ID is required');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = sendTutorMessageRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid tutor message payload', {
        issues: parsed.error.issues,
      });
    }

    const prepared = await prepareTutorAssistantReply({
      workspaceId,
      userId: user.uid,
      message: parsed.data.message,
      threadId: parsed.data.thread_id,
      personality: parsed.data.personality,
      customInstructions: parsed.data.custom_instructions,
    });

    if (!parsed.data.stream) {
      const reply = await getChatCompletion(prepared.promptMessages, {
        temperature: 0.7,
        maxTokens: 4096,
        mockType: 'tutor',
      });

      await finalizeTutorAssistantReply({
        assistantMessageId: prepared.assistantMessage.id,
        threadId: prepared.thread.id,
        userId: user.uid,
        content: reply,
      });

      return apiSuccess({
        thread: prepared.thread,
        assistant_message: {
          ...prepared.assistantMessage,
          content: reply,
          citations: prepared.citations,
        },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let finalized = false;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const completeResponse = async (content: string): Promise<void> => {
          if (finalized) {
            return;
          }

          finalized = true;
          await finalizeTutorAssistantReply({
            assistantMessageId: prepared.assistantMessage.id,
            threadId: prepared.thread.id,
            userId: user.uid,
            content,
          });
        };

        const emitDoneEvent = () => {
          controller.enqueue(
            encodeEvent(
              {
                type: 'done',
                thread_id: prepared.thread.id,
                assistant_message_id: prepared.assistantMessage.id,
                citations: prepared.citations,
              },
              encoder,
            ),
          );
        };

        try {
          controller.enqueue(
            encodeEvent(
              {
                type: 'thread',
                thread: {
                  id: prepared.thread.id,
                  title: prepared.thread.title,
                },
              },
              encoder,
            ),
          );

          let assembled = '';
          const aiStream = await streamChatCompletion(prepared.promptMessages, {
            temperature: 0.7,
            maxTokens: 4096,
          });
          const reader = aiStream.getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const delta = decoder.decode(value, { stream: true });
            if (!delta) {
              continue;
            }

            assembled += delta;
            controller.enqueue(encodeEvent({ type: 'token', delta }, encoder));
          }

          await completeResponse(assembled);
          emitDoneEvent();
          controller.close();
        } catch (streamError) {
          try {
            const fallbackReply = await getChatCompletion(prepared.promptMessages, {
              temperature: 0.7,
              maxTokens: 4096,
              mockType: 'tutor',
            });

            await completeResponse(fallbackReply);
            controller.enqueue(encodeEvent({ type: 'token', delta: fallbackReply }, encoder));
            emitDoneEvent();
            controller.close();
          } catch {
            const failureMessage =
              'I could not generate a tutor response right now. Please try again in a moment.';
            await completeResponse(failureMessage);
            controller.enqueue(encodeEvent({ type: 'error', message: failureMessage }, encoder));
            emitDoneEvent();
            controller.close();
          }

          if (streamError instanceof Error) {
            console.error('Tutor streaming error:', streamError.message);
          } else {
            console.error('Tutor streaming error:', streamError);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

