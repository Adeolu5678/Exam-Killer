import { getBillingHistory } from '@/domains/billing';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError } from '@/shared/lib/rebuild/errors';

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const history = await getBillingHistory(user.uid);
    return apiSuccess(history);
  } catch (error) {
    return apiError(error);
  }
}
