import { getEmbedding } from '@/shared/lib/openai/client';
import { queryVectors } from '@/shared/lib/rag/vector-store';

export interface RetrievalOptions {
  workspaceId: string;
  sourceIds?: string[];
  topK?: number;
  includeMetadata?: boolean;
  minScore?: number;
}

export interface RetrievedChunk {
  content: string;
  score: number;
  sourceId: string;
  workspaceId: string;
  pageNumber?: number;
  chunkIndex: number;
}

export async function retrieveContext(
  query: string,
  options: RetrievalOptions,
): Promise<RetrievedChunk[]> {
  const { workspaceId, sourceIds, topK = 10, minScore = 0.0 } = options;

  if (!workspaceId) {
    throw new Error('workspaceId is required for context retrieval');
  }

  const embedding = await getEmbedding(query);

  const filter: Record<string, Record<string, unknown>> = {};
  if (sourceIds && sourceIds.length > 0) {
    filter.sourceId = { $in: sourceIds };
  }

  const results = await queryVectors(
    workspaceId,
    embedding,
    topK,
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  const chunks: RetrievedChunk[] = results
    .filter((result) => result.score >= minScore)
    .map((result) => ({
      content: result.metadata.content,
      score: result.score,
      sourceId: result.metadata.sourceId,
      workspaceId: result.metadata.workspaceId,
      pageNumber: result.metadata.pageNumber,
      chunkIndex: result.metadata.chunkIndex,
    }));

  return chunks;
}

export function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'this',
    'that',
    'these',
    'those',
    'i',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
    'what',
    'which',
    'who',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    's',
    't',
    'just',
    'don',
    'now',
    'please',
    'explain',
    'describe',
    'define',
    'tell',
    'find',
    'get',
  ]);

  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));

  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

export async function hybridSearch(
  query: string,
  options: RetrievalOptions,
): Promise<RetrievedChunk[]> {
  const { workspaceId, sourceIds, topK = 10, minScore = 0.0 } = options;

  const embedding = await getEmbedding(query);

  const filter: Record<string, Record<string, unknown>> = {};
  if (sourceIds && sourceIds.length > 0) {
    filter.sourceId = { $in: sourceIds };
  }

  const semanticResults = await queryVectors(
    workspaceId,
    embedding,
    topK * 4,
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  const keywords = extractKeywords(query);

  const mergedChunks = semanticResults.map((result) => {
    const content = result.metadata.content.toLowerCase();
    let keywordMatches = 0;
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    }

    const keywordScore = keywordMatches / Math.max(keywords.length, 1);
    const combinedScore = result.score * 0.7 + keywordScore * 0.3;

    return {
      content: result.metadata.content,
      score: combinedScore,
      sourceId: result.metadata.sourceId,
      workspaceId: result.metadata.workspaceId,
      pageNumber: result.metadata.pageNumber,
      chunkIndex: result.metadata.chunkIndex,
    };
  });

  return mergedChunks
    .filter((chunk) => chunk.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function rerankResults(
  query: string,
  chunks: RetrievedChunk[],
  topN?: number,
): Promise<RetrievedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const topKN = topN ?? chunks.length;

  if (chunks.length <= topKN) {
    return chunks;
  }

  try {
    const { getChatCompletion } = await import('@/shared/lib/openai/client');

    const scoringPrompt = `Rate the relevance of each chunk to the following query on a scale of 0-10.
Query: "${query}"

Chunks:
${chunks.map((chunk, i) => `${i + 1}. ${chunk.content.slice(0, 500)}`).join('\n\n')}

Respond with only a JSON array of scores in order, like: [8, 5, 9, 3, ...]`;

    const content = await getChatCompletion([{ role: 'user', content: scoringPrompt }], {
      temperature: 0,
    });

    const scores = JSON.parse(content || '[]');

    const scoredChunks = chunks.map((chunk, i) => ({
      ...chunk,
      rerankScore: typeof scores[i] === 'number' ? scores[i] / 10 : chunk.score,
    }));

    scoredChunks.sort((a, b) => b.rerankScore - a.rerankScore);

    return scoredChunks.slice(0, topKN).map(({ rerankScore, ...chunk }) => ({
      ...chunk,
      score: rerankScore,
    }));
  } catch (error) {
    return chunks.sort((a, b) => b.score - a.score).slice(0, topKN);
  }
}

export function formatContextForPrompt(chunks: RetrievedChunk[], maxLength?: number): string {
  if (chunks.length === 0) {
    return '';
  }

  const sourceCitations = new Map<string, Set<number>>();

  for (const chunk of chunks) {
    if (!sourceCitations.has(chunk.sourceId)) {
      sourceCitations.set(chunk.sourceId, new Set());
    }
    if (chunk.pageNumber !== undefined) {
      sourceCitations.get(chunk.sourceId)!.add(chunk.pageNumber);
    }
  }

  const formattedChunks: string[] = [];
  let currentLength = 0;
  const maxCtxLength = maxLength ?? 4000;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let chunkText = `[Source ${chunk.sourceId}`;

    if (chunk.pageNumber !== undefined) {
      chunkText += `, Page ${chunk.pageNumber}`;
    }
    chunkText += `]\n${chunk.content}`;

    if (currentLength + chunkText.length > maxCtxLength && formattedChunks.length > 0) {
      break;
    }

    formattedChunks.push(chunkText);
    currentLength += chunkText.length;
  }

  const citationSection = '\n\n---\n\nSources:\n';
  let citationText = '';

  for (const entry of Array.from(sourceCitations.entries())) {
    const [sourceId, pages] = entry;
    const pageList = Array.from(pages).sort((a, b) => a - b);
    if (pageList.length > 0) {
      citationText += `- ${sourceId} (Pages: ${pageList.join(', ')})\n`;
    } else {
      citationText += `- ${sourceId}\n`;
    }
  }

  return formattedChunks.join('\n\n') + citationSection + citationText;
}

export async function retrieveWithConversationHistory(
  query: string,
  conversationHistory: Array<{ role: string; content: string }>,
  options: RetrievalOptions,
): Promise<{ context: string; sources: RetrievedChunk[] }> {
  let enhancedQuery = query;

  const recentMessages = conversationHistory.slice(-6);

  if (recentMessages.length > 0) {
    const historyText = recentMessages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    enhancedQuery = `Previous conversation:\n${historyText}\n\nCurrent question: ${query}`;
  }

  const semanticChunks = await retrieveContext(enhancedQuery, options);

  const hybridChunks = await hybridSearch(query, {
    ...options,
    topK: Math.floor((options.topK ?? 10) / 2),
  });

  const allChunks = [...semanticChunks];
  const seenKeys = new Set<string>();

  for (const chunk of allChunks) {
    seenKeys.add(`${chunk.sourceId}-${chunk.chunkIndex}`);
  }

  for (const chunk of hybridChunks) {
    const key = `${chunk.sourceId}-${chunk.chunkIndex}`;
    if (!seenKeys.has(key)) {
      allChunks.push(chunk);
      seenKeys.add(key);
    }
  }

  allChunks.sort((a, b) => b.score - a.score);

  const finalChunks = allChunks.slice(0, options.topK ?? 10);

  const context = formatContextForPrompt(finalChunks);

  return {
    context,
    sources: finalChunks,
  };
}
