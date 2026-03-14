import { NextRequest } from 'next/server';

import {
  withAuth,
  parseBody,
  errorResponse,
  successResponse,
  StatusCodes,
} from '@/shared/lib/api/auth';
import { getAdminAuth } from '@/shared/lib/firebase/admin';
import { initializePayment, isPaystackConfigured } from '@/shared/lib/paystack';
import { getUserSubscription, createPaymentRecord } from '@/shared/lib/paystack/db';
import {
  SUBSCRIPTION_PLANS,
  calculateSubscriptionExpiry,
} from '@/shared/lib/paystack/subscription';
import type { SubscriptionPlan } from '@/shared/lib/paystack/subscription';

interface InitializePaymentRequest {
  plan: 'premium_monthly' | 'premium_annual';
  trial?: boolean;
}

export const POST = withAuth(async (request, { userId }) => {
  if (!isPaystackConfigured()) {
    return errorResponse('Payment service is not configured', 503);
  }

  const body = await parseBody<InitializePaymentRequest>(request);
  if (!body) {
    return errorResponse('Invalid request body', StatusCodes.BAD_REQUEST);
  }

  const { plan, trial } = body;

  if (!plan || (plan !== 'premium_monthly' && plan !== 'premium_annual')) {
    return errorResponse(
      'Invalid plan. Must be premium_monthly or premium_annual',
      StatusCodes.BAD_REQUEST,
    );
  }

  const userSubscription = await getUserSubscription(userId);

  if (userSubscription && userSubscription.status === 'active' && userSubscription.plan === plan) {
    return errorResponse('You are already subscribed to this plan', StatusCodes.BAD_REQUEST);
  }

  if (trial && userSubscription?.hasHadTrial) {
    return errorResponse('You have already used your free trial', StatusCodes.BAD_REQUEST);
  }

  const planDetails = SUBSCRIPTION_PLANS[plan as SubscriptionPlan];
  if (!planDetails) {
    return errorResponse('Invalid plan', StatusCodes.BAD_REQUEST);
  }

  const auth = getAdminAuth();
  if (!auth) {
    return errorResponse('Server configuration error', StatusCodes.INTERNAL_ERROR);
  }

  let userEmail = '';
  try {
    const userRecord = await auth.getUser(userId);
    userEmail = userRecord.email || '';
  } catch {
    return errorResponse('User not found', StatusCodes.NOT_FOUND);
  }

  if (!userEmail) {
    return errorResponse('User email not found', StatusCodes.BAD_REQUEST);
  }

  // If trial is requested, we charge a small tokenization fee of ₦50 (5000 kobo)
  // Monthly: 2 days free, Annual: 7 days free
  const amount = trial ? 5000 : planDetails.priceKobo;

  let subscriptionEnd: Date;
  if (trial) {
    subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + planDetails.trialDays);
  } else {
    subscriptionEnd = calculateSubscriptionExpiry(plan as SubscriptionPlan);
  }

  const paymentResult = await initializePayment({
    email: userEmail,
    amount,
    plan: plan as 'premium_monthly' | 'premium_annual',
    userId: userId,
    metadata: {
      subscription_end: subscriptionEnd.toISOString(),
      is_trial: !!trial,
    },
  });

  if (!paymentResult.success || !paymentResult.authorization_url || !paymentResult.reference) {
    return errorResponse(
      paymentResult.message || 'Failed to initialize payment',
      StatusCodes.INTERNAL_ERROR,
    );
  }

  await createPaymentRecord({
    reference: paymentResult.reference,
    user_id: userId,
    plan: plan as SubscriptionPlan,
    amount,
    status: 'pending',
    metadata: {
      subscription_end: subscriptionEnd.toISOString(),
      is_trial: !!trial,
    },
  });

  return successResponse(
    {
      success: true,
      authorizationUrl: paymentResult.authorization_url,
      reference: paymentResult.reference,
    },
    StatusCodes.CREATED,
  );
});
