import { Timestamp } from 'firebase-admin/firestore';

import { getAdminDb } from '@/shared/lib/firebase/admin';

import { UserNotebook, NlmJob } from './types';

/**
 * Creates a new user_notebooks document after a notebook is created in NLM.
 */
export async function createUserNotebook(
  data: Omit<UserNotebook, 'id' | 'created_at'>,
): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const ref = db.collection('user_notebooks').doc();
  await ref.set({
    ...data,
    id: ref.id,
    created_at: Timestamp.now(),
  });
  return ref.id;
}

/**
 * Returns the UserNotebook for a given workspace. Returns null if not yet linked.
 */
export async function getUserNotebook(workspaceId: string): Promise<UserNotebook | null> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const snapshot = await db
    .collection('user_notebooks')
    .where('workspace_id', '==', workspaceId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserNotebook;
}

/**
 * Returns the UserNotebook by its NLM notebook ID.
 */
export async function getUserNotebookByNlmId(notebookId: string): Promise<UserNotebook | null> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const snapshot = await db
    .collection('user_notebooks')
    .where('notebook_id', '==', notebookId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as UserNotebook;
}

/**
 * Deletes the Firestore mapping record.
 */
export async function deleteUserNotebook(workspaceId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const snapshot = await db
    .collection('user_notebooks')
    .where('workspace_id', '==', workspaceId)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

/**
 * Creates a new nlm_jobs document for long-running generations.
 */
export async function createJob(
  data: Omit<NlmJob, 'job_id' | 'created_at' | 'completed_at' | 'retry_count'>,
): Promise<string> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const ref = db.collection('nlm_jobs').doc();
  await ref.set({
    ...data,
    job_id: ref.id,
    created_at: Timestamp.now(),
    completed_at: null,
    retry_count: 0,
  });
  return ref.id;
}

/**
 * Returns an NlmJob by its ID.
 */
export async function getJob(jobId: string): Promise<NlmJob | null> {
  const db = getAdminDb();
  if (!db) throw new Error('Firebase Admin not initialized');

  const doc = await db.collection('nlm_jobs').doc(jobId).get();
  if (!doc.exists) return null;
  return doc.data() as NlmJob;
}
