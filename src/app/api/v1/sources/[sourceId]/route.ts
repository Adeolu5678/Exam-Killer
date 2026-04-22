import { NextRequest } from 'next/server';

import {
  getSourceDetail,
  deleteSource,
} from '@/domains/sources';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError } from '@/shared/lib/rebuild/errors';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { sourceId } = await context.params;
    const source = await getSourceDetail(sourceId, user.uid);
    return apiSuccess(source);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const { sourceId } = await context.params;
    await deleteSource(sourceId, user.uid);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
