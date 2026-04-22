import { Timestamp } from 'firebase-admin/firestore';



import { getAdminDb, getAdminStorage, getStorageBucket } from '@/shared/lib/firebase/admin';
import { chunkText, chunkPdfText } from '@/shared/lib/rag/chunker';
import { embedChunks } from '@/shared/lib/rag/embeddings';
import { upsertVectors, VectorMetadata } from '@/shared/lib/rag/vector-store';
import { ConfigurationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

import {
  acquireProcessingLock,
  setSourceProcessingStatus,
} from './source-service';
import type { ProcessingStatus, SourceType } from '../contracts/source';

export interface ProcessSourceInput {
  sourceId: string;
  userId: string;
}

export interface ProcessSourceResult {
  success: boolean;
  chunkCount: number;
  error?: string;
}

interface ChunkMetadata {
  sourceId: string;
  workspaceId: string;
  charCount: number;
  pageNumber?: number;
}

interface ProcessingChunk {
  content: string;
  index: number;
  metadata: ChunkMetadata;
}

async function downloadSourceFile(storagePath: string): Promise<Buffer> {
  const storage = getAdminStorage();
  if (!storage) {
    throw new ConfigurationError('Storage is not configured');
  }

  const bucketName = getStorageBucket();
  if (!bucketName) {
    throw new ConfigurationError('Storage bucket not configured');
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(storagePath);
  const [contents] = await file.download();
  return contents;
}

async function extractText(
  buffer: Buffer,
  mimeType: string,
  sourceType: SourceType,
): Promise<string> {
  if (sourceType === 'text') {
    return buffer.toString('utf-8');
  }

  if (mimeType === 'application/pdf') {
    try {
      // pdf-parse v2.x exports PDFParse class
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      return data.text || '';
    } catch (err) {
      appLogger.warn('PDF extraction failed', { error: err });
      return '[PDF content - extraction pending]';
    }
  }

  if (sourceType === 'image') {
    return '[Image content - OCR pending]';
  }

  return buffer.toString('utf-8');
}

function chunkContent(
  text: string,
  sourceId: string,
  workspaceId: string,
  sourceType: SourceType,
): ProcessingChunk[] {
  if (sourceType === 'pdf') {
    return chunkPdfText(text, sourceId, workspaceId);
  }

  // Default text chunking
  const rawChunks = chunkText(text, {
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  return rawChunks.map((chunk, idx) => ({
    content: chunk.content,
    index: idx,
    metadata: {
      sourceId,
      workspaceId,
      charCount: chunk.content.length,
    },
  }));
}

export async function processSource(input: ProcessSourceInput): Promise<ProcessSourceResult> {
  const { sourceId, userId } = input;

  const lock = await acquireProcessingLock(sourceId, userId);

  if (!lock.acquired || !lock.sourceData) {
    return {
      success: false,
      chunkCount: 0,
      error: 'Could not acquire processing lock',
    };
  }

  const sourceData = lock.sourceData;
  const workspaceId = sourceData.workspace_id;
  const storagePath = sourceData.storage_path;
  const mimeType = sourceData.mime_type || 'text/plain';
  const sourceType = sourceData.type as SourceType;

  try {
    appLogger.info('Starting source processing', { sourceId, workspaceId });

    // Step 1: Download file
    const fileBuffer = await downloadSourceFile(storagePath);
    appLogger.info('File downloaded', { sourceId, size: fileBuffer.length });

    // Step 2: Extract text
    const text = await extractText(fileBuffer, mimeType, sourceType);
    appLogger.info('Text extracted', { sourceId, textLength: text.length });

    // Step 3: Chunk text
    const chunks = chunkContent(text, sourceId, workspaceId, sourceType);
    appLogger.info('Content chunked', { sourceId, chunkCount: chunks.length });

    // Update partial progress so UI can move from "extracting" to "embedding".
    await setSourceProcessingStatus(sourceId, 'processing', { chunkCount: chunks.length });

    if (chunks.length === 0) {
      await setSourceProcessingStatus(sourceId, 'completed', { chunkCount: 0 });
      return {
        success: true,
        chunkCount: 0,
      };
    }

    // Step 4: Generate embeddings
    const chunksForEmbedding = chunks.map((chunk, idx) => ({
      content: chunk.content,
      index: idx,
      metadata: chunk.metadata,
    }));

    const embeddedChunks = await embedChunks(chunksForEmbedding);
    appLogger.info('Embeddings generated', { sourceId, embeddingCount: embeddedChunks.length });

    // Step 5: Upsert to Pinecone
    const vectors = embeddedChunks.map((chunk, idx) => ({
      id: sourceId + '_chunk_' + idx,
      values: chunk.embedding,
      metadata: {
        sourceId,
        workspaceId,
        content: chunk.content,
        pageNumber: chunk.metadata.pageNumber ?? null,
        chunkIndex: idx,
        charCount: chunk.metadata.charCount,
      } as VectorMetadata,
    }));

    await upsertVectors(workspaceId, vectors);
    appLogger.info('Vectors upserted', { sourceId, vectorCount: vectors.length });

    // Step 6: Store chunks in Firestore for direct retrieval
    const db = getAdminDb();
    if (db) {
      const batch = db.batch();
      for (let i = 0; i < chunks.length; i++) {
        const chunkRef = db.collection('vector_chunks').doc(sourceId + '_' + i);
        batch.set(chunkRef, {
          source_id: sourceId,
          workspace_id: workspaceId,
          content: chunks[i].content,
          index: i,
          char_count: chunks[i].metadata.charCount,
          page_number: chunks[i].metadata.pageNumber ?? null,
          created_at: Timestamp.now(),
        });
      }
      await batch.commit();
      appLogger.info('Chunks stored in Firestore', { sourceId, chunkCount: chunks.length });
    }

    // Step 7: Mark as completed
    await setSourceProcessingStatus(sourceId, 'completed', { chunkCount: chunks.length });

    return {
      success: true,
      chunkCount: chunks.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    appLogger.error('Source processing failed', error, { sourceId });

    await setSourceProcessingStatus(sourceId, 'failed', {
      processingError: errorMessage,
    });

    return {
      success: false,
      chunkCount: 0,
      error: errorMessage,
    };
  }
}

