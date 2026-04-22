import { NextRequest } from 'next/server';

import { getGlobalStats } from '@/domains/analytics';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError } from '@/shared/lib/rebuild/errors';

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const stats = await getGlobalStats(user.uid);
    return apiSuccess(stats);
  } catch (error) {
    return apiError(error);
  }
}

