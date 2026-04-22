import type { Firestore } from 'firebase-admin/firestore';

import type { BillingStatus, PaymentHistory } from '@/domains/billing/contracts/billing';

import { getAdminAuth, getAdminDb } from '@/shared/lib/firebase/admin';
import {
  initializePayment,
  isPaystackConfigured,
  verifyPayment,
  verifyWebhookSignature,
} from '@/shared/lib/paystack';
import {
  createPaymentRecord,
  getPaymentRecord,
  getUserPaymentHistory,
  getUserSubscription,
  getUserUsageStats,
  updatePaymentStatus,
  updateUserSubscription,
} from '@/shared/lib/paystack/db';
import {
  SUBSCRIPTION_PLANS,
  calculateSubscriptionExpiry,
  canAccessFeature,
  checkUserLimits,
  type SubscriptionPlan,
} from '@/shared/lib/paystack/subscription';
import {
  buildEventDedupeKey,
  extractCustomerCode,
  extractEventTimestampMs,
  extractPlanFromEvent,
  extractUserIdFromMetadata,
  extractWebhookReference,
  type PaystackWebhookEvent,
} from '@/shared/lib/paystack/webhook-helpers';
import {
  AppError,
  AuthorizationError,
  ConfigurationError,
  ValidationError,
} from '@/shared/lib/rebuild/errors';

const WEBHOOK_MAX_AGE_MS = 10 * 60 * 1000;
const WEBHOOK_FUTURE_SKEW_MS = 2 * 60 * 1000;
const PROCESSED_WEBHOOK_TTL_DAYS = 14;
const PREMIUM_PLANS: SubscriptionPlan[] = ['premium_monthly', 'premium_annual'];

interface VerifyCheckoutResult {
  success: boolean;
  status: 'success' | 'failed';
  plan: SubscriptionPlan;
  message: string;
}

interface ParsedPaymentMetadata {
  plan: SubscriptionPlan | null;
  isTrial: boolean;
  subscriptionEnd: Date | null;
}

function parseDateOrNull(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists';
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function parsePaymentMetadata(metadataValue: unknown): ParsedPaymentMetadata {
  const metadata = asRecord(metadataValue);
  const planValue = metadata.plan;
  const resolvedPlan =
    typeof planValue === 'string' && PREMIUM_PLANS.includes(planValue as SubscriptionPlan)
      ? (planValue as SubscriptionPlan)
      : null;

  return {
    plan: resolvedPlan,
    isTrial: metadata.is_trial === true,
    subscriptionEnd: parseDateOrNull(metadata.subscription_end),
  };
}

async function resolveUserId(event: PaystackWebhookEvent): Promise<string | null> {
  const fromMetadata = extractUserIdFromMetadata(event);
  if (fromMetadata) {
    return fromMetadata;
  }

  const reference = extractWebhookReference(event);
  if (reference) {
    const paymentRecord = await getPaymentRecord(reference);
    if (paymentRecord) {
      return paymentRecord.user_id;
    }
  }

  const customerCode = extractCustomerCode(event);
  if (!customerCode) {
    return null;
  }

  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }

  const snapshot = await db
    .collection('users')
    .where('paystack_customer_code', '==', customerCode)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0]?.id ?? null;
}

async function cleanupExpiredProcessedWebhooks(db: Firestore, now: Date): Promise<void> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - PROCESSED_WEBHOOK_TTL_DAYS);

  const snapshot = await db
    .collection('processed_webhooks')
    .where('processed_at', '<=', cutoff)
    .limit(100)
    .get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

function assertPaystackConfigured(): void {
  if (!isPaystackConfigured()) {
    throw new ConfigurationError('Payment service is not configured');
  }
}

export async function initializeCheckout(
  userId: string,
  plan: 'premium_monthly' | 'premium_annual',
  trial: boolean,
): Promise<{ authorization_url: string; reference: string }> {
  assertPaystackConfigured();

  const userSubscription = await getUserSubscription(userId);
  if (userSubscription && userSubscription.status === 'active' && userSubscription.plan === plan) {
    throw new ValidationError('You are already subscribed to this plan');
  }

  if (trial && userSubscription?.hasHadTrial) {
    throw new ValidationError('You have already used your free trial');
  }

  const planDetails = SUBSCRIPTION_PLANS[plan];
  if (!planDetails) {
    throw new ValidationError('Invalid plan');
  }

  const auth = getAdminAuth();
  if (!auth) {
    throw new ConfigurationError('Authentication service is not configured');
  }

  let userEmail = '';
  try {
    const userRecord = await auth.getUser(userId);
    userEmail = userRecord.email ?? '';
  } catch {
    throw new ValidationError('User not found');
  }

  if (!userEmail) {
    throw new ValidationError('User email not found');
  }

  const amount = trial ? 5000 : planDetails.priceKobo;
  const now = new Date();
  const subscriptionEnd = trial
    ? new Date(now.getTime() + planDetails.trialDays * 24 * 60 * 60 * 1000)
    : calculateSubscriptionExpiry(plan, now);

  const paymentResult = await initializePayment({
    email: userEmail,
    amount,
    plan,
    userId,
    metadata: {
      subscription_end: subscriptionEnd.toISOString(),
      is_trial: trial,
    },
  });

  if (!paymentResult.success || !paymentResult.authorization_url || !paymentResult.reference) {
    throw new AppError({
      code: 'PAYMENT_INITIALIZATION_FAILED',
      message: paymentResult.message ?? 'Failed to initialize payment',
      status: 502,
    });
  }

  const paymentRecordReference = await createPaymentRecord({
    reference: paymentResult.reference,
    user_id: userId,
    plan,
    amount,
    status: 'pending',
    metadata: {
      subscription_end: subscriptionEnd.toISOString(),
      is_trial: trial,
    },
  });

  if (!paymentRecordReference) {
    throw new AppError({
      code: 'PAYMENT_RECORD_WRITE_FAILED',
      message: 'Failed to persist payment record',
      status: 500,
      expose: false,
    });
  }

  return {
    authorization_url: paymentResult.authorization_url,
    reference: paymentResult.reference,
  };
}

export async function verifyCheckout(reference: string, userId: string): Promise<VerifyCheckoutResult> {
  assertPaystackConfigured();

  const paymentRecord = await getPaymentRecord(reference);
  if (!paymentRecord) {
    throw new ValidationError('Payment record not found');
  }

  if (paymentRecord.user_id !== userId) {
    throw new AuthorizationError('Unauthorized access to payment');
  }

  if (paymentRecord.status === 'success') {
    return {
      success: true,
      status: 'success',
      plan: paymentRecord.plan,
      message: 'Payment already verified',
    };
  }

  const verifyResult = await verifyPayment({ reference });
  if (!verifyResult.success || !verifyResult.data) {
    await updatePaymentStatus(reference, 'failed', {
      metadata: { error: verifyResult.message },
    });
    throw new ValidationError(verifyResult.message ?? 'Payment verification failed');
  }

  if (verifyResult.data.status !== 'success') {
    await updatePaymentStatus(reference, 'failed', {
      metadata: { status: verifyResult.data.status },
    });
    return {
      success: false,
      status: 'failed',
      plan: paymentRecord.plan,
      message: 'Payment was not successful',
    };
  }

  const parsedMetadata = parsePaymentMetadata(verifyResult.data.metadata);
  const plan = parsedMetadata.plan ?? paymentRecord.plan;
  const isTrial = parsedMetadata.isTrial || paymentRecord.metadata?.is_trial === true;
  const subscriptionStart = new Date();
  const subscriptionEnd =
    isTrial && parsedMetadata.subscriptionEnd
      ? parsedMetadata.subscriptionEnd
      : calculateSubscriptionExpiry(plan, subscriptionStart);

  const subscriptionUpdated = await updateUserSubscription(userId, {
    subscription_tier: plan,
    subscription_status: 'active',
    subscription_start: subscriptionStart,
    subscription_end: subscriptionEnd,
    is_trial: isTrial,
    has_had_trial: isTrial ? true : undefined,
    paystack_authorization_code: verifyResult.data.authorization?.authorization_code,
  });

  if (!subscriptionUpdated) {
    throw new AppError({
      code: 'SUBSCRIPTION_UPDATE_FAILED',
      message: 'Failed to update subscription after payment verification',
      status: 500,
      expose: false,
    });
  }

  await updatePaymentStatus(reference, 'success', {
    transaction_id:
      typeof verifyResult.data.id === 'string' || typeof verifyResult.data.id === 'number'
        ? String(verifyResult.data.id)
        : reference,
    payment_method: 'card',
  });

  return {
    success: true,
    status: 'success',
    plan,
    message: 'Payment verified successfully',
  };
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const subscription = await getUserSubscription(userId);
  const usage = await getUserUsageStats(userId);
  const usageResult = checkUserLimits(subscription, usage);

  return {
    subscription: {
      plan: subscription?.plan ?? 'free',
      status: subscription?.status ?? 'inactive',
      current_period_end: subscription?.currentPeriodEnd?.toISOString() ?? null,
      is_trial: Boolean(subscription?.isTrial),
      has_had_trial: Boolean(subscription?.hasHadTrial),
      paystack_authorization_code: subscription?.paystackAuthorizationCode ?? null,
      matric_number: subscription?.matricNumber ?? null,
      institution: subscription?.institution ?? null,
      verification_status: subscription?.verificationStatus ?? 'none',
      verification_media_url: subscription?.verificationMediaUrl ?? null,
      verification_submitted_at: subscription?.verificationSubmittedAt?.toISOString() ?? null,
    },
    usage: {
      workspaces_count: usage.workspacesCount,
      file_uploads_this_month: usage.fileUploadsThisMonth,
      ai_queries_today: usage.aiQueriesToday,
      flashcards_count: usage.flashcardsCount,
    },
    limits: {
      can_create_workspace: !usageResult.exceededLimits?.includes('workspaces'),
      can_upload_file: !usageResult.exceededLimits?.includes('fileUploads'),
      can_use_ai: !usageResult.exceededLimits?.includes('aiQueriesPerDay'),
      can_create_flashcard: !usageResult.exceededLimits?.includes('flashcards'),
      can_use_spaced_repetition: canAccessFeature(subscription, 'spacedRepetition'),
      can_collaborate: canAccessFeature(subscription, 'collaboration'),
      can_export: canAccessFeature(subscription, 'exportPdf') && canAccessFeature(subscription, 'exportAnki'),
    },
  };
}

export async function getBillingHistory(userId: string): Promise<PaymentHistory> {
  const payments = await getUserPaymentHistory(userId);
  return {
    payments: payments.map((payment) => ({
      reference: payment.reference,
      plan: payment.plan,
      amount: payment.amount,
      status: payment.status,
      payment_method: payment.payment_method ?? null,
      transaction_id: payment.transaction_id ?? null,
      created_at: payment.created_at.toISOString(),
      updated_at: payment.updated_at.toISOString(),
    })),
  };
}

export async function processPaystackWebhook(
  rawBody: string,
  signature: string | null,
): Promise<{ received: true; duplicate?: boolean }> {
  if (!signature) {
    throw new ValidationError('Missing signature');
  }

  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    throw new ValidationError('Invalid signature');
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    throw new ValidationError('Invalid webhook payload');
  }

  const eventTimestampMs = extractEventTimestampMs(event);
  if (eventTimestampMs !== null) {
    const age = Date.now() - eventTimestampMs;
    if (age > WEBHOOK_MAX_AGE_MS || age < -WEBHOOK_FUTURE_SKEW_MS) {
      throw new ValidationError('Webhook timestamp is outside accepted time window');
    }
  }

  const db = getAdminDb();
  if (!db) {
    throw new ConfigurationError('Firestore is not initialized');
  }

  const now = new Date();
  const dedupeKey = buildEventDedupeKey(event);
  if (dedupeKey) {
    try {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + PROCESSED_WEBHOOK_TTL_DAYS);
      await db
        .collection('processed_webhooks')
        .doc(dedupeKey)
        .create({
          event: event.event,
          reference: event.data.reference ?? null,
          processed_at: now,
          expires_at: expiresAt,
        });
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        return { received: true, duplicate: true };
      }
      throw error;
    }
  }

  await cleanupExpiredProcessedWebhooks(db, now);
  const userId = await resolveUserId(event);

  switch (event.event) {
    case 'charge.success': {
      const reference = extractWebhookReference(event);
      if (!reference || !userId) {
        return { received: true };
      }

      const plan = extractPlanFromEvent(event);
      if (plan) {
        const metadata = asRecord(event.data.metadata);
        const isTrial = metadata.is_trial === true;
        const authorizationCode = event.data.authorization?.authorization_code;
        const endDate =
          isTrial && typeof metadata.subscription_end === 'string'
            ? parseDateOrNull(metadata.subscription_end)
            : null;

        await updateUserSubscription(userId, {
          subscription_tier: plan,
          subscription_status: 'active',
          subscription_start: now,
          subscription_end: endDate ?? calculateSubscriptionExpiry(plan, now),
          is_trial: isTrial,
          has_had_trial: isTrial ? true : undefined,
          paystack_authorization_code: authorizationCode,
          paystack_customer_code: extractCustomerCode(event) ?? undefined,
        });
      }

      await updatePaymentStatus(reference, 'success', {
        transaction_id:
          typeof event.data.id === 'number' || typeof event.data.id === 'string'
            ? String(event.data.id)
            : undefined,
        metadata: asRecord(event.data.metadata),
      });

      return { received: true };
    }
    case 'subscription.created': {
      if (!userId) {
        return { received: true };
      }

      const plan = extractPlanFromEvent(event);
      if (plan) {
        const subscriptionStatus = event.data.subscription?.status;
        let endDate = new Date(now);

        if (event.data.subscription?.next_payment_date) {
          endDate = new Date(event.data.subscription.next_payment_date);
        } else if (plan === 'premium_annual') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        await updateUserSubscription(userId, {
          subscription_tier: plan,
          subscription_status: subscriptionStatus === 'active' ? 'active' : 'inactive',
          subscription_start: now,
          subscription_end: endDate,
          subscription_id: event.data.subscription?.id ?? '',
          paystack_customer_code: extractCustomerCode(event) ?? undefined,
        });
      }

      return { received: true };
    }
    case 'subscription.disabled': {
      if (!userId) {
        return { received: true };
      }

      await updateUserSubscription(userId, {
        subscription_status: 'inactive',
        cancel_at_period_end: true,
      });

      return { received: true };
    }
    case 'subscription.not_renewed': {
      if (!userId) {
        return { received: true };
      }

      await updateUserSubscription(userId, {
        cancel_at_period_end: true,
      });
      return { received: true };
    }
    default:
      return { received: true };
  }
}
