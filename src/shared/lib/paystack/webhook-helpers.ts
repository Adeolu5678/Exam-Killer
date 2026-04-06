import type { SubscriptionPlan } from './subscription';

export interface PaystackWebhookEvent {
  event: string;
  data: {
    status?: string;
    id?: number | string;
    reference?: string;
    subscription?: {
      id?: string;
      status?: string;
      plan?: {
        name?: string;
        repetitions?: number;
        interval?: string;
      };
      next_payment_date?: string;
    };
    customer?: {
      id?: number;
      email?: string;
      customer_code?: string;
    };
    authorization?: {
      authorization_code?: string;
    };
    metadata?: {
      userId?: string;
      plan?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export function parseTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === 'string' && value.trim()) {
    const asDate = Date.parse(value);
    if (Number.isFinite(asDate)) return asDate;
  }

  return null;
}

export function extractEventTimestampMs(event: PaystackWebhookEvent): number | null {
  const data = event.data as Record<string, unknown>;
  const candidates: unknown[] = [
    data.paid_at,
    data.created_at,
    data.transaction_date,
    data.paidAt,
    data.createdAt,
    data.timestamp,
  ];

  for (const candidate of candidates) {
    const ts = parseTimestampMs(candidate);
    if (ts !== null) return ts;
  }

  return null;
}

export function buildEventDedupeKey(event: PaystackWebhookEvent): string | null {
  const reference = extractWebhookReference(event);
  const subscriptionId =
    typeof event.data.subscription?.id === 'string' ? event.data.subscription.id : null;
  const customerCode =
    typeof event.data.customer?.customer_code === 'string'
      ? event.data.customer.customer_code
      : null;

  const raw = reference ?? subscriptionId ?? customerCode;
  if (!raw) return null;
  return Buffer.from(`${event.event}:${raw}`).toString('base64url');
}

export function extractWebhookReference(event: PaystackWebhookEvent): string | null {
  const reference = event.data.reference;
  return typeof reference === 'string' && reference.trim().length > 0 ? reference : null;
}

export function extractUserIdFromMetadata(event: PaystackWebhookEvent): string | null {
  const userId = event.data.metadata?.userId;
  if (typeof userId !== 'string') return null;
  const normalized = userId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function extractCustomerCode(event: PaystackWebhookEvent): string | null {
  const customerCode = event.data.customer?.customer_code;
  if (typeof customerCode !== 'string') return null;
  const normalized = customerCode.trim();
  return normalized.length > 0 ? normalized : null;
}

export function mapPlanNameToPlan(planName: string): SubscriptionPlan | null {
  const planMap: Record<string, SubscriptionPlan> = {
    premium_monthly: 'premium_monthly',
    premium_annual: 'premium_annual',
    premium: 'premium_monthly',
    'premium monthly': 'premium_monthly',
    'premium-monthly': 'premium_monthly',
    monthly: 'premium_monthly',
    annual: 'premium_annual',
    'premium annual': 'premium_annual',
    'premium-annual': 'premium_annual',
    yearly: 'premium_annual',
  };

  const normalized = planName.toLowerCase().trim();
  return planMap[normalized] || null;
}

export function extractPlanFromEvent(event: PaystackWebhookEvent): SubscriptionPlan | null {
  const planFromMetadata = event.data.metadata?.plan;
  if (typeof planFromMetadata === 'string') {
    const mapped = mapPlanNameToPlan(planFromMetadata);
    if (mapped) return mapped;
  }

  const planName = event.data.subscription?.plan?.name;
  if (typeof planName === 'string') {
    return mapPlanNameToPlan(planName);
  }

  return null;
}
