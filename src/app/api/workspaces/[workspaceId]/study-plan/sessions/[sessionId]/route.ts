import { Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

import {
  withAuth,
  parseBodyWithZod,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';

const SessionUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['reading', 'practice', 'review', 'exam-prep', 'break']).optional(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'skipped']).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceDays: z.array(z.number().int().min(0).max(6)).optional(),
});

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

export const GET = withAuth(async (request, { db, userId }) => {
  const workspaceId = request.nextUrl.pathname.split('/')[3];
  const sessionId = request.nextUrl.pathname.split('/')[6];

  if (!(await verifyWorkspaceAccess(db, workspaceId, userId))) {
    return errorResponse('Workspace not found or access denied', StatusCodes.NOT_FOUND);
  }

  const sessionDoc = await db.collection('study_sessions').doc(sessionId).get();
  if (!sessionDoc.exists || sessionDoc.data()?.workspace_id !== workspaceId) {
    return errorResponse('Study session not found', StatusCodes.NOT_FOUND);
  }

  return successResponse(mapSession(sessionDoc));
});

export const PATCH = withAuth(async (request, { db, userId }) => {
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

  const { data, error } = await parseBodyWithZod(request, SessionUpdateSchema);
  if (error) return error;
  if (!data) return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);

  const updateData: Record<string, unknown> = { updated_at: Timestamp.now() };
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.category !== undefined) updateData.category = data.category;
  if (data.status !== undefined) {
    updateData.status = data.status;
    updateData.completed_at =
      data.status === 'completed' ? Timestamp.now() : sessionDoc.data()?.completed_at || null;
  }
  if (data.startTime !== undefined)
    updateData.start_time = Timestamp.fromDate(new Date(data.startTime));
  if (data.endTime !== undefined) updateData.end_time = Timestamp.fromDate(new Date(data.endTime));
  if (data.isRecurring !== undefined) updateData.is_recurring = data.isRecurring;
  if (data.recurrenceDays !== undefined) updateData.recurrence_days = data.recurrenceDays;

  const nextStart = data.startTime
    ? new Date(data.startTime)
    : sessionDoc.data()?.start_time?.toDate?.();
  const nextEnd = data.endTime ? new Date(data.endTime) : sessionDoc.data()?.end_time?.toDate?.();
  if (nextStart && nextEnd) {
    updateData.duration_minutes = Math.max(
      0,
      Math.round((nextEnd.getTime() - nextStart.getTime()) / 60000),
    );
  }

  await sessionRef.update(updateData);
  return successResponse(mapSession(await sessionRef.get()));
});

export const DELETE = withAuth(async (request, { db, userId }) => {
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

  await sessionRef.delete();
  return successResponse(null, StatusCodes.OK);
});
