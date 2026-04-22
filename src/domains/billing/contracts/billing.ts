import { z } from 'zod';

export const paidPlanSchema = z.enum(['premium_monthly', 'premium_annual']);
export const subscriptionStatusSchema = z.enum(['active', 'inactive', 'past_due']);
export const verificationStatusSchema = z.enum(['none', 'pending', 'verified', 'rejected']);

export const initializeCheckoutRequestSchema = z.object({
  plan: paidPlanSchema,
  trial: z.boolean().optional().default(false),
});

export const verifyCheckoutQuerySchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
});

export const statusUsageSchema = z.object({
  workspaces_count: z.number().int().nonnegative(),
  file_uploads_this_month: z.number().int().nonnegative(),
  ai_queries_today: z.number().int().nonnegative(),
  flashcards_count: z.number().int().nonnegative(),
});

export const statusSubscriptionSchema = z.object({
  plan: z.enum(['free', 'premium_monthly', 'premium_annual']),
  status: subscriptionStatusSchema,
  current_period_end: z.string().datetime().nullable(),
  is_trial: z.boolean(),
  has_had_trial: z.boolean(),
  paystack_authorization_code: z.string().nullable(),
  matric_number: z.string().nullable(),
  institution: z.string().nullable(),
  verification_status: verificationStatusSchema,
  verification_media_url: z.string().nullable(),
  verification_submitted_at: z.string().datetime().nullable(),
});

export const statusLimitsSchema = z.object({
  can_create_workspace: z.boolean(),
  can_upload_file: z.boolean(),
  can_use_ai: z.boolean(),
  can_create_flashcard: z.boolean(),
  can_use_spaced_repetition: z.boolean(),
  can_collaborate: z.boolean(),
  can_export: z.boolean(),
});

export const billingStatusSchema = z.object({
  subscription: statusSubscriptionSchema,
  usage: statusUsageSchema,
  limits: statusLimitsSchema,
});

export const paymentHistoryItemSchema = z.object({
  reference: z.string(),
  plan: z.enum(['free', 'premium_monthly', 'premium_annual']),
  amount: z.number().int().nonnegative(),
  status: z.enum(['pending', 'success', 'failed']),
  payment_method: z.string().nullable(),
  transaction_id: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const paymentHistorySchema = z.object({
  payments: z.array(paymentHistoryItemSchema),
});

export type InitializeCheckoutRequest = z.infer<typeof initializeCheckoutRequestSchema>;
export type VerifyCheckoutQuery = z.infer<typeof verifyCheckoutQuerySchema>;
export type BillingStatus = z.infer<typeof billingStatusSchema>;
export type PaymentHistory = z.infer<typeof paymentHistorySchema>;
