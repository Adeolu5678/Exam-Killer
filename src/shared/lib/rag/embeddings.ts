import { getEmbedding } from '@/shared/lib/openai/client';

import { TextChunk } from './chunker';

export interface EmbeddingOptions {
  model?: string;
  batchSize?: number;
}

export interface ChunkWithEmbedding {
  content: string;
  embedding: number[];
  index: number;
  metadata: {
    sourceId: string;
    workspaceId: string;
    pageNumber?: number;
    charCount: number;
  };
}

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_BATCH_SIZE = 100;

export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions,
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const model = options?.model ?? DEFAULT_EMBEDDING_MODEL;
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;

  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    try {
      const promises = batch.map((text) => getEmbedding(text));
      const batchEmbeddings = await Promise.all(promises);

      embeddings.push(...batchEmbeddings);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate embeddings: ${error.message}`);
      }
      throw new Error('Failed to generate embeddings: Unknown error');
    }
  }

  return embeddings;
}

export async function embedChunks(
  chunks: Array<{ content: string; index: number; metadata: TextChunk['metadata'] }>,
): Promise<ChunkWithEmbedding[]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const texts = chunks.map((chunk) => chunk.content);
  const embeddings = await generateEmbeddings(texts);

  return chunks.map((chunk, idx) => ({
    content: chunk.content,
    embedding: embeddings[idx],
    index: chunk.index,
    metadata: chunk.metadata,
  }));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }

  if (a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

export function normalizeVector(vector: number[]): number[] {
  if (vector.length === 0) {
    return [];
  }

  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return vector;
  }

  const normalized: number[] = [];
  for (let i = 0; i < vector.length; i++) {
    normalized.push(vector[i] / norm);
  }

  return normalized;
}
