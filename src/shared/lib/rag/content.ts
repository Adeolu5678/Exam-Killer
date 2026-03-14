import { Firestore } from 'firebase-admin/firestore';

import { RAG_CONFIG } from './config';

/**
 * Common utility to fetch and concatenate content from vector chunks.
 */
export async function fetchRAGContent(
  db: Firestore,
  workspaceId: string,
  sourceIds?: string[],
): Promise<string> {
  let chunks: string[] = [];

  if (sourceIds && sourceIds.length > 0) {
    // Firestore 'in' query supports up to 30 items.
    // Usually sourceIds will be small, but we'll batch just in case.
    const batches = [];
    for (let i = 0; i < sourceIds.length; i += 30) {
      batches.push(sourceIds.slice(i, i + 30));
    }

    const chunkPromises = batches.map(async (batch) => {
      const snapshot = await db
        .collection('vector_chunks')
        .where('source_id', 'in', batch)
        .orderBy('source_id')
        .orderBy('index') // Assuming 'index' exists for ordering, or just get all
        .get();
      return snapshot.docs.map((doc) => doc.data().content as string);
    });

    const results = await Promise.all(chunkPromises);
    chunks = results.flat();
  } else {
    // If no specific sources, fetch all from workspace
    const allChunksSnapshot = await db
      .collection('vector_chunks')
      .where('workspace_id', '==', workspaceId)
      .orderBy('source_id')
      .orderBy('index')
      .limit(100) // Safety limit for workspace-wide fetch
      .get();

    chunks = allChunksSnapshot.docs.map((doc) => doc.data().content as string);
  }

  return chunks.join('\n\n');
}

/**
 * Truncates content based on centralized configuration.
 */
export function truncateContent(content: string): string {
  const maxLength = RAG_CONFIG.MAX_SOURCE_CONTENT_LENGTH;
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '... [Content truncated for context window]';
  }
  return content;
}
