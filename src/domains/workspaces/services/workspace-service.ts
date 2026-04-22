import { Firestore, Timestamp } from 'firebase-admin/firestore';


import { getAdminDb, getAdminStorage, getStorageBucket } from '@/shared/lib/firebase/admin';
import { deleteByWorkspace } from '@/shared/lib/rag/vector-store';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceSummary,
  WorkspaceDetail,
  WorkspaceRole,
  WorkspaceRecord,
  TutorPersonality,
} from '../contracts/workspace';

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function toISOString(timestamp: Timestamp | Date | undefined): string {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  return timestamp.toISOString();
}

// -----------------------------------------------------------------------------
// Workspace access verification
// -----------------------------------------------------------------------------

export interface WorkspaceAccess {
  exists: boolean;
  hasAccess: boolean;
  isOwner: boolean;
  role: WorkspaceRole | null;
  workspaceData: FirebaseFirestore.DocumentData | null;
}

export async function verifyWorkspaceAccess(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceAccess> {
  const db = getDb();

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return { exists: false, hasAccess: false, isOwner: false, role: null, workspaceData: null };
  }

  const data = workspaceDoc.data();
  if (!data) {
    return { exists: false, hasAccess: false, isOwner: false, role: null, workspaceData: null };
  }

  // Check owner (supports both legacy user_id and canonical owner_user_id)
  const ownerId = data.owner_user_id || data.user_id;
  const isOwner = ownerId === userId;

  if (isOwner) {
    return { exists: true, hasAccess: true, isOwner: true, role: 'owner', workspaceData: data };
  }

  // Check membership
  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  if (!memberSnapshot.empty) {
    const memberData = memberSnapshot.docs[0].data();
    const role = (memberData.role || 'member') as WorkspaceRole;
    return { exists: true, hasAccess: true, isOwner: false, role, workspaceData: data };
  }

  // Public workspace grants read access
  if (data.is_public === true) {
    return { exists: true, hasAccess: true, isOwner: false, role: 'member', workspaceData: data };
  }

  return { exists: true, hasAccess: false, isOwner: false, role: null, workspaceData: data };
}

// -----------------------------------------------------------------------------
// Workspace CRUD operations
// -----------------------------------------------------------------------------

export async function listUserWorkspaces(
  userId: string,
  options: { page?: number; limit?: number; search?: string } = {},
): Promise<{ workspaces: WorkspaceSummary[]; total: number }> {
  const db = getDb();
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const search = (options.search ?? '').toLowerCase().trim();

  // Fetch owned workspaces
  const ownedSnapshot = await db
    .collection('workspaces')
    .where('user_id', '==', userId)
    .get();

  // Fetch memberships
  const memberSnapshot = await db
    .collection('workspace_members')
    .where('user_id', '==', userId)
    .get();

  const workspaceDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  
  ownedSnapshot.docs.forEach((doc) => workspaceDocs.set(doc.id, doc));

  // Fetch member workspaces
  if (!memberSnapshot.empty) {
    const memberWorkspaceIds = memberSnapshot.docs
      .map((d) => d.data().workspace_id as string | undefined)
      .filter((id): id is string => typeof id === 'string' && !workspaceDocs.has(id));

    if (memberWorkspaceIds.length > 0) {
      // Firestore 'in' query limited to 30 items
      for (let i = 0; i < memberWorkspaceIds.length; i += 30) {
        const batch = memberWorkspaceIds.slice(i, i + 30);
        const batchSnapshot = await db
          .collection('workspaces')
          .where('__name__', 'in', batch)
          .get();
        batchSnapshot.docs.forEach((doc) => workspaceDocs.set(doc.id, doc));
      }
    }
  }

  // Filter by search
  let filteredDocs = Array.from(workspaceDocs.values());
  if (search) {
    filteredDocs = filteredDocs.filter((doc) => {
      const name = String(doc.data().name || '').toLowerCase();
      return name.includes(search);
    });
  }

  // Build summaries with counts
  const summaries = await Promise.all(
    filteredDocs.map(async (doc) => {
      const data = doc.data();
      const workspaceId = doc.id;

      const [sourcesCount, flashcardsCount, membersCount] = await Promise.all([
        db.collection('sources').where('workspace_id', '==', workspaceId).count().get(),
        db.collection('flashcards').where('workspace_id', '==', workspaceId).count().get(),
        db.collection('workspace_members').where('workspace_id', '==', workspaceId).count().get(),
      ]);

      const summary: WorkspaceSummary = {
        id: workspaceId,
        name: data.name || '',
        description: data.description || '',
        course_code: data.course_code || null,
        university: data.university || null,
        tutor_personality: (data.tutor_personality || 'mentor') as TutorPersonality,
        is_public: data.is_public || false,
        owner_id: data.owner_user_id || data.user_id || '',
        member_count: (membersCount.data().count || 0) + 1,
        source_count: sourcesCount.data().count || 0,
        flashcard_count: flashcardsCount.data().count || 0,
        created_at: toISOString(data.created_at),
        last_accessed: toISOString(data.last_accessed),
      };

      return summary;
    }),
  );

  // Sort by last accessed
  summaries.sort((a, b) => b.last_accessed.localeCompare(a.last_accessed));

  const total = summaries.length;
  const startIndex = (page - 1) * limit;
  const paginatedSummaries = summaries.slice(startIndex, startIndex + limit);

  return { workspaces: paginatedSummaries, total };
}

export async function getWorkspaceDetail(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceDetail> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this workspace');
  }

  const db = getDb();
  const data = access.workspaceData!;

  // Fetch owner info
  const ownerId = data.owner_user_id || data.user_id;
  const ownerDoc = await db.collection('users').doc(ownerId).get();
  const ownerData = ownerDoc.data();

  // Fetch counts
  const [sourcesCount, flashcardsCount, membersCount] = await Promise.all([
    db.collection('sources').where('workspace_id', '==', workspaceId).count().get(),
    db.collection('flashcards').where('workspace_id', '==', workspaceId).count().get(),
    db.collection('workspace_members').where('workspace_id', '==', workspaceId).count().get(),
  ]);

  // Update last_accessed
  await db.collection('workspaces').doc(workspaceId).update({
    last_accessed: Timestamp.now(),
  });

  const detail: WorkspaceDetail = {
    id: workspaceId,
    name: data.name || '',
    description: data.description || '',
    course_code: data.course_code || null,
    university: data.university || null,
    tutor_personality: (data.tutor_personality || 'mentor') as TutorPersonality,
    tutor_custom_instructions: data.tutor_custom_instructions || null,
    is_public: data.is_public || false,
    owner_id: ownerId,
    member_count: (membersCount.data().count || 0) + 1,
    source_count: sourcesCount.data().count || 0,
    flashcard_count: flashcardsCount.data().count || 0,
    created_at: toISOString(data.created_at),
    last_accessed: new Date().toISOString(),
    owner: {
      id: ownerId,
      name: ownerData?.full_name || '',
      email: ownerData?.email || '',
    },
    user_role: access.role || 'member',
  };

  return detail;
}

export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceRequest,
  subscriptionCheck?: { plan: string; workspaceLimit: number | 'unlimited' },
): Promise<{ id: string; name: string; description: string }> {
  const db = getDb();

  const workspacesRef = db.collection('workspaces');
  const newWorkspaceRef = workspacesRef.doc();
  const workspaceId = newWorkspaceRef.id;
  const now = Timestamp.now();

  // Check workspace limit if subscription info provided
  if (subscriptionCheck && subscriptionCheck.workspaceLimit !== 'unlimited') {
    const existingCount = await db
      .collection('workspaces')
      .where('user_id', '==', userId)
      .count()
      .get();

    if (existingCount.data().count >= subscriptionCheck.workspaceLimit) {
      throw new ValidationError(
        'You have reached your workspace limit. Upgrade your plan for more workspaces.',
      );
    }
  }

  const workspaceData = {
    workspace_id: workspaceId,
    // Store both for backward compat during migration
    user_id: userId,
    owner_user_id: userId,
    name: input.name,
    description: input.description,
    course_code: input.course_code,
    university: input.university,
    tutor_personality: input.tutor_personality,
    tutor_custom_instructions: input.tutor_custom_instructions,
    is_public: input.is_public,
    created_at: now,
    last_accessed: now,
  };

  await newWorkspaceRef.set(workspaceData);

  appLogger.info('Workspace created', { workspaceId, userId });

  return {
    id: workspaceId,
    name: input.name,
    description: input.description,
  };
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceRequest,
): Promise<void> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  if (!access.isOwner) {
    throw new AuthorizationError('Only the workspace owner can update settings');
  }

  const db = getDb();
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.course_code !== undefined) updateData.course_code = input.course_code;
  if (input.university !== undefined) updateData.university = input.university;
  if (input.tutor_personality !== undefined) updateData.tutor_personality = input.tutor_personality;
  if (input.tutor_custom_instructions !== undefined) {
    updateData.tutor_custom_instructions = input.tutor_custom_instructions;
  }
  if (input.is_public !== undefined) updateData.is_public = input.is_public;

  if (Object.keys(updateData).length > 0) {
    await db.collection('workspaces').doc(workspaceId).update(updateData);
    appLogger.info('Workspace updated', { workspaceId, userId, fields: Object.keys(updateData) });
  }
}

export async function deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
  const access = await verifyWorkspaceAccess(workspaceId, userId);

  if (!access.exists) {
    throw new ValidationError('Workspace not found');
  }

  if (!access.isOwner) {
    throw new AuthorizationError('Only the workspace owner can delete the workspace');
  }

  const db = getDb();
  const batch = db.batch();

  // Delete related sources
  const sourcesSnapshot = await db
    .collection('sources')
    .where('workspace_id', '==', workspaceId)
    .get();

  // Delete source files from private storage bucket.
  const storage = getAdminStorage();
  const bucketName = getStorageBucket();
  if (storage && bucketName) {
    const bucket = storage.bucket(bucketName);
    await Promise.allSettled(
      sourcesSnapshot.docs.map(async (doc) => {
        const storagePath = doc.data().storage_path as string | undefined;
        if (!storagePath) {
          return;
        }
        await bucket.file(storagePath).delete();
      }),
    );
  }

  // Delete source vectors from Pinecone namespace when configured.
  if (process.env.PINECONE_API_KEY) {
    await deleteByWorkspace(workspaceId);
  } else {
    appLogger.warn('Skipping vector namespace deletion: Pinecone is not configured', {
      workspaceId,
    });
  }

  sourcesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete related flashcards
  const flashcardsSnapshot = await db
    .collection('flashcards')
    .where('workspace_id', '==', workspaceId)
    .get();
  flashcardsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete chat sessions
  const sessionsSnapshot = await db
    .collection('chat_sessions')
    .where('workspace_id', '==', workspaceId)
    .get();
  sessionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete tutor threads, messages, and citations.
  const [tutorThreadsSnapshot, tutorMessagesSnapshot, tutorCitationsSnapshot] = await Promise.all([
    db.collection('tutor_threads').where('workspace_id', '==', workspaceId).get(),
    db.collection('tutor_messages').where('workspace_id', '==', workspaceId).get(),
    db.collection('message_citations').where('workspace_id', '==', workspaceId).get(),
  ]);
  tutorThreadsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  tutorMessagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
  tutorCitationsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete vector chunks
  const chunksSnapshot = await db
    .collection('vector_chunks')
    .where('workspace_id', '==', workspaceId)
    .get();
  chunksSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete processing jobs
  const jobsSnapshot = await db
    .collection('source_processing_jobs')
    .where('workspace_id', '==', workspaceId)
    .get();
  jobsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete members
  const membersSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .get();
  membersSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

  // Delete the workspace
  batch.delete(db.collection('workspaces').doc(workspaceId));

  await batch.commit();

  appLogger.info('Workspace deleted', { workspaceId, userId });
}

