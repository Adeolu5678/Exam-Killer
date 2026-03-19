import { NextRequest } from 'next/server';

import { Firestore } from 'firebase-admin/firestore';

import { withAuth, successResponse, errorResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminDb, getAdminStorage, getStorageBucket } from '@/shared/lib/firebase/admin';
import { SourcesListResponse, UploadSourceResponse } from '@/shared/types/api';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Native UUID generation is preferred

function getSourceType(mimeType: string): 'pdf' | 'image' | 'text' {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  return 'text';
}

function extractWorkspaceId(request: NextRequest): string {
  return new URL(request.url).pathname.split('/')[3];
}

interface WorkspaceAccess {
  exists: boolean;
  hasAccess: boolean;
  isOwner: boolean;
}

async function verifyWorkspaceAccess(
  db: Firestore,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceAccess> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();

  if (!workspaceDoc.exists) {
    return { exists: false, hasAccess: false, isOwner: false };
  }

  const workspaceData = workspaceDoc.data();
  if (!workspaceData) {
    return { exists: false, hasAccess: false, isOwner: false };
  }

  const isOwner = workspaceData.user_id === userId;
  const hasAccess = isOwner || workspaceData.is_public === true;

  return { exists: true, hasAccess, isOwner };
}

export const GET = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  const access = await verifyWorkspaceAccess(db, workspaceId, userId);

  if (!access.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  if (!access.hasAccess) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const sourcesSnapshot = await db
    .collection('sources')
    .where('workspace_id', '==', workspaceId)
    .get();

  const total = sourcesSnapshot.docs.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedDocs = sourcesSnapshot.docs.slice(startIndex, endIndex);

  const sources = paginatedDocs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      workspace_id: data.workspace_id || '',
      user_id: data.user_id || '',
      type: data.type || 'text',
      file_url: data.file_url || '',
      file_name: data.file_name || '',
      file_size_bytes: data.file_size_bytes || 0,
      processed: data.processed || false,
      chunk_count: data.chunk_count || 0,
      embedding_status: data.embedding_status || 'pending',
      created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    };
  });

  const response: SourcesListResponse = {
    sources,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };

  return successResponse(response);
});

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = extractWorkspaceId(request);

  const access = await verifyWorkspaceAccess(db, workspaceId, userId);

  if (!access.exists) {
    return errorResponse('Workspace not found', StatusCodes.NOT_FOUND);
  }

  if (!access.isOwner) {
    return errorResponse('Access denied', StatusCodes.FORBIDDEN);
  }

  const storage = getAdminStorage();
  if (!storage) {
    return errorResponse('Storage not configured', StatusCodes.INTERNAL_ERROR);
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return errorResponse('No file provided', StatusCodes.BAD_REQUEST);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return errorResponse(
      'Invalid file type. Allowed: PDF, JPEG, PNG, GIF, WebP',
      StatusCodes.BAD_REQUEST,
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse('File size exceeds 10MB limit', StatusCodes.BAD_REQUEST);
  }

  const sourceId = crypto.randomUUID();
  const sourceType = getSourceType(file.type);
  const fileName = file.name;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const storagePath = `users/${userId}/workspaces/${workspaceId}/sources/${sourceId}_${fileName}`;
  const bucketName = getStorageBucket();
  if (!bucketName) {
    console.error('Storage bucket name not found in environment variables');
    return errorResponse('Storage bucket not configured', StatusCodes.INTERNAL_ERROR);
  }

  const bucket = storage.bucket(bucketName);
  const fileUpload = bucket.file(storagePath);

  await fileUpload.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });

  // Security: Files are private by default. Do NOT call makePublic().

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

  const sourceData = {
    source_id: sourceId,
    workspace_id: workspaceId,
    user_id: userId,
    type: sourceType,
    file_url: publicUrl,
    storage_path: storagePath, // Store path for easier retrieval/signed URLs
    file_name: fileName,
    file_size_bytes: file.size,
    processed: false,
    chunk_count: 0,
    embedding_status: 'pending',
    created_at: require('firebase-admin/firestore').Timestamp.now(),
  };

  const sourceRef = await db.collection('sources').add(sourceData);

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

  fetch(`${baseUrl}/api/sources/${sourceRef.id}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(async (processResponse) => {
      if (processResponse.ok) {
        const processResult = await processResponse.json();
        await sourceRef.update({
          processed: processResult.processed ?? true,
          chunk_count: processResult.chunk_count ?? 0,
          embedding_status: processResult.embedding_status ?? 'completed',
        });
      }
    })
    .catch((err) => {
      console.error('Failed to trigger document processing:', err);
    });

  const response: UploadSourceResponse = {
    source: {
      id: sourceRef.id,
      file_name: fileName,
      file_size_bytes: file.size,
      type: sourceType,
      processed: false,
      embedding_status: 'pending',
    },
  };

  return successResponse(response, StatusCodes.CREATED);
});
