import { Firestore } from 'firebase-admin/firestore';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import {
  extractKeywords,
  formatContextForPrompt,
  RetrievedChunk,
  retrieveWithConversationHistory,
} from '@/shared/lib/rag/retriever';
import { ConfigurationError } from '@/shared/lib/rebuild/errors';

export interface RetrievalCitation {
  source_id: string;
  file_name: string;
  label: string;
  page_number: number | null;
  chunk_id: string;
  chunk_index: number;
}

export interface RetrieveTutorContextInput {
  workspaceId: string;
  query: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  sourceIds?: string[];
  topK?: number;
}

export interface RetrieveTutorContextResult {
  context: string;
  chunks: RetrievedChunk[];
  citations: RetrievalCitation[];
}

interface SourceLookup {
  sourceId: string;
  fileName: string;
}

interface StoredChunkDoc {
  source_id?: string;
  workspace_id?: string;
  content?: string;
  index?: number;
  chunk_index?: number;
  page_number?: number | null;
}

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function buildCitationKey(sourceId: string, chunkIndex: number): string {
  return `${sourceId}:${chunkIndex}`;
}

function toCitationLabel(chunk: RetrievedChunk): string {
  if (typeof chunk.pageNumber === 'number') {
    return `Page ${chunk.pageNumber}`;
  }

  return `Chunk ${chunk.chunkIndex + 1}`;
}

function toChunkId(chunk: RetrievedChunk): string {
  return `${chunk.sourceId}_${chunk.chunkIndex}`;
}

async function getWorkspaceRetrievableSources(workspaceId: string): Promise<Map<string, SourceLookup>> {
  const db = getDb();
  const sourceSnapshot = await db.collection('sources').where('workspace_id', '==', workspaceId).get();

  const sourceMap = new Map<string, SourceLookup>();

  for (const doc of sourceSnapshot.docs) {
    const data = doc.data();
    const isProcessed = data.processed === true;
    const isEmbedded = data.embedding_status === 'completed';

    if (!isProcessed || !isEmbedded) {
      continue;
    }

    sourceMap.set(doc.id, {
      sourceId: doc.id,
      fileName: String(data.file_name || `Source ${doc.id}`),
    });
  }

  return sourceMap;
}

function buildCitations(
  chunks: RetrievedChunk[],
  sourceMap: Map<string, SourceLookup>,
): RetrievalCitation[] {
  const seen = new Set<string>();
  const citations: RetrievalCitation[] = [];

  for (const chunk of chunks) {
    const source = sourceMap.get(chunk.sourceId);
    if (!source) {
      continue;
    }

    const dedupeKey = buildCitationKey(chunk.sourceId, chunk.chunkIndex);
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    citations.push({
      source_id: chunk.sourceId,
      file_name: source.fileName,
      label: toCitationLabel(chunk),
      page_number: typeof chunk.pageNumber === 'number' ? chunk.pageNumber : null,
      chunk_id: toChunkId(chunk),
      chunk_index: chunk.chunkIndex,
    });
  }

  return citations;
}

function scoreChunkAgainstQuery(queryKeywords: string[], content: string): number {
  if (queryKeywords.length === 0) {
    return 0;
  }

  const normalizedContent = content.toLowerCase();
  let hits = 0;
  for (const keyword of queryKeywords) {
    if (normalizedContent.includes(keyword)) {
      hits += 1;
    }
  }

  return hits / queryKeywords.length;
}

function toRetrievedChunkFromStored(
  doc: StoredChunkDoc,
  sourceMap: Map<string, SourceLookup>,
  score: number,
): RetrievedChunk | null {
  const sourceId = String(doc.source_id || '');
  const workspaceId = String(doc.workspace_id || '');
  const content = String(doc.content || '');
  const chunkIndex =
    typeof doc.index === 'number'
      ? doc.index
      : typeof doc.chunk_index === 'number'
        ? doc.chunk_index
        : 0;

  if (!sourceId || !workspaceId || !content || !sourceMap.has(sourceId)) {
    return null;
  }

  return {
    sourceId,
    workspaceId,
    content,
    score,
    chunkIndex,
    pageNumber: typeof doc.page_number === 'number' ? doc.page_number : undefined,
  };
}

async function retrieveTutorContextFromStoredChunks(input: {
  workspaceId: string;
  sourceIds: string[];
  query: string;
  topK: number;
  sourceMap: Map<string, SourceLookup>;
}): Promise<RetrievedChunk[]> {
  const db = getDb();
  const { workspaceId, sourceIds, query, topK, sourceMap } = input;

  if (sourceIds.length === 0) {
    return [];
  }

  const queryKeywords = extractKeywords(query);
  const snapshot = await db.collection('vector_chunks').where('workspace_id', '==', workspaceId).get();
  if (snapshot.empty) {
    return [];
  }

  const scoredChunks: RetrievedChunk[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() as StoredChunkDoc;
    const sourceId = String(data.source_id || '');
    if (!sourceIds.includes(sourceId)) {
      continue;
    }

    const content = String(data.content || '');
    if (!content) {
      continue;
    }

    const score = scoreChunkAgainstQuery(queryKeywords, content);
    if (score <= 0) {
      continue;
    }

    const chunk = toRetrievedChunkFromStored(data, sourceMap, score);
    if (chunk) {
      scoredChunks.push(chunk);
    }
  }

  return scoredChunks.sort((a, b) => b.score - a.score).slice(0, topK);
}

export async function retrieveTutorContext(
  input: RetrieveTutorContextInput,
): Promise<RetrieveTutorContextResult> {
  const { workspaceId, query, conversationHistory, sourceIds: requestedSourceIds, topK = 8 } = input;
  const workspaceSourceMap = await getWorkspaceRetrievableSources(workspaceId);
  const sourceMap = new Map<string, SourceLookup>();
  const candidateSourceIds =
    requestedSourceIds && requestedSourceIds.length > 0
      ? requestedSourceIds.filter((sourceId) => workspaceSourceMap.has(sourceId))
      : Array.from(workspaceSourceMap.keys());

  for (const sourceId of candidateSourceIds) {
    const source = workspaceSourceMap.get(sourceId);
    if (source) {
      sourceMap.set(sourceId, source);
    }
  }

  const sourceIds = Array.from(sourceMap.keys());

  if (sourceIds.length === 0) {
    return {
      context: '',
      chunks: [],
      citations: [],
    };
  }

  let chunks: RetrievedChunk[] = [];

  try {
    const retrieval = await retrieveWithConversationHistory(query, conversationHistory, {
      workspaceId,
      sourceIds,
      topK,
      minScore: 0.1,
    });
    chunks = retrieval.sources;
  } catch (error) {
    console.warn('Vector retrieval failed, falling back to stored chunks:', error);
    chunks = [];
  }

  if (chunks.length === 0) {
    chunks = await retrieveTutorContextFromStoredChunks({
      workspaceId,
      sourceIds,
      query,
      topK,
      sourceMap,
    });
  }

  return {
    context: formatContextForPrompt(chunks, 4000),
    chunks,
    citations: buildCitations(chunks, sourceMap),
  };
}

