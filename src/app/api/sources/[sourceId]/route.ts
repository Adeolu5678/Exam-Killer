import { NextRequest } from 'next/server';

import { withAuth, successResponse, errorResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminStorage } from '@/shared/lib/firebase/admin';

/**
 * GET /api/sources/[sourceId]
 * Returns metadata and a temporary signed URL for the source file.
 */
async function getSourceWithAccess(
  db: FirebaseFirestore.Firestore,
  sourceId: string,
  userId: string,
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  const sourceDoc = await db.collection('sources').doc(sourceId).get();
  if (!sourceDoc.exists) return null;

  const sourceData = sourceDoc.data();
  if (!sourceData) return null;

  if (sourceData.user_id === userId) {
    return sourceDoc;
  }

  const workspaceId = sourceData.workspace_id;
  if (!workspaceId) return null;

  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  const workspaceData = workspaceDoc.data();
  if (!workspaceDoc.exists || !workspaceData) return null;

  if (workspaceData.user_id === userId || workspaceData.is_public === true) {
    return sourceDoc;
  }

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  return memberSnapshot.empty ? null : sourceDoc;
}

export const GET = withAuth(async (req, { db, userId }) => {
  const sourceId = req.nextUrl.pathname.split('/').pop();
  if (!sourceId) {
    return errorResponse('Source not found', StatusCodes.NOT_FOUND);
  }

  const sourceDoc = await getSourceWithAccess(db, sourceId, userId);
  if (!sourceDoc?.exists) {
    return errorResponse('Source not found', StatusCodes.NOT_FOUND);
  }

  const sourceData = sourceDoc.data() as any;
  if (!sourceData) {
    return errorResponse('Source data missing', StatusCodes.NOT_FOUND);
  }

  const storage = getAdminStorage();
  if (!storage) {
    return errorResponse('Storage not configured', StatusCodes.INTERNAL_ERROR);
  }

  const storagePath = sourceData.storage_path;
  if (!storagePath) {
    return errorResponse('Storage path missing for this source', StatusCodes.BAD_REQUEST);
  }

  try {
    const bucket = storage.bucket();
    const file = bucket.file(storagePath);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    return successResponse({
      id: sourceDoc.id,
      file_name: sourceData.file_name,
      type: sourceData.type,
      file_url: signedUrl,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return errorResponse('Failed to generate secure URL', StatusCodes.INTERNAL_ERROR);
  }
});

/**
 * DELETE /api/sources/[sourceId]
 * Deletes the source document, the file from storage, and associated vectors.
 */
export const DELETE = withAuth(async (req, { db, userId }) => {
  const sourceId = req.nextUrl.pathname.split('/').pop();
  if (!sourceId) {
    return errorResponse('Source not found', StatusCodes.NOT_FOUND);
  }

  const sourceDoc = await getSourceWithAccess(db, sourceId, userId);
  if (!sourceDoc?.exists) {
    return errorResponse('Source not found', StatusCodes.NOT_FOUND);
  }

  const sourceData = sourceDoc.data() as any;
  const workspaceId = sourceData.workspace_id;

  try {
    const storage = getAdminStorage();
    if (storage && sourceData.storage_path) {
      try {
        const bucket = storage.bucket();
        await bucket.file(sourceData.storage_path).delete();
      } catch (storageErr) {
        console.warn('Failed to delete file from storage (might already be gone):', storageErr);
      }
    }

    try {
      const { deleteBySource } = await import('@/shared/lib/rag/vector-store');
      await deleteBySource(sourceId, workspaceId);
    } catch (pineconeErr) {
      console.warn('Failed to delete vectors from Pinecone:', pineconeErr);
    }

    await db.collection('sources').doc(sourceId).delete();

    return successResponse({ success: true, message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting source:', error);
    return errorResponse('Failed to delete source', StatusCodes.INTERNAL_ERROR);
  }
});
