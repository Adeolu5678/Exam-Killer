import { Firestore, Timestamp } from 'firebase-admin/firestore';

import { retrieveTutorContext, type RetrievalCitation } from '@/domains/retrieval';
import { verifyWorkspaceAccess } from '@/domains/workspaces';
import type { TutorPersonality } from '@/domains/workspaces/contracts/workspace';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import type { ChatMessage } from '@/shared/lib/openai/client';
import { createTutorConversationPrompt } from '@/shared/lib/openai/prompts';
import { getUserSubscription, consumeAiQueryQuota } from '@/shared/lib/paystack/db';
import { getEffectivePlan, getPlanDetails } from '@/shared/lib/paystack/subscription';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

import type { TutorCitation, TutorMessageSummary, TutorThreadSummary } from '../contracts/tutor';

const TUTOR_THREADS_COLLECTION = 'tutor_threads';
const TUTOR_MESSAGES_COLLECTION = 'tutor_messages';
const MESSAGE_CITATIONS_COLLECTION = 'message_citations';
const MAX_HISTORY_MESSAGES = 12;

interface TutorThreadRecord {
  thread_id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface TutorMessageRecord {
  message_id: string;
  thread_id: string;
  workspace_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface MessageCitationRecord {
  citation_id: string;
  message_id: string;
  thread_id: string;
  workspace_id: string;
  source_id: string;
  file_name: string;
  label: string;
  page_number: number | null;
  chunk_id: string;
  chunk_index: number;
  created_at: Timestamp;
}

export interface PrepareTutorAssistantReplyInput {
  workspaceId: string;
  userId: string;
  message: string;
  threadId?: string;
  personality?: TutorPersonality;
  customInstructions?: string;
}

export interface PrepareTutorAssistantReplyResult {
  thread: TutorThreadSummary;
  userMessage: TutorMessageSummary;
  assistantMessage: TutorMessageSummary;
  promptMessages: ChatMessage[];
  citations: TutorCitation[];
}

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function toIsoDate(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }

  return timestamp.toISOString();
}

function toMillis(timestamp: Timestamp | Date | null | undefined): number {
  if (!timestamp) {
    return 0;
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  }
  return timestamp.getTime();
}

function normalizeThreadTitle(input: string | undefined): string {
  const title = input?.trim();
  if (!title) {
    return 'New conversation';
  }

  return title.slice(0, 120);
}

function inferThreadTitleFromMessage(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return 'New conversation';
  }

  return normalized.length > 60 ? `${normalized.slice(0, 57)}...` : normalized;
}

function mapThreadSummary(data: TutorThreadRecord): TutorThreadSummary {
  return {
    id: data.thread_id,
    workspace_id: data.workspace_id,
    title: data.title,
    created_at: toIsoDate(data.created_at),
    updated_at: toIsoDate(data.updated_at),
  };
}

function mapCitationSummary(record: MessageCitationRecord): TutorCitation {
  return {
    source_id: record.source_id,
    file_name: record.file_name,
    label: record.label,
    page_number: record.page_number,
    chunk_id: record.chunk_id,
    chunk_index: record.chunk_index,
  };
}

function mapMessageSummary(
  data: TutorMessageRecord,
  citations: TutorCitation[] | undefined,
): TutorMessageSummary {
  return {
    id: data.message_id,
    thread_id: data.thread_id,
    role: data.role,
    content: data.content,
    created_at: toIsoDate(data.created_at),
    citations,
  };
}

async function assertWorkspaceAccess(workspaceId: string, userId: string) {
  const access = await verifyWorkspaceAccess(workspaceId, userId);
  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }
  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this workspace');
  }
  return access.workspaceData || {};
}

async function getThreadRecord(threadId: string, userId: string): Promise<TutorThreadRecord> {
  const db = getDb();
  const threadDoc = await db.collection(TUTOR_THREADS_COLLECTION).doc(threadId).get();
  if (!threadDoc.exists) {
    throw new ValidationError('Tutor thread not found');
  }

  const data = threadDoc.data() as Partial<TutorThreadRecord> | undefined;
  if (!data) {
    throw new ValidationError('Tutor thread data is missing');
  }

  await assertWorkspaceAccess(String(data.workspace_id || ''), userId);

  if (String(data.user_id || '') !== userId) {
    throw new AuthorizationError('Access denied to this tutor thread');
  }

  return {
    thread_id: threadDoc.id,
    workspace_id: String(data.workspace_id || ''),
    user_id: String(data.user_id || ''),
    title: String(data.title || 'New conversation'),
    created_at: (data.created_at as Timestamp) || Timestamp.now(),
    updated_at: (data.updated_at as Timestamp) || (data.created_at as Timestamp) || Timestamp.now(),
  };
}

async function ensureTutorEntitlement(userId: string, personality: TutorPersonality): Promise<void> {
  const subscription = await getUserSubscription(userId);
  const effectivePlan = getEffectivePlan(subscription);
  const allowedPersonalities = getPlanDetails(effectivePlan).features.tutorPersonalities;

  if (!allowedPersonalities.includes(personality)) {
    throw new AuthorizationError('This tutor personality requires a Premium subscription.');
  }

  const aiQuota = await consumeAiQueryQuota(userId);
  if (!aiQuota.allowed) {
    throw new AuthorizationError(
      'You have reached your daily AI query limit. Upgrade your plan for a higher limit.',
    );
  }
}

async function fetchThreadConversationHistory(
  threadId: string,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const db = getDb();
  const snapshot = await db.collection(TUTOR_MESSAGES_COLLECTION).where('thread_id', '==', threadId).get();

  const messages = snapshot.docs
    .map((doc) => doc.data() as Partial<TutorMessageRecord>)
    .filter((record) => record.role === 'user' || record.role === 'assistant')
    .sort((a, b) => toMillis(a.created_at as Timestamp) - toMillis(b.created_at as Timestamp))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((record) => ({
      role: record.role as 'user' | 'assistant',
      content: String(record.content || ''),
    }));

  return messages.filter((message) => message.content.trim().length > 0);
}

async function persistMessageCitations(args: {
  thread: TutorThreadRecord;
  assistantMessageId: string;
  citations: RetrievalCitation[];
}): Promise<void> {
  const db = getDb();
  const { thread, assistantMessageId, citations } = args;
  if (citations.length === 0) {
    return;
  }

  const batch = db.batch();
  for (const citation of citations) {
    const citationRef = db.collection(MESSAGE_CITATIONS_COLLECTION).doc();
    const citationRecord: MessageCitationRecord = {
      citation_id: citationRef.id,
      message_id: assistantMessageId,
      thread_id: thread.thread_id,
      workspace_id: thread.workspace_id,
      source_id: citation.source_id,
      file_name: citation.file_name,
      label: citation.label,
      page_number: citation.page_number,
      chunk_id: citation.chunk_id,
      chunk_index: citation.chunk_index,
      created_at: Timestamp.now(),
    };
    batch.set(citationRef, citationRecord);
  }

  await batch.commit();
}

async function createTutorThreadRecord(input: {
  workspaceId: string;
  userId: string;
  title?: string;
}): Promise<TutorThreadRecord> {
  const db = getDb();
  await assertWorkspaceAccess(input.workspaceId, input.userId);

  const threadRef = db.collection(TUTOR_THREADS_COLLECTION).doc();
  const now = Timestamp.now();
  const record: TutorThreadRecord = {
    thread_id: threadRef.id,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: normalizeThreadTitle(input.title),
    created_at: now,
    updated_at: now,
  };

  await threadRef.set(record);
  return record;
}

export async function listTutorThreads(
  workspaceId: string,
  userId: string,
): Promise<TutorThreadSummary[]> {
  const db = getDb();
  await assertWorkspaceAccess(workspaceId, userId);

  const snapshot = await db.collection(TUTOR_THREADS_COLLECTION).where('workspace_id', '==', workspaceId).get();

  const threads = snapshot.docs
    .map((doc) => {
      const data = doc.data() as Partial<TutorThreadRecord>;
      return {
        thread_id: doc.id,
        workspace_id: String(data.workspace_id || ''),
        user_id: String(data.user_id || ''),
        title: String(data.title || 'New conversation'),
        created_at: (data.created_at as Timestamp) || Timestamp.now(),
        updated_at: (data.updated_at as Timestamp) || (data.created_at as Timestamp) || Timestamp.now(),
      } satisfies TutorThreadRecord;
    })
    .filter((thread) => thread.user_id === userId)
    .sort((a, b) => toMillis(b.updated_at) - toMillis(a.updated_at));

  return threads.map(mapThreadSummary);
}

export async function createTutorThread(input: {
  workspaceId: string;
  userId: string;
  title?: string;
}): Promise<TutorThreadSummary> {
  const thread = await createTutorThreadRecord(input);
  return mapThreadSummary(thread);
}

export async function updateTutorThread(
  threadId: string,
  userId: string,
  title: string,
): Promise<TutorThreadSummary> {
  const db = getDb();
  const thread = await getThreadRecord(threadId, userId);
  const nextTitle = normalizeThreadTitle(title);
  const updatedAt = Timestamp.now();

  await db.collection(TUTOR_THREADS_COLLECTION).doc(threadId).update({
    title: nextTitle,
    updated_at: updatedAt,
  });

  return mapThreadSummary({
    ...thread,
    title: nextTitle,
    updated_at: updatedAt,
  });
}

export async function listTutorMessages(
  threadId: string,
  userId: string,
  limit: number = 200,
): Promise<{ thread: TutorThreadSummary; messages: TutorMessageSummary[] }> {
  const db = getDb();
  const thread = await getThreadRecord(threadId, userId);

  const [messageSnapshot, citationSnapshot] = await Promise.all([
    db.collection(TUTOR_MESSAGES_COLLECTION).where('thread_id', '==', threadId).get(),
    db.collection(MESSAGE_CITATIONS_COLLECTION).where('thread_id', '==', threadId).get(),
  ]);

  const citationsByMessage = new Map<string, TutorCitation[]>();
  for (const citationDoc of citationSnapshot.docs) {
    const citation = citationDoc.data() as Partial<MessageCitationRecord>;
    const messageId = String(citation.message_id || '');
    if (!messageId) {
      continue;
    }

    const current = citationsByMessage.get(messageId) || [];
    current.push(
      mapCitationSummary({
        citation_id: citationDoc.id,
        message_id: messageId,
        thread_id: String(citation.thread_id || ''),
        workspace_id: String(citation.workspace_id || ''),
        source_id: String(citation.source_id || ''),
        file_name: String(citation.file_name || `Source ${citation.source_id || ''}`),
        label: String(citation.label || 'Reference'),
        page_number: typeof citation.page_number === 'number' ? citation.page_number : null,
        chunk_id: String(citation.chunk_id || ''),
        chunk_index: typeof citation.chunk_index === 'number' ? citation.chunk_index : 0,
        created_at: (citation.created_at as Timestamp) || Timestamp.now(),
      }),
    );
    citationsByMessage.set(messageId, current);
  }

  const allMessages = messageSnapshot.docs
    .map((doc) => {
      const data = doc.data() as Partial<TutorMessageRecord>;
      return {
        message_id: doc.id,
        thread_id: String(data.thread_id || ''),
        workspace_id: String(data.workspace_id || ''),
        user_id: String(data.user_id || ''),
        role: data.role === 'assistant' ? 'assistant' : 'user',
        content: String(data.content || ''),
        created_at: (data.created_at as Timestamp) || Timestamp.now(),
        updated_at: (data.updated_at as Timestamp) || (data.created_at as Timestamp) || Timestamp.now(),
      } satisfies TutorMessageRecord;
    })
    .sort((a, b) => toMillis(a.created_at) - toMillis(b.created_at));

  const messageWindow = limit > 0 ? allMessages.slice(-limit) : allMessages;

  return {
    thread: mapThreadSummary(thread),
    messages: messageWindow.map((message) =>
      mapMessageSummary(message, citationsByMessage.get(message.message_id)),
    ),
  };
}

export async function prepareTutorAssistantReply(
  input: PrepareTutorAssistantReplyInput,
): Promise<PrepareTutorAssistantReplyResult> {
  const db = getDb();
  const workspace = await assertWorkspaceAccess(input.workspaceId, input.userId);

  const workspacePersonality = String(workspace.tutor_personality || 'mentor') as TutorPersonality;
  const workspaceCustomInstructions =
    typeof workspace.tutor_custom_instructions === 'string' ? workspace.tutor_custom_instructions : undefined;

  const resolvedPersonality = input.personality || workspacePersonality;
  const resolvedCustomInstructions = input.customInstructions || workspaceCustomInstructions;
  await ensureTutorEntitlement(input.userId, resolvedPersonality);

  const threadRecord = input.threadId
    ? await getThreadRecord(input.threadId, input.userId)
    : await createTutorThreadRecord({
        workspaceId: input.workspaceId,
        userId: input.userId,
        title: inferThreadTitleFromMessage(input.message),
      });

  const history = await fetchThreadConversationHistory(threadRecord.thread_id);
  const retrieval = await retrieveTutorContext({
    workspaceId: input.workspaceId,
    query: input.message,
    conversationHistory: history,
    topK: 10,
  });

  const prompt = createTutorConversationPrompt(
    resolvedPersonality,
    resolvedCustomInstructions,
    history,
    input.message,
    retrieval.context || undefined,
  );

  const now = Timestamp.now();
  const userMessageRef = db.collection(TUTOR_MESSAGES_COLLECTION).doc();
  const assistantMessageRef = db.collection(TUTOR_MESSAGES_COLLECTION).doc();

  const userMessageRecord: TutorMessageRecord = {
    message_id: userMessageRef.id,
    thread_id: threadRecord.thread_id,
    workspace_id: threadRecord.workspace_id,
    user_id: input.userId,
    role: 'user',
    content: input.message,
    created_at: now,
    updated_at: now,
  };

  const assistantMessageRecord: TutorMessageRecord = {
    message_id: assistantMessageRef.id,
    thread_id: threadRecord.thread_id,
    workspace_id: threadRecord.workspace_id,
    user_id: input.userId,
    role: 'assistant',
    content: '',
    created_at: now,
    updated_at: now,
  };

  await Promise.all([
    userMessageRef.set(userMessageRecord),
    assistantMessageRef.set(assistantMessageRecord),
    db.collection(TUTOR_THREADS_COLLECTION).doc(threadRecord.thread_id).update({ updated_at: now }),
  ]);

  await persistMessageCitations({
    thread: threadRecord,
    assistantMessageId: assistantMessageRef.id,
    citations: retrieval.citations,
  });

  const citations = retrieval.citations.map((citation) => ({
    source_id: citation.source_id,
    file_name: citation.file_name,
    label: citation.label,
    page_number: citation.page_number,
    chunk_id: citation.chunk_id,
    chunk_index: citation.chunk_index,
  }));

  return {
    thread: mapThreadSummary({
      ...threadRecord,
      updated_at: now,
    }),
    userMessage: mapMessageSummary(userMessageRecord, undefined),
    assistantMessage: mapMessageSummary(assistantMessageRecord, citations),
    promptMessages: prompt.messages,
    citations,
  };
}

export async function finalizeTutorAssistantReply(args: {
  assistantMessageId: string;
  threadId: string;
  userId: string;
  content: string;
}): Promise<void> {
  const db = getDb();
  const thread = await getThreadRecord(args.threadId, args.userId);
  const now = Timestamp.now();

  await Promise.all([
    db.collection(TUTOR_MESSAGES_COLLECTION).doc(args.assistantMessageId).update({
      content: args.content,
      updated_at: now,
    }),
    db.collection(TUTOR_THREADS_COLLECTION).doc(thread.thread_id).update({
      updated_at: now,
    }),
  ]);
}

