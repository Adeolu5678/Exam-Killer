const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export function getPaystackConfig() {
  return {
    secretKey: PAYSTACK_SECRET_KEY,
    publicKey: PAYSTACK_PUBLIC_KEY,
    webhookSecret: PAYSTACK_WEBHOOK_SECRET,
  };
}

export function isPaystackConfigured(): boolean {
  return !!PAYSTACK_SECRET_KEY;
}

export interface InitializePaymentParams {
  email: string;
  amount: number;
  plan: 'premium_monthly' | 'premium_annual';
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResponse {
  success: boolean;
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  message?: string;
}

export async function initializePayment(
  params: InitializePaymentParams,
): Promise<InitializePaymentResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      message: 'Payment service is not configured',
    };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        reference: generateReference(params.userId, params.plan),
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        metadata: {
          userId: params.userId,
          plan: params.plan,
          ...params.metadata,
        },
        channels: ['card'],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to initialize payment',
      };
    }

    return {
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize payment',
    };
  }
}

function generateReference(userId: string, plan: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `pay_${userId}_${plan}_${timestamp}_${random}`;
}

export interface VerifyPaymentParams {
  reference: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  data?: {
    status: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
    };
    metadata: {
      userId: string;
      plan: string;
    };
  };
  message?: string;
}

export async function verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      message: 'Payment service is not configured',
    };
  }

  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(params.reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to verify payment',
      };
    }

    if (data.data.status !== 'success') {
      return {
        success: false,
        data: {
          status: data.data.status,
          amount: data.data.amount,
          currency: data.data.currency,
          customer: data.data.customer,
          metadata: data.data.metadata,
        },
        message: 'Payment was not successful',
      };
    }

    return {
      success: true,
      data: {
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
        customer: data.data.customer,
        metadata: data.data.metadata,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify payment',
    };
  }
}

export interface ListTransactionsParams {
  customer: string;
  status?: 'success' | 'failed' | 'abandoned';
  per_page?: number;
  page?: number;
}

export interface ListTransactionsResponse {
  success: boolean;
  data?: {
    transactions: Array<{
      id: number;
      reference: string;
      amount: number;
      currency: string;
      status: string;
      customer: {
        email: string;
      };
      metadata: {
        userId: string;
        plan: string;
      };
      created_at: string;
    }>;
    meta: {
      total: number;
      per_page: number;
      page: number;
      page_count: number;
    };
  };
  message?: string;
}

export async function listTransactions(
  params: ListTransactionsParams,
): Promise<ListTransactionsResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      message: 'Payment service is not configured',
    };
  }

  try {
    const queryParams = new URLSearchParams({
      customer: params.customer,
    });

    if (params.status) {
      queryParams.append('status', params.status);
    }
    if (params.per_page) {
      queryParams.append('per_page', params.per_page.toString());
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to list transactions',
      };
    }

    return {
      success: true,
      data: {
        transactions: data.data,
        meta: data.meta,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to list transactions',
    };
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!PAYSTACK_WEBHOOK_SECRET) {
    return false;
  }

  try {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET).update(payload).digest('hex');

    return hash === signature;
  } catch (error) {
    return false;
  }
}

export interface CreateCustomerParams {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface CreateCustomerResponse {
  success: boolean;
  data?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    customer_code: string;
  };
  message?: string;
}

export async function createCustomer(
  params: CreateCustomerParams,
): Promise<CreateCustomerResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      message: 'Payment service is not configured',
    };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        phone: params.phone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to create customer',
      };
    }

    return {
      success: true,
      data: {
        id: data.data.id,
        email: data.data.email,
        first_name: data.data.first_name,
        last_name: data.data.last_name,
        phone: data.data.phone,
        customer_code: data.data.customer_code,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create customer',
    };
  }
}

export interface UpdateCustomerParams {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface UpdateCustomerResponse {
  success: boolean;
  data?: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    customer_code: string;
  };
  message?: string;
}

export async function updateCustomer(
  params: UpdateCustomerParams,
): Promise<UpdateCustomerResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      message: 'Payment service is not configured',
    };
  }

  try {
    const customerResponse = await fetch(
      `${PAYSTACK_BASE_URL}/customer/${encodeURIComponent(params.email)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const customerData = await customerResponse.json();

    if (!customerResponse.ok || !customerData.data) {
      return createCustomer({
        email: params.email,
        first_name: params.first_name,
        last_name: params.last_name,
        phone: params.phone,
      });
    }

    const updateResponse = await fetch(`${PAYSTACK_BASE_URL}/customer/${customerData.data.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: params.first_name,
        last_name: params.last_name,
        phone: params.phone,
      }),
    });

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      return {
        success: false,
        message: updateData.message || 'Failed to update customer',
      };
    }

    return {
      success: true,
      data: {
        id: updateData.data.id,
        email: updateData.data.email,
        first_name: updateData.data.first_name,
        last_name: updateData.data.last_name,
        phone: updateData.data.phone,
        customer_code: updateData.data.customer_code,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update customer',
    };
  }
}

export interface ChargeAuthorizationParams {
  email: string;
  amount: number;
  authorization_code: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeAuthorizationResponse {
  success: boolean;
  data?: {
    status: string;
    reference: string;
    amount: number;
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer?: {
      id: number;
      customer_code: string;
      email: string;
    };
  };
  message?: string;
}

export async function chargeAuthorization(
  params: ChargeAuthorizationParams,
): Promise<ChargeAuthorizationResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      success: false,
      message: 'Payment service is not configured',
    };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/charge_authorization`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        authorization_code: params.authorization_code,
        reference:
          params.reference || `charge_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        metadata: params.metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to charge authorization',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to charge authorization',
    };
  }
}
