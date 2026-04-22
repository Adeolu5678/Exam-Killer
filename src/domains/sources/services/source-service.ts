import { Firestore, Timestamp } from 'firebase-admin/firestore';


import { getAdminDb, getAdminStorage, getStorageBucket } from '@/shared/lib/firebase/admin';
import { AuthorizationError, ConfigurationError, ValidationError } from '@/shared/lib/rebuild/errors';
import { appLogger } from '@/shared/lib/rebuild/logger';

import {
  deriveSourceType,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  normalizeSignedUrlExpiryMinutes,
} from '../contracts/source';
import type {
  SourceSummary,
  ProcessingStatus,
  SourceType,
} from '../contracts/source';

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

export interface SourceAccess {
  exists: boolean;
  hasAccess: boolean;
  isOwner: boolean;
  sourceData: FirebaseFirestore.DocumentData | null;
}

export async function verifySourceAccess(
  sourceId: string,
  userId: string,
): Promise<SourceAccess> {
  const db = getDb();

  const sourceDoc = await db.collection('sources').doc(sourceId).get();

  if (!sourceDoc.exists) {
    return { exists: false, hasAccess: false, isOwner: false, sourceData: null };
  }

  const data = sourceDoc.data();
  if (!data) {
    return { exists: false, hasAccess: false, isOwner: false, sourceData: null };
  }

  const isOwner = data.user_id === userId;

  if (isOwner) {
    return { exists: true, hasAccess: true, isOwner: true, sourceData: data };
  }

  const workspaceId = data.workspace_id;
  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  if (!memberSnapshot.empty) {
    return { exists: true, hasAccess: true, isOwner: false, sourceData: data };
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (workspaceDoc.exists) {
    const wsData = workspaceDoc.data();
    const wsOwnerId = wsData?.owner_user_id || wsData?.user_id;
    if (wsOwnerId === userId) {
      return { exists: true, hasAccess: true, isOwner: false, sourceData: data };
    }
  }

  return { exists: true, hasAccess: false, isOwner: false, sourceData: data };
}
export async function listWorkspaceSources(
  workspaceId: string,
  userId: string,
  options: { page?: number; limit?: number } = {},
): Promise<{ sources: SourceSummary[]; total: number }> {
  const db = getDb();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    throw new ValidationError('Workspace not found');
  }

  const wsData = workspaceDoc.data();
  const wsOwnerId = wsData?.owner_user_id || wsData?.user_id;
  const isOwner = wsOwnerId === userId;

  if (!isOwner) {
    const memberSnapshot = await db
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', userId)
      .limit(1)
      .get();

    if (memberSnapshot.empty && !wsData?.is_public) {
      throw new AuthorizationError('Access denied to this workspace');
    }
  }

  const sourcesSnapshot = await db
    .collection('sources')
    .where('workspace_id', '==', workspaceId)
    .orderBy('created_at', 'desc')
    .get();

  const total = sourcesSnapshot.docs.length;
  const startIndex = (page - 1) * limit;
  const paginatedDocs = sourcesSnapshot.docs.slice(startIndex, startIndex + limit);

  const sources: SourceSummary[] = paginatedDocs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      workspace_id: data.workspace_id || '',
      type: (data.type || 'text') as SourceType,
      file_name: data.file_name || '',
      file_size_bytes: data.file_size_bytes || 0,
      processed: data.processed || false,
      chunk_count: data.chunk_count || 0,
      embedding_status: (data.embedding_status || 'pending') as ProcessingStatus,
      processing_error: data.processing_error || null,
      created_at: toISOString(data.created_at),
    };
  });

  return { sources, total };
}

export async function getSourceDetail(
  sourceId: string,
  userId: string,
): Promise<SourceSummary> {
  const access = await verifySourceAccess(sourceId, userId);

  if (!access.exists) {
    throw new ValidationError('Source not found');
  }

  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this source');
  }

  const data = access.sourceData!;

  return {
    id: sourceId,
    workspace_id: data.workspace_id || '',
    type: (data.type || 'text') as SourceType,
    file_name: data.file_name || '',
    file_size_bytes: data.file_size_bytes || 0,
    processed: data.processed || false,
    chunk_count: data.chunk_count || 0,
    embedding_status: (data.embedding_status || 'pending') as ProcessingStatus,
    processing_error: data.processing_error || null,
    created_at: toISOString(data.created_at),
  };
}

export interface UploadSourceInput {
  workspaceId: string;
  userId: string;
  file: File;
}

export interface UploadSourceResult {
  sourceId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  sourceType: SourceType;
}

export async function uploadSource(input: UploadSourceInput): Promise<UploadSourceResult> {
  const { workspaceId, userId, file } = input;

  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    throw new ValidationError('Invalid file type. Allowed: PDF and plain text.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError('File size exceeds 50MB limit');
  }

  const db = getDb();
  const storage = getAdminStorage();

  if (!storage) {
    throw new ConfigurationError('Storage is not configured');
  }

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) {
    throw new ValidationError('Workspace not found');
  }

  const wsData = workspaceDoc.data();
  const wsOwnerId = wsData?.owner_user_id || wsData?.user_id;

  if (wsOwnerId !== userId) {
    throw new AuthorizationError('Only workspace owner can upload sources');
  }

  const sourceId = crypto.randomUUID();
  const sourceType = deriveSourceType(file.type);
  const fileName = file.name;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const storagePath = 'users/' + userId + '/workspaces/' + workspaceId + '/sources/' + sourceId + '_' + fileName;
  const bucketName = getStorageBucket();

  if (!bucketName) {
    throw new ConfigurationError('Storage bucket not configured');
  }

  const bucket = storage.bucket(bucketName);
  const fileUpload = bucket.file(storagePath);

  await fileUpload.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });

  const sourceData = {
    source_id: sourceId,
    workspace_id: workspaceId,
    user_id: userId,
    type: sourceType,
    storage_path: storagePath,
    file_name: fileName,
    file_size_bytes: file.size,
    mime_type: file.type,
    processed: false,
    chunk_count: 0,
    embedding_status: 'pending' as ProcessingStatus,
    processing_error: null,
    created_at: Timestamp.now(),
    processed_at: null,
  };

  const sourceRef = await db.collection('sources').add(sourceData);

  appLogger.info('Source uploaded', { sourceId: sourceRef.id, workspaceId, userId, fileName });

  return {
    sourceId: sourceRef.id,
    storagePath,
    fileName,
    fileSize: file.size,
    sourceType,
  };
}

export async function deleteSource(sourceId: string, userId: string): Promise<void> {
  const access = await verifySourceAccess(sourceId, userId);

  if (!access.exists) {
    throw new ValidationError('Source not found');
  }

  if (!access.isOwner) {
    throw new AuthorizationError('Only source owner can delete it');
  }

  const db = getDb();
  const storage = getAdminStorage();

  if (storage && access.sourceData?.storage_path) {
    const bucketName = getStorageBucket();
    if (bucketName) {
      try {
        const bucket = storage.bucket(bucketName);
        await bucket.file(access.sourceData.storage_path).delete();
      } catch (error) {
        appLogger.warn('Failed to delete source file from storage', { sourceId, error });
      }
    }
  }

  await db.collection('sources').doc(sourceId).delete();

  appLogger.info('Source deleted', { sourceId, userId });
}

export async function getSignedSourceUrl(
  sourceId: string,
  userId: string,
  expiresInMinutes: number = 15,
): Promise<string> {
  const access = await verifySourceAccess(sourceId, userId);

  if (!access.exists) {
    throw new ValidationError('Source not found');
  }

  if (!access.hasAccess) {
    throw new AuthorizationError('Access denied to this source');
  }

  const storage = getAdminStorage();
  if (!storage) {
    throw new ConfigurationError('Storage is not configured');
  }

  const storagePath = access.sourceData?.storage_path;
  if (!storagePath) {
    throw new ValidationError('Source file path not found');
  }

  const bucketName = getStorageBucket();
  if (!bucketName) {
    throw new ConfigurationError('Storage bucket not configured');
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(storagePath);
  const normalizedExpiryMinutes = normalizeSignedUrlExpiryMinutes(expiresInMinutes);

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + normalizedExpiryMinutes * 60 * 1000,
  });

  return url;
}

export async function setSourceProcessingStatus(
  sourceId: string,
  status: ProcessingStatus,
  options?: {
    chunkCount?: number;
    processingError?: string | null;
  },
): Promise<void> {
  const db = getDb();

  const updateData: Record<string, unknown> = {
    embedding_status: status,
  };

  if (status === 'pending' || status === 'processing') {
    updateData.processed = false;
    updateData.processed_at = null;
    updateData.processing_error = null;
    if (options?.chunkCount !== undefined) {
      updateData.chunk_count = options.chunkCount;
    }
  }

  if (status === 'completed') {
    updateData.processed = true;
    updateData.processed_at = Timestamp.now();
    updateData.processing_error = null;
    if (options?.chunkCount !== undefined) {
      updateData.chunk_count = options.chunkCount;
    }
  }

  if (status === 'failed') {
    updateData.processed = false;
    updateData.processed_at = null;
    updateData.processing_error = options?.processingError || 'Source processing failed';
  }

  await db.collection('sources').doc(sourceId).update(updateData);

  appLogger.info('Source processing status updated', { sourceId, status });
}

export async function acquireProcessingLock(
  sourceId: string,
  userId: string,
): Promise<{ acquired: boolean; sourceData?: FirebaseFirestore.DocumentData }> {
  const db = getDb();
  const sourceRef = db.collection('sources').doc(sourceId);

  return db.runTransaction(async (transaction) => {
    const sourceDoc = await transaction.get(sourceRef);

    if (!sourceDoc.exists) {
      return { acquired: false };
    }

    const sourceData = sourceDoc.data();
    if (!sourceData) {
      return { acquired: false };
    }

    if (sourceData.user_id !== userId) {
      return { acquired: false };
    }

    if (sourceData.processed) {
      return { acquired: false };
    }

    if (sourceData.embedding_status === 'processing') {
      return { acquired: false };
    }

    transaction.update(sourceRef, {
      embedding_status: 'processing',
    });

    return { acquired: true, sourceData };
  });
}
