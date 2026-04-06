import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerationConfig, ResponseSchema } from '@google/generative-ai';

import {
  getMockFlashcards,
  getMockQuizQuestions,
  getMockSummary,
  getMockStudyPlan,
  getMockTutorResponse,
  getMockEmbedding,
  MOCK_MODE_ENABLED,
} from './mock-data';

type GeminiChatRole = 'user' | 'model';
type GeminiChatContent = {
  role: GeminiChatRole;
  parts: Array<{ text: string }>;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite-preview';
export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
export const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-pro-preview-tts';
export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2-preview';

export const geminiClient = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export function isAIConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  mockType?: 'flashcards' | 'quiz' | 'summary' | 'study_plan' | 'tutor';
  responseMimeType?: string;
  responseSchema?: ResponseSchema;
};

function convertMessagesForGemini(messages: ChatMessage[]): {
  systemInstruction?: string;
  contents: GeminiChatContent[];
} {
  const systemMessages = messages
    .filter((message) => message.role === 'system' && message.content.trim().length > 0)
    .map((message) => message.content.trim());
  const systemInstruction = systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined;

  const contents: GeminiChatContent[] = messages
    .filter((message) => message.role !== 'system' && message.content.trim().length > 0)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  if (contents.length === 0) {
    throw new Error('At least one non-system message is required for Gemini chat completion');
  }

  return { systemInstruction, contents };
}

export async function getChatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  if (MOCK_MODE_ENABLED) {
    const mockType = options?.mockType;
    switch (mockType) {
      case 'flashcards':
        return getMockFlashcards(options?.maxTokens ?? 10);
      case 'quiz':
        return getMockQuizQuestions(options?.maxTokens ?? 10);
      case 'summary':
        return getMockSummary();
      case 'study_plan':
        return getMockStudyPlan();
      case 'tutor':
        return getMockTutorResponse();
      default:
        return getMockTutorResponse();
    }
  }

  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const { systemInstruction, contents } = convertMessagesForGemini(messages);
  const generationConfig: GenerationConfig = {
    temperature: options?.temperature ?? 0.7,
    maxOutputTokens: options?.maxTokens ?? 4096,
    ...(options?.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
    ...(options?.responseSchema ? { responseSchema: options.responseSchema } : {}),
  };

  const model = geminiClient.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    generationConfig,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const result = await model.generateContent({ contents });
  const text = result.response.text();
  if (!text) {
    throw new Error('No content returned from Gemini');
  }

  return text;
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<ReadableStream<Uint8Array>> {
  if (MOCK_MODE_ENABLED) {
    const mockText = getMockTutorResponse();
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(mockText));
        controller.close();
      },
    });
  }

  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const { systemInstruction, contents } = convertMessagesForGemini(messages);
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 4096,
    },
    ...(systemInstruction ? { systemInstruction } : {}),
  });
  const result = await model.generateContentStream({ contents });
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function extractGeminiEmbedding(result: unknown): number[] | null {
  const valuesEmbedding = (result as { embedding?: { values?: number[] } }).embedding?.values;
  if (Array.isArray(valuesEmbedding)) {
    return valuesEmbedding;
  }

  const directEmbedding = (result as { embedding?: number[] }).embedding;
  if (Array.isArray(directEmbedding)) {
    return directEmbedding;
  }

  const dataEmbedding = (result as { data?: Array<{ embedding?: number[] }> }).data?.[0]?.embedding;
  if (Array.isArray(dataEmbedding)) {
    return dataEmbedding;
  }

  return null;
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (MOCK_MODE_ENABLED) {
    return getMockEmbedding();
  }

  if (!geminiClient) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = geminiClient.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  const embedding = extractGeminiEmbedding(result);

  if (!embedding) {
    throw new Error('No embedding returned from Gemini');
  }

  return embedding;
}
