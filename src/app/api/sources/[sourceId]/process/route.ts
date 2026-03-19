import { NextRequest } from 'next/server';

import { Storage } from 'firebase-admin/storage';
import fs from 'fs';
import { fromPath } from 'pdf2pic';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminStorage } from '@/shared/lib/firebase/admin';
import {
  chunkText,
  chunkPdfText,
  chunkMarkdown,
  chunkImageText,
  TextChunk,
} from '@/shared/lib/rag/chunker';
import { embedChunks } from '@/shared/lib/rag/embeddings';
import { upsertVectors } from '@/shared/lib/rag/vector-store';

interface ProcessSourceResponse {
  success: boolean;
  sourceId: string;
  chunkCount: number;
  error?: string;
}

function getSourceId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[4];
}

async function extractTextFromFile(
  fileUrl: string,
  fileType: string,
  storage: Storage,
  storagePath?: string,
): Promise<string> {
  const bucket = storage.bucket();
  const urlParts = fileUrl ? fileUrl.split(`https://storage.googleapis.com/${bucket.name}/`) : [];

  const filePath = storagePath || urlParts[1];

  if (!filePath) {
    throw new Error('Invalid file reference');
  }

  const tempPath = `/tmp/${filePath.split('/').pop()}`;

  const file = bucket.file(filePath);
  const [fileExists] = await file.exists();

  if (!fileExists) {
    throw new Error('File not found in storage');
  }

  await file.download({ destination: tempPath });

  try {
    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(tempPath);
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: dataBuffer });
      const data = await parser.getText();
      return data.text;
    }

    if (fileType === 'image') {
      // OCR not implemented yet.
      // Throwing error instead of returning placeholder to keep vector store clean.
      throw new Error('Image OCR is currently not supported. Please upload PDF or Text files.');
    }

    if (fileType === 'text') {
      return fs.readFileSync(tempPath, 'utf-8');
    }

    if (fileType === 'markdown') {
      return fs.readFileSync(tempPath, 'utf-8');
    }

    throw new Error(`Unsupported file type: ${fileType}`);
  } finally {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

export const POST = withAuth(async (request: NextRequest, { db, userId }) => {
  const sourceId = getSourceId(request);

  if (!sourceId) {
    return errorResponse('Source ID is required', StatusCodes.BAD_REQUEST);
  }

  const storage = getAdminStorage();

  if (!storage) {
    return errorResponse('Storage not configured', StatusCodes.INTERNAL_ERROR);
  }

  const sourceDoc = await db.collection('sources').doc(sourceId).get();

  if (!sourceDoc.exists) {
    return errorResponse('Source not found', StatusCodes.NOT_FOUND);
  }

  const sourceData = sourceDoc.data();

  if (!sourceData) {
    return errorResponse('Source not found', StatusCodes.NOT_FOUND);
  }

  if (sourceData.user_id !== userId) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  if (sourceData.processed) {
    return successResponse({
      success: true,
      sourceId,
      chunkCount: sourceData.chunk_count || 0,
    });
  }

  await db.collection('sources').doc(sourceId).update({
    embedding_status: 'processing',
  });

  let chunks: TextChunk[];

  try {
    const fileType = sourceData.type || 'text';
    const fileUrl = sourceData.file_url;
    const storagePath = sourceData.storage_path;

    if (!fileUrl && !storagePath) {
      throw new Error('No file reference found for source');
    }

    const text = await extractTextFromFile(fileUrl, fileType, storage, storagePath);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content extracted from file');
    }

    const sourceIdVal = sourceId;
    const workspaceId = sourceData.workspace_id;

    if (fileType === 'pdf') {
      chunks = chunkPdfText(text, sourceIdVal, workspaceId);
    } else if (fileType === 'markdown') {
      chunks = chunkMarkdown(text, sourceIdVal, workspaceId);
    } else if (fileType === 'image') {
      chunks = await chunkImageText(text, sourceIdVal, workspaceId);
    } else {
      chunks = chunkText(text, {}).map((chunk, idx) => ({
        ...chunk,
        metadata: {
          sourceId: sourceIdVal,
          workspaceId,
          charCount: chunk.content.length,
        },
      }));
    }
  } catch (extractError) {
    console.error('Text extraction error:', extractError);

    await db
      .collection('sources')
      .doc(sourceId)
      .update({
        embedding_status: 'failed',
        processing_error:
          extractError instanceof Error ? extractError.message : 'Text extraction failed',
      });

    return errorResponse(
      extractError instanceof Error ? extractError.message : 'Failed to extract text from file',
      StatusCodes.INTERNAL_ERROR,
    );
  }

  if (chunks.length === 0) {
    await db.collection('sources').doc(sourceId).update({
      processed: true,
      chunk_count: 0,
      embedding_status: 'completed',
    });

    return successResponse({
      success: true,
      sourceId,
      chunkCount: 0,
    });
  }

  let embeddedChunks;

  try {
    embeddedChunks = await embedChunks(chunks);
  } catch (embedError) {
    console.error('Embedding error:', embedError);

    await db
      .collection('sources')
      .doc(sourceId)
      .update({
        embedding_status: 'failed',
        processing_error:
          embedError instanceof Error ? embedError.message : 'Embedding generation failed',
      });

    return errorResponse(
      embedError instanceof Error ? embedError.message : 'Failed to generate embeddings',
      StatusCodes.INTERNAL_ERROR,
    );
  }

  try {
    const vectors = embeddedChunks.map((chunk) => ({
      id: `${sourceId}_chunk_${chunk.index}`,
      values: chunk.embedding,
      metadata: {
        sourceId,
        workspaceId: sourceData.workspace_id,
        content: chunk.content,
        pageNumber: chunk.metadata.pageNumber,
        chunkIndex: chunk.index,
        charCount: chunk.metadata.charCount,
      },
    }));

    await upsertVectors(sourceData.workspace_id, vectors);
  } catch (vectorError) {
    console.error('Vector storage error:', vectorError);

    await db
      .collection('sources')
      .doc(sourceId)
      .update({
        embedding_status: 'failed',
        processing_error:
          vectorError instanceof Error ? vectorError.message : 'Failed to store vectors',
      });

    return errorResponse(
      vectorError instanceof Error ? vectorError.message : 'Failed to store vectors',
      StatusCodes.INTERNAL_ERROR,
    );
  }

  await db.collection('sources').doc(sourceId).update({
    processed: true,
    chunk_count: chunks.length,
    embedding_status: 'completed',
  });

  const response: ProcessSourceResponse = {
    success: true,
    sourceId,
    chunkCount: chunks.length,
  };

  return successResponse(response);
});
