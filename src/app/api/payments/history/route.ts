import { withAuth, errorResponse, successResponse, StatusCodes } from '@/shared/lib/api/auth';
import { getUserPaymentHistory } from '@/shared/lib/paystack/db';
import type { PaymentHistoryResponse } from '@/shared/types/api';

export const GET = withAuth(async (_request, { userId }) => {
  try {
    const payments = await getUserPaymentHistory(userId);

    const response: PaymentHistoryResponse = {
      payments: payments.map((payment) => ({
        ...payment,
        created_at: payment.created_at.toISOString(),
        updated_at: payment.updated_at.toISOString(),
      })),
    };

    return successResponse(response);
  } catch (error: unknown) {
    console.error('Get payment history error:', error);
    return errorResponse('Failed to load payment history', StatusCodes.INTERNAL_ERROR);
  }
});
