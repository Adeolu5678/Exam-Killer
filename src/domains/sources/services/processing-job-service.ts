import { Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

import { getAdminDb } from '@/shared/lib/firebase/admin';
import { ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

import { setSourceProcessingStatus } from './source-service';

export const SOURCE_PROCESSING_JOBS_COLLECTION = 'source_processing_jobs';
export const MAX_SOURCE_PROCESSING_JOB_RETRIES = 3;

export type SourceProcessingJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type SourceProcessingJobTrigger = 'upload' | 'manual';

export interface SourceProcessingJobRecord {
  job_id: string;
  source_id: string;
  workspace_id: string;
  user_id: string;
  trigger: SourceProcessingJobTrigger;
  status: SourceProcessingJobStatus;
  attempt_count: number;
  chunk_count: number;
  last_error: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
}

export interface EnqueueSourceProcessingJobInput {
  sourceId: string;
  workspaceId: string;
  userId: string;
  trigger: SourceProcessingJobTrigger;
}

export interface EnqueueSourceProcessingJobResult {
  jobId: string;
  deduped: boolean;
}

export interface ClaimedSourceProcessingJob {
  jobId: string;
  sourceId: string;
  workspaceId: string;
  userId: string;
  attemptCount: number;
}

function getDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }
  return db;
}

function isInFlightStatus(status: unknown): boolean {
  return status === 'queued' || status === 'processing';
}

export async function enqueueSourceProcessingJob(
  input: EnqueueSourceProcessingJobInput,
): Promise<EnqueueSourceProcessingJobResult> {
  const db = getDb();
  const { sourceId, workspaceId, userId, trigger } = input;

  const sourceRef = db.collection('sources').doc(sourceId);
  const sourceDoc = await sourceRef.get();

  if (!sourceDoc.exists) {
    throw new ValidationError('Source not found');
  }

  const sourceData = sourceDoc.data();
  if (!sourceData) {
    throw new ValidationError('Source data is missing');
  }

  // Keep one active job per source to avoid duplicate worker fan-out.
  const existingJobsSnapshot = await db
    .collection(SOURCE_PROCESSING_JOBS_COLLECTION)
    .where('source_id', '==', sourceId)
    .limit(10)
    .get();

  const existingInFlightJob = existingJobsSnapshot.docs.find((doc) =>
    isInFlightStatus(doc.data().status),
  );

  if (existingInFlightJob) {
    return {
      jobId: existingInFlightJob.id,
      deduped: true,
    };
  }

  const now = Timestamp.now();
  const jobRef = db.collection(SOURCE_PROCESSING_JOBS_COLLECTION).doc();

  const jobData: SourceProcessingJobRecord = {
    job_id: jobRef.id,
    source_id: sourceId,
    workspace_id: workspaceId,
    user_id: userId,
    trigger,
    status: 'queued',
    attempt_count: 0,
    chunk_count: 0,
    last_error: null,
    created_at: now,
    updated_at: now,
    started_at: null,
    finished_at: null,
  };

  await jobRef.set(jobData);

  // Reset source state so UI reflects queued processing immediately.
  await setSourceProcessingStatus(sourceId, 'pending', { chunkCount: 0 });

  appLogger.info('Source processing job queued', {
    jobId: jobRef.id,
    sourceId,
    workspaceId,
    trigger,
  });

  return {
    jobId: jobRef.id,
    deduped: false,
  };
}

export async function claimSourceProcessingJob(
  jobId: string,
): Promise<ClaimedSourceProcessingJob | null> {
  const db = getDb();
  const jobRef = db.collection(SOURCE_PROCESSING_JOBS_COLLECTION).doc(jobId);

  return db.runTransaction(async (tx) => {
    const jobDoc = await tx.get(jobRef);

    if (!jobDoc.exists) {
      return null;
    }

    const data = jobDoc.data();
    if (!data || data.status !== 'queued') {
      return null;
    }

    const nextAttemptCount = Number(data.attempt_count || 0) + 1;

    tx.update(jobRef, {
      status: 'processing',
      started_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      attempt_count: FieldValue.increment(1),
      last_error: null,
    });

    return {
      jobId,
      sourceId: String(data.source_id || ''),
      workspaceId: String(data.workspace_id || ''),
      userId: String(data.user_id || ''),
      attemptCount: nextAttemptCount,
    };
  });
}

export async function completeSourceProcessingJob(
  jobId: string,
  chunkCount: number,
): Promise<void> {
  const db = getDb();

  await db.collection(SOURCE_PROCESSING_JOBS_COLLECTION).doc(jobId).update({
    status: 'completed',
    chunk_count: chunkCount,
    finished_at: Timestamp.now(),
    updated_at: Timestamp.now(),
    last_error: null,
  });
}

export async function requeueSourceProcessingJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const db = getDb();

  await db.collection(SOURCE_PROCESSING_JOBS_COLLECTION).doc(jobId).update({
    status: 'queued',
    last_error: errorMessage,
    updated_at: Timestamp.now(),
  });
}

export async function failSourceProcessingJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const db = getDb();

  await db.collection(SOURCE_PROCESSING_JOBS_COLLECTION).doc(jobId).update({
    status: 'failed',
    last_error: errorMessage,
    finished_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });
}
