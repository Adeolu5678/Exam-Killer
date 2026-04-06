import { NextRequest } from 'next/server';

import { errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getAdminDb } from '@/shared/lib/firebase/admin';
import { verifyWebhookSignature } from '@/shared/lib/paystack';
import {
  getPaymentRecord,
  updateUserSubscription,
  updatePaymentStatus,
} from '@/shared/lib/paystack/db';
import {
  type PaystackWebhookEvent,
  extractEventTimestampMs,
  buildEventDedupeKey,
  extractPlanFromEvent,
  extractCustomerCode,
  extractUserIdFromMetadata,
  extractWebhookReference,
} from '@/shared/lib/paystack/webhook-helpers';

const WEBHOOK_MAX_AGE_MS = 10 * 60 * 1000;
const WEBHOOK_FUTURE_SKEW_MS = 2 * 60 * 1000;
const PROCESSED_WEBHOOK_TTL_DAYS = 14;

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 6 || code === '6' || code === 'already-exists';
}

async function resolveUserId(event: PaystackWebhookEvent): Promise<string | null> {
  const fromMetadata = extractUserIdFromMetadata(event);
  if (fromMetadata) return fromMetadata;

  const reference = extractWebhookReference(event);
  if (reference) {
    const paymentRecord = await getPaymentRecord(reference);
    if (paymentRecord) return paymentRecord.user_id;
  }

  const customerCode = extractCustomerCode(event);
  if (!customerCode) return null;

  const db = getAdminDb();
  if (!db) return null;

  const snapshot = await db
    .collection('users')
    .where('paystack_customer_code', '==', customerCode)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].id;
}

async function cleanupExpiredProcessedWebhooks(
  db: FirebaseFirestore.Firestore,
  now: Date,
): Promise<void> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - PROCESSED_WEBHOOK_TTL_DAYS);

  const snapshot = await db
    .collection('processed_webhooks')
    .where('processed_at', '<=', cutoff)
    .limit(100)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing x-paystack-signature header');
      return errorResponse('Missing signature', StatusCodes.BAD_REQUEST);
    }

    const rawBody = await request.text();

    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return errorResponse('Invalid signature', StatusCodes.BAD_REQUEST);
    }

    const event: PaystackWebhookEvent = JSON.parse(rawBody);
    const eventTimestampMs = extractEventTimestampMs(event);
    if (eventTimestampMs !== null) {
      const age = Date.now() - eventTimestampMs;
      if (age > WEBHOOK_MAX_AGE_MS || age < -WEBHOOK_FUTURE_SKEW_MS) {
        console.error('Rejected webhook outside accepted time window', { ageMs: age });
        return errorResponse(
          'Webhook timestamp is outside accepted time window',
          StatusCodes.BAD_REQUEST,
        );
      }
    }

    const db = getAdminDb();
    if (!db) {
      return errorResponse('Server configuration error', StatusCodes.INTERNAL_ERROR);
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
          return successResponse({ received: true, duplicate: true }, StatusCodes.OK);
        }
        throw error;
      }
    }

    await cleanupExpiredProcessedWebhooks(db, now);
    const userId = await resolveUserId(event);

    switch (event.event) {
      case 'charge.success': {
        const reference = extractWebhookReference(event);
        if (!reference) {
          console.error('No payment reference found in charge.success event');
          break;
        }

        if (!userId) {
          console.error('No user ID found in charge.success event');
          break;
        }

        const plan = extractPlanFromEvent(event);

        if (plan) {
          const isTrial = event.data.metadata?.is_trial === true;
          const authorizationCode = event.data.authorization?.authorization_code;

          await updateUserSubscription(userId, {
            subscription_tier: plan,
            subscription_status: 'active',
            is_trial: isTrial,
            has_had_trial: isTrial ? true : undefined,
            paystack_authorization_code: authorizationCode,
          });
        }

        await updatePaymentStatus(reference, 'success', {
          transaction_id: String(event.data.id || ''),
          metadata: event.data.metadata,
        });

        break;
      }

      case 'subscription.created': {
        if (!userId) {
          console.error('No user ID found in subscription.created event');
          break;
        }

        const plan = extractPlanFromEvent(event);
        const subscriptionStatus = event.data.subscription?.status;

        if (plan) {
          const now = new Date();
          let endDate = new Date();

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
            subscription_id: event.data.subscription?.id || '',
          });
        }
        break;
      }

      case 'subscription.disabled': {
        if (!userId) {
          console.error('No user ID found in subscription.disabled event');
          break;
        }

        await updateUserSubscription(userId, {
          subscription_status: 'inactive',
        });

        break;
      }

      case 'subscription.not_renewed': {
        if (!userId) {
          console.error('No user ID found in subscription.not_renewed event');
          break;
        }

        await updateUserSubscription(userId, {
          cancel_at_period_end: true,
        });

        break;
      }

      default:
    }

    return successResponse({ received: true }, StatusCodes.OK);
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse('Webhook processing failed', StatusCodes.INTERNAL_ERROR);
  }
}
