import OpenAI from 'openai';

import {
  getMockFlashcards,
  getMockQuizQuestions,
  getMockSummary,
  getMockTutorResponse,
  getMockEmbedding,
  MOCK_MODE_ENABLED,
} from './mock-data';

const apiKey = process.env.OPENAI_API_KEY;

export function isOpenAIConfigured(): boolean {
  return !!apiKey;
}

export const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key-for-build',
});

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
  if (!isOpenAIConfigured() || MOCK_MODE_ENABLED) {
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
  if (!isOpenAIConfigured() || MOCK_MODE_ENABLED) {
    return getMockEmbedding();
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding) {
      throw new Error('No embedding returned from OpenAI');
    }

    return embedding;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    if (error instanceof Error) {
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
    throw new Error('Failed to get embedding: Unknown error');
  }
}
