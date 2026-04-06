# TASK-047 Context: Port Kilo Gateway + Gemini Embeddings to NoteBookLM Branch

## Objective

The NoteBookLM branch still uses the original OpenAI client (`client.ts` pointing to `gpt-4o`
via `OPENAI_API_KEY`). This task ports the exact AI provider changes made on the Kilo branch
to this branch. The NotebookLM integration (TASK-040 through TASK-046) is UNTOUCHED — we are
only replacing the underlying OpenAI SDK configuration.

## What is NOT changing

- `src/shared/lib/notebooklm/` — all NLM files stay exactly as-is
- `src/app/api/notebooklm/` — all NLM API routes stay exactly as-is
- `src/app/api/chat/tutor/route.ts` and all other general AI routes — still call `getChatCompletion()`
- Any FSD feature hooks (`useGenerateQuiz`, `useSendMessage`, etc.) — untouched

## What IS changing — 3 files only

### File 1: `src/shared/lib/openai/client.ts`

Replace the ENTIRE file content with the following:

```typescript
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

// ── Chat Completions: Kilo Gateway (minimax/minimax-m2.5-free) ────────────
const kiloApiKey = process.env.KILO_API_KEY;

export const kiloClient = new OpenAI({
  baseURL: 'https://api.kilo.ai/api/gateway',
  apiKey: kiloApiKey || 'dummy-key-for-build',
});

const KILO_CHAT_MODEL = 'minimax/minimax-m2.5-free';

// ── RAG Embeddings: Google Gemini (text-embedding-004, 768 dims) ──────────
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiClient = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export function isKiloConfigured(): boolean {
  return !!kiloApiKey;
}

export function isGeminiConfigured(): boolean {
  return !!geminiApiKey;
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
    if (!content) throw new Error('No content returned from Kilo chat completion');
    return content;
  } catch (error) {
    if (error instanceof OpenAI.APIError) throw new Error(`Kilo API error: ${error.message}`);
    if (error instanceof Error) throw new Error(`Failed to get chat completion: ${error.message}`);
    throw new Error('Failed to get chat completion: Unknown error');
  }
}

/**
 * Generates a text embedding vector.
 * Provider: Google Gemini — text-embedding-004 (free tier)
 * Dimensions: 768
 * Fallback: mock embedding (768-dim random vector) when GEMINI_API_KEY is not set
 */
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
```

### File 2: `src/shared/lib/openai/mock-data.ts` — Line 1 ONLY

Change line 1 from:

```typescript
const MOCK_MODE_ENABLED = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock';
```

To:

```typescript
const MOCK_MODE_ENABLED = !process.env.KILO_API_KEY || process.env.KILO_API_KEY === 'mock';
```

Also find `getMockEmbedding()` and change `Array(1536)` to `Array(768)`.

### File 3: `package.json` — Install Gemini SDK

Check if `@google/generative-ai` is in `package.json`. If NOT present:

```bash
npm install @google/generative-ai
```

## Also Update `.env.example`

Add these two entries (the actual keys are already in `.env.local` — do NOT touch `.env.local`):

```bash
# Kilo Gateway (chat completions — all AI features)
# Get key from: https://kilo.ai
KILO_API_KEY=

# Google Gemini (RAG embeddings — text-embedding-004, 768 dims, ~90M tokens/month free)
# Get key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=
```

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
```

Both must exit 0. The NLM integration is completely unaffected — verify by checking that
`src/shared/lib/notebooklm/client.ts` still has ZERO imports from `@/shared/lib/openai/client`.

## Important: Do NOT touch these files

- Any file under `src/shared/lib/notebooklm/`
- Any file under `src/app/api/notebooklm/`
- Any file under `src/features/`
- `src/shared/lib/rag/embeddings.ts` (already imports `getEmbedding` correctly)
