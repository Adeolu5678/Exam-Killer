import { Timestamp } from 'firebase-admin/firestore';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';

async function verifyWorkspaceAccess(
  db: FirebaseFirestore.Firestore,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
  if (!workspaceDoc.exists) return false;
  const workspaceData = workspaceDoc.data();
  if (!workspaceData) return false;
  if (workspaceData.user_id === userId || workspaceData.is_public === true) return true;

  const memberSnapshot = await db
    .collection('workspace_members')
    .where('workspace_id', '==', workspaceId)
    .where('user_id', '==', userId)
    .limit(1)
    .get();

  return !memberSnapshot.empty;
}

function mapSession(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() as
    | {
        workspace_id?: string;
        title?: string;
        description?: string;
        category?: string;
        status?: string;
        start_time?: { toDate?: () => Date };
        end_time?: { toDate?: () => Date };
        duration_minutes?: number;
        is_recurring?: boolean;
        recurrence_days?: number[];
        completed_at?: { toDate?: () => Date };
        created_at?: { toDate?: () => Date };
        updated_at?: { toDate?: () => Date };
      }
    | undefined;

  return {
    id: doc.id,
    workspaceId: data?.workspace_id || '',
    title: data?.title || '',
    description: data?.description || undefined,
    category: data?.category || 'reading',
    status: data?.status || 'scheduled',
    startTime: data?.start_time?.toDate?.()?.toISOString() || new Date().toISOString(),
    endTime: data?.end_time?.toDate?.()?.toISOString() || new Date().toISOString(),
    durationMinutes: data?.duration_minutes || 0,
    isRecurring: data?.is_recurring || false,
    recurrenceDays: data?.recurrence_days || undefined,
    completedAt: data?.completed_at?.toDate?.()?.toISOString(),
    createdAt: data?.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data?.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export const POST = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];
  const sessionId = request.nextUrl.pathname.split('/')[6];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const sessionRef = db.collection('study_sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists || sessionDoc.data()?.workspace_id !== workspaceId) {
    return errorResponse('Study session not found', StatusCodes.NOT_FOUND);
  }

  await sessionRef.update({
    status: 'completed',
    completed_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });

  return successResponse(mapSession(await sessionRef.get()));
});
