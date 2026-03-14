import { NextRequest, NextResponse } from 'next/server';

import { verifyWebhookSignature } from '@/shared/lib/paystack';
import { updateUserSubscription, updatePaymentStatus } from '@/shared/lib/paystack/db';
import type { SubscriptionPlan } from '@/shared/lib/paystack/subscription';

interface PaystackEvent {
  event: string;
  data: {
    status?: string;
    reference?: string;
    subscription?: {
      id: string;
      status: string;
      plan: {
        name: string;
        repetitions: number;
        interval: string;
      };
      next_payment_date?: string;
    };
    customer?: {
      id: number;
      email: string;
      customer_code: string;
    };
    metadata?: {
      userId?: string;
      plan?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

function mapPlanNameToPlan(planName: string): SubscriptionPlan | null {
  const planMap: Record<string, SubscriptionPlan> = {
    premium: 'premium_monthly',
    'premium monthly': 'premium_monthly',
    monthly: 'premium_monthly',
    annual: 'premium_annual',
    'premium annual': 'premium_annual',
    yearly: 'premium_annual',
  };

  const normalized = planName.toLowerCase().trim();
  return planMap[normalized] || null;
}

function extractUserId(event: PaystackEvent): string | null {
  const data = event.data;

  if (data.metadata?.userId) {
    return data.metadata.userId as string;
  }

  if (data.customer?.customer_code) {
    return data.customer.customer_code;
  }

  return null;
}

function extractPlan(event: PaystackEvent): SubscriptionPlan | null {
  const data = event.data;

  if (data.metadata?.plan) {
    return mapPlanNameToPlan(data.metadata.plan as string);
  }

  if (data.subscription?.plan?.name) {
    return mapPlanNameToPlan(data.subscription.plan.name);
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('Missing x-paystack-signature header');
      return NextResponse.json({ message: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await request.text();

    const isValid = verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
    }

    const event: PaystackEvent = JSON.parse(rawBody);

    const userId = extractUserId(event);

    switch (event.event) {
      case 'charge.success': {
        if (!userId) {
          console.error('No user ID found in charge.success event');
          break;
        }

        const reference = event.data.reference as string;
        const plan = extractPlan(event);

        if (plan) {
          const isTrial = event.data.metadata?.is_trial === true;
          const authorizationCode = (event.data as any).authorization?.authorization_code;

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

        const plan = extractPlan(event);
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
            subscription_id: String(event.data.subscription?.id || ''),
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

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ message: 'Webhook processing failed' }, { status: 500 });
  }
}
