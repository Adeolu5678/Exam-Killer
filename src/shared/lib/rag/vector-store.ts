import {
  Pinecone,
  PineconeRecord,
  RecordMetadata,
  QueryOptions,
} from '@pinecone-database/pinecone';

const DEFAULT_INDEX_NAME = 'exam-killer';

/**
 * ⚠️  ACTION REQUIRED: Pinecone Index Recreation
 *
 * The embedding model has changed from text-embedding-3-small (1536 dims)
 * to Gemini text-embedding-004 (768 dims). The Pinecone index dimension
 * cannot be changed in-place.
 *
 * MANUAL STEPS (one-time, done once by the project owner):
 * 1. Go to https://app.pinecone.io
 * 2. Delete the existing 'exam-killer' index
 * 3. Create a new index named 'exam-killer' with:
 *    - Dimensions: 768
 *    - Metric: cosine
 *    - Cloud: your current cloud/region settings
 * 4. Existing embeddings will be lost (users' uploaded sources
 *    will need to be re-processed — trigger re-processing from the UI).
 */
let pineconeClient: Pinecone | null = null;

export interface VectorMetadata {
  sourceId: string;
  workspaceId: string;
  content: string;
  pageNumber?: number;
  chunkIndex: number;
  charCount: number;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export async function getPineconeClient(): Promise<Pinecone> {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    throw new Error('PINECONE_API_KEY environment variable is not set');
  }

  pineconeClient = new Pinecone({
    apiKey,
  });

  return pineconeClient;
}

function getIndexName(): string {
  return process.env.PINECONE_INDEX || DEFAULT_INDEX_NAME;
}

export async function indexExists(): Promise<boolean> {
  const client = await getPineconeClient();
  const indexName = getIndexName();

  try {
    const indexes = await client.listIndexes();
    const indexList = indexes as unknown as Array<{ name: string }>;
    return indexList.some((idx) => idx.name === indexName);
  } catch (error) {
    return false;
  }
}

export async function getIndexStats(): Promise<{
  dimension: number;
  totalVectorCount: number;
  namespaceCount: number;
} | null> {
  const client = await getPineconeClient();
  const indexName = getIndexName();

  try {
    const index = client.index(indexName);
    const stats = await index.describeIndexStats();
    return {
      dimension: stats.dimension || 0,
      totalVectorCount: stats.totalRecordCount || 0,
      namespaceCount: Object.keys(stats.namespaces || {}).length,
    };
  } catch (error) {
    return null;
  }
}

export async function upsertVectors(
  workspaceId: string,
  vectors: Array<{ id: string; values: number[]; metadata: VectorMetadata }>,
): Promise<void> {
  if (!vectors || vectors.length === 0) {
    return;
  }

  const client = await getPineconeClient();
  const indexName = getIndexName();
  const index = client.index(indexName);

  const namespace = index.namespace(workspaceId);

  const records = vectors.map((vector) => ({
    id: vector.id,
    values: vector.values,
    metadata: {
      sourceId: vector.metadata.sourceId,
      workspaceId: vector.metadata.workspaceId,
      content: vector.metadata.content,
      pageNumber: vector.metadata.pageNumber,
      chunkIndex: vector.metadata.chunkIndex,
      charCount: vector.metadata.charCount,
    },
  }));

  try {
    await namespace.upsert({ records: records as PineconeRecord<RecordMetadata>[] });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upsert vectors: ${error.message}`);
    }
    throw new Error('Failed to upsert vectors: Unknown error');
  }
}

export async function deleteBySource(sourceId: string, workspaceId: string): Promise<void> {
  const client = await getPineconeClient();
  const indexName = getIndexName();
  const index = client.index(indexName);
  const namespace = index.namespace(workspaceId);

  try {
    await namespace.deleteMany({
      filter: {
        sourceId: { $eq: sourceId },
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete vectors by source: ${error.message}`);
    }
    throw new Error('Failed to delete vectors by source: Unknown error');
  }
}

export async function deleteByWorkspace(workspaceId: string): Promise<void> {
  const client = await getPineconeClient();
  const indexName = getIndexName();
  const index = client.index(indexName);
  const namespace = index.namespace(workspaceId);

  try {
    await namespace.deleteAll();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete vectors by workspace: ${error.message}`);
    }
    throw new Error('Failed to delete vectors by workspace: Unknown error');
  }
}

export async function queryVectors(
  workspaceId: string,
  queryEmbedding: number[],
  topK: number = 10,
  filter?: Record<string, Record<string, unknown>>,
): Promise<QueryResult[]> {
  const client = await getPineconeClient();
  const indexName = getIndexName();
  const index = client.index(indexName);
  const namespace = index.namespace(workspaceId);

  const queryOptions: QueryOptions = {
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    includeValues: false,
  };

  if (filter) {
    queryOptions.filter = filter;
  }

  try {
    const queryResponse = await namespace.query(queryOptions);

    const results: QueryResult[] = (queryResponse.matches || []).map((match) => {
      const meta = (match.metadata as unknown as VectorMetadata) || {};
      return {
        id: match.id,
        score: match.score || 0,
        metadata: {
          sourceId: String(meta.sourceId || ''),
          workspaceId: String(meta.workspaceId || ''),
          content: String(meta.content || ''),
          pageNumber: meta.pageNumber !== undefined ? Number(meta.pageNumber) : undefined,
          chunkIndex: Number(meta.chunkIndex || 0),
          charCount: Number(meta.charCount || 0),
        },
      };
    });

    return results;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query vectors: ${error.message}`);
    }
    throw new Error('Failed to query vectors: Unknown error');
  }
}
