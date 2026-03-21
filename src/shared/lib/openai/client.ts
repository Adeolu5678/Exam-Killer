import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

import {
  getMockFlashcards,
  getMockQuizQuestions,
  getMockSummary,
  getMockTutorResponse,
  getMockEmbedding,
  MOCK_MODE_ENABLED,
} from './mock-data';

const kiloApiKey = process.env.KILO_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

export const kiloClient = new OpenAI({
  baseURL: 'https://api.kilo.ai/api/gateway',
  apiKey: kiloApiKey || 'dummy-key-for-build',
});

const KILO_CHAT_MODEL = 'minimax/minimax-m2.5-free';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export function isGeminiConfigured(): boolean {
  return !!geminiApiKey;
}

export function isKiloConfigured(): boolean {
  return !!kiloApiKey;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  mockType?: 'flashcards' | 'quiz' | 'summary' | 'tutor';
};

export async function getChatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string> {
  if (!isKiloConfigured() || MOCK_MODE_ENABLED) {
    // Return mock data based on the requested type
    const mockType = options?.mockType;

    switch (mockType) {
      case 'flashcards':
        return getMockFlashcards(options?.maxTokens ?? 10);
      case 'quiz':
        return getMockQuizQuestions(options?.maxTokens ?? 10);
      case 'summary':
        return getMockSummary();
      case 'tutor':
        return getMockTutorResponse();
      default:
        // Default mock response for unknown types
        return getMockTutorResponse();
    }
  }

  try {
    const completion = await kiloClient.chat.completions.create({
      model: KILO_CHAT_MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from OpenAI chat completion');
    }

    return content;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to get chat completion: ${error.message}`);
    }
    throw new Error('Failed to get chat completion: Unknown error');
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!isGeminiConfigured() || MOCK_MODE_ENABLED || !geminiClient) {
    return getMockEmbedding();
  }

  try {
    const model = geminiClient.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Gemini embedding error:', error);
    throw new Error(
      `Failed to get embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
