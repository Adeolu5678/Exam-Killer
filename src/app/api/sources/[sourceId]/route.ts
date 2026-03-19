import { NextRequest } from 'next/server';

import {
  withAuth,
  withOwnership,
  successResponse,
  errorResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { getAdminStorage } from '@/shared/lib/firebase/admin';

/**
 * GET /api/sources/[sourceId]
 * Returns metadata and a temporary signed URL for the source file.
 */
export const GET = withAuth(
  withOwnership(
    async (req, { db, userId }, sourceDoc: any) => {
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
        // Fallback for older sources if they only have file_url
        // (Though in production readiness we should ideally migrate them)
        return errorResponse('Storage path missing for this source', StatusCodes.BAD_REQUEST);
      }

      try {
        const bucket = storage.bucket();
        const file = bucket.file(storagePath);

        // Generate a signed URL that expires in 1 hour
        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        return successResponse({
          id: sourceDoc.id,
          file_name: sourceData.file_name,
          type: sourceData.type,
          file_url: signedUrl, // Return the signed URL instead of the public one
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
      } catch (error) {
        console.error('Error generating signed URL:', error);
        return errorResponse('Failed to generate secure URL', StatusCodes.INTERNAL_ERROR);
      }
    },
    async (req, { db }) => {
      const sourceId = req.nextUrl.pathname.split('/').pop();
      if (!sourceId) return null;
      const doc = await db.collection('sources').doc(sourceId).get();
      return doc.exists ? doc : null;
    },
    (doc) => doc.data()?.user_id,
  ),
);

/**
 * DELETE /api/sources/[sourceId]
 * Deletes the source document, the file from storage, and associated vectors.
 */
export const DELETE = withAuth(
  withOwnership(
    async (req, { db, userId }, sourceDoc: any) => {
      const sourceData = sourceDoc.data() as any;
      const sourceId = sourceDoc.id;
      const workspaceId = sourceData.workspace_id;

      try {
        // 1. Delete from Firebase Storage
        const storage = getAdminStorage();
        if (storage && sourceData.storage_path) {
          try {
            const bucket = storage.bucket();
            await bucket.file(sourceData.storage_path).delete();
          } catch (storageErr) {
            console.warn('Failed to delete file from storage (might already be gone):', storageErr);
          }
        }

        // 2. Delete from Pinecone
        try {
          const { deleteBySource } = await import('@/shared/lib/rag/vector-store');
          await deleteBySource(sourceId, workspaceId);
        } catch (pineconeErr) {
          console.warn('Failed to delete vectors from Pinecone:', pineconeErr);
        }

        // 3. Delete from Firestore
        await db.collection('sources').doc(sourceId).delete();

        return successResponse({ success: true, message: 'Source deleted successfully' });
      } catch (error) {
        console.error('Error deleting source:', error);
        return errorResponse('Failed to delete source', StatusCodes.INTERNAL_ERROR);
      }
    },
    async (req, { db }) => {
      const sourceId = req.nextUrl.pathname.split('/').pop();
      if (!sourceId) return null;
      const doc = await db.collection('sources').doc(sourceId).get();
      return doc.exists ? doc : null;
    },
    (doc) => doc.data()?.user_id,
  ),
);
