import { NextRequest } from 'next/server';

import { initializeCheckout, initializeCheckoutRequestSchema } from '@/domains/billing';

import { getCurrentUser } from '@/shared/lib/firebase/server-auth';
import { apiError, apiSuccess } from '@/shared/lib/rebuild/api/responses';
import { AuthenticationError } from '@/shared/lib/rebuild/errors';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const payload = initializeCheckoutRequestSchema.parse(await request.json());
    const checkout = await initializeCheckout(user.uid, payload.plan, payload.trial);

    return apiSuccess(
      {
        authorization_url: checkout.authorization_url,
        reference: checkout.reference,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
