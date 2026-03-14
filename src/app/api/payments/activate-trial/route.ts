import { NextRequest, NextResponse } from 'next/server';

import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminAuth } from '@/shared/lib/firebase/admin';
import { chargeAuthorization, isPaystackConfigured } from '@/shared/lib/paystack';
import {
  getUserSubscription,
  updateUserSubscription,
  createPaymentRecord,
} from '@/shared/lib/paystack/db';
import {
  SUBSCRIPTION_PLANS,
  calculateSubscriptionExpiry,
} from '@/shared/lib/paystack/subscription';
import type { SubscriptionPlan } from '@/shared/lib/paystack/subscription';

/**
 * This route is used to manually trigger the full charge after a trial period ends.
 * In a production environment, this should be called by a cron job or background task.
 */
export const POST = withAuth(async (request, { userId }) => {
  if (!isPaystackConfigured()) {
    return errorResponse('Payment service is not configured', 503);
  }

  const userSubscription = await getUserSubscription(userId);

  if (!userSubscription || userSubscription.status !== 'active' || !userSubscription.isTrial) {
    return errorResponse('No active trial found for this user', StatusCodes.BAD_REQUEST);
  }

  if (!userSubscription.paystackAuthorizationCode) {
    return errorResponse('No authorization code found for this user', StatusCodes.BAD_REQUEST);
  }

  const now = new Date();
  if (userSubscription.currentPeriodEnd && userSubscription.currentPeriodEnd > now) {
    // Trial has not expired yet, but we allow manual activation if the user wants to upgrade early
    // Or we just return success if it's already active
  }

  const planDetails = SUBSCRIPTION_PLANS[userSubscription.plan];

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

  const reference = `plan_act_${userId}_${Date.now()}`;

  const chargeResult = await chargeAuthorization({
    email: userEmail,
    amount: planDetails.priceKobo,
    authorization_code: userSubscription.paystackAuthorizationCode,
    reference,
    metadata: {
      userId,
      plan: userSubscription.plan,
      is_trial_activation: true,
    },
  });

  if (!chargeResult.success || !chargeResult.data) {
    return errorResponse(
      chargeResult.message || 'Failed to charge authorization',
      StatusCodes.INTERNAL_ERROR,
    );
  }

  const subscriptionEnd = calculateSubscriptionExpiry(userSubscription.plan);

  await updateUserSubscription(userId, {
    subscription_status: 'active',
    is_trial: false,
    subscription_start: now,
    subscription_end: subscriptionEnd,
  });

  await createPaymentRecord({
    reference,
    user_id: userId,
    plan: userSubscription.plan,
    amount: planDetails.priceKobo,
    status: 'success',
    transaction_id: chargeResult.data.reference,
    payment_method: 'card',
    metadata: {
      activation: true,
    },
  });

  return successResponse({
    success: true,
    message: 'Subscription activated successfully',
  });
});
