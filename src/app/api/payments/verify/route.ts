import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { verifyPayment, isPaystackConfigured } from '@/shared/lib/paystack';
import {
  updateUserSubscription,
  updatePaymentStatus,
  getPaymentRecord,
} from '@/shared/lib/paystack/db';
import { calculateSubscriptionExpiry } from '@/shared/lib/paystack/subscription';
import type { SubscriptionPlan } from '@/shared/lib/paystack/subscription';

interface VerifyPaymentResponse {
  success: boolean;
  status: 'success' | 'failed';
  plan?: string;
  message?: string;
}

export const GET = withAuth(async (request, { db, userId }) => {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return errorResponse('Reference is required', StatusCodes.BAD_REQUEST);
  }

  if (!isPaystackConfigured()) {
    return errorResponse('Payment service is not configured', 503);
  }

  const paymentRecord = await getPaymentRecord(reference);

  if (!paymentRecord) {
    return errorResponse('Payment record not found', StatusCodes.NOT_FOUND);
  }

  if (paymentRecord.user_id !== userId) {
    return errorResponse('Unauthorized access to payment', StatusCodes.FORBIDDEN);
  }

  if (paymentRecord.status === 'success') {
    return successResponse({
      success: true,
      status: 'success',
      plan: paymentRecord.plan,
      message: 'Payment already verified',
    });
  }

  const verifyResult = await verifyPayment({ reference });

  if (!verifyResult.success || !verifyResult.data) {
    await updatePaymentStatus(reference, 'failed', {
      metadata: { error: verifyResult.message },
    });

    return errorResponse(
      verifyResult.message || 'Payment verification failed',
      StatusCodes.BAD_REQUEST,
    );
  }

  const { metadata, status, authorization } = verifyResult.data as any; // Cast for raw paystack data access if needed

  if (status !== 'success') {
    await updatePaymentStatus(reference, 'failed', {
      metadata: { status },
    });

    return successResponse({
      success: false,
      status: 'failed',
      message: 'Payment was not successful',
    });
  }

  const plan = (metadata?.plan || paymentRecord.plan) as SubscriptionPlan;
  const isTrial = metadata?.is_trial === true || paymentRecord.metadata?.is_trial === true;

  const subscriptionStart = new Date();
  let subscriptionEnd: Date;

  if (isTrial) {
    subscriptionEnd = new Date(
      metadata?.subscription_end || paymentRecord.metadata?.subscription_end || new Date(),
    );
  } else {
    subscriptionEnd = calculateSubscriptionExpiry(plan, subscriptionStart);
  }

  const subscriptionUpdated = await updateUserSubscription(userId, {
    subscription_tier: plan,
    subscription_status: 'active',
    subscription_start: subscriptionStart,
    subscription_end: subscriptionEnd,
    is_trial: isTrial,
    has_had_trial: isTrial ? true : undefined,
    paystack_authorization_code: authorization?.authorization_code,
  });

  if (!subscriptionUpdated) {
    console.error('Failed to update user subscription');
  }

  await updatePaymentStatus(reference, 'success', {
    transaction_id: verifyResult.data?.customer?.email,
    payment_method: 'card',
  });

  return successResponse({
    success: true,
    status: 'success',
    plan: plan,
    message: 'Payment verified successfully',
  });
});
