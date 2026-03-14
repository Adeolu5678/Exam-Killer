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
