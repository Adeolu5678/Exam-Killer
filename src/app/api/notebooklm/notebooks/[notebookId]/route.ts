import { NextRequest, NextResponse } from 'next/server';

import { withAuth, StatusCodes, errorResponse, successResponse } from '@/shared/lib/api/auth';
import { getUserNotebookByNlmId, deleteUserNotebook } from '@/shared/lib/notebooklm';
import { NlmMcpClient } from '@/shared/lib/notebooklm/client';

/**
 * Helper to extract notebookId from URL
 * URL pattern: /api/notebooklm/notebooks/[notebookId]
 */
function extractNotebookId(request: NextRequest): string | null {
  const pathParts = new URL(request.url).pathname.split('/');
  return pathParts[4] || null;
}

export const DELETE = withAuth(async (req, { userId }) => {
  try {
    const notebookId = extractNotebookId(req);
    if (!notebookId) {
      return errorResponse('Notebook ID required', StatusCodes.BAD_REQUEST);
    }

    // 1. Verify ownership and existence
    const userNotebook = await getUserNotebookByNlmId(notebookId);
    if (!userNotebook) {
      return errorResponse('Notebook not found', StatusCodes.NOT_FOUND);
    }

    if (userNotebook.app_user_id !== userId) {
      return errorResponse('Forbidden', StatusCodes.FORBIDDEN);
    }

    // 2. Delete notebook from NLM
    const nlmClient = new NlmMcpClient();
    try {
      await nlmClient.deleteNotebook(userNotebook.profile_name, notebookId);
    } catch (err: any) {
      console.error('NLM Deletion Error (NotebookLM side):', err);
      // We continue with Firestore deletion as best effort
    }

    // 3. Delete Firestore record
    try {
      await deleteUserNotebook(userNotebook.workspace_id);
    } catch (err: any) {
      console.error('Firestore Deletion Error (user_notebooks):', err);
      return errorResponse('Failed to delete notebook record from Firestore', 500);
    }

    return successResponse({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/notebooklm/notebooks/[notebookId] error:', error);
    return errorResponse('Internal server error', StatusCodes.INTERNAL_ERROR);
  }
});
