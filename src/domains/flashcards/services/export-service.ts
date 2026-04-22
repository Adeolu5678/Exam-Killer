import { Firestore } from 'firebase-admin/firestore';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';

interface FlashcardExportRecord {
  id: string;
  front: string;
  back: string;
  tags: string[];
  source_id: string | null;
}

interface RawFlashcardRecord {
  front?: string;
  back?: string;
  tags?: unknown;
  source_id?: string | null;
}

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((tag) => String(tag));
}

async function assertWorkspaceOwnership(
  db: Firestore,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    throw new ValidationError('Workspace not found');
  }

  const workspaceData = workspaceDoc.data();
  if (!workspaceData || workspaceData.user_id !== userId) {
    throw new AuthorizationError('Access denied');
  }
}

function matchesTopic(tags: string[], topic: string): boolean {
  const normalizedTopic = topic.trim().toLowerCase();
  if (!normalizedTopic) {
    return true;
  }
  return tags.some((tag) => tag.toLowerCase().includes(normalizedTopic));
}

function toExportCard(id: string, data: RawFlashcardRecord): FlashcardExportRecord {
  return {
    id,
    front: String(data.front ?? ''),
    back: String(data.back ?? ''),
    tags: normalizeTags(data.tags),
    source_id: data.source_id ?? null,
  };
}

export async function listFlashcardsForExport(input: {
  userId: string;
  workspaceId: string;
  sourceId?: string;
  topic?: string;
}): Promise<FlashcardExportRecord[]> {
  const db = getDb();
  await assertWorkspaceOwnership(db, input.workspaceId, input.userId);

  const snapshot = await db.collection('flashcards').where('workspace_id', '==', input.workspaceId).get();
  let flashcards = snapshot.docs.map((doc) => toExportCard(doc.id, doc.data() as RawFlashcardRecord));

  if (input.sourceId) {
    flashcards = flashcards.filter((card) => card.source_id === input.sourceId);
  }

  if (input.topic) {
    flashcards = flashcards.filter((card) => matchesTopic(card.tags, input.topic!));
  }

  if (flashcards.length === 0) {
    throw new ValidationError('No flashcards found');
  }

  return flashcards;
}
