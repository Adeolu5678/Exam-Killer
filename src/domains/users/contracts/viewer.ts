import { z } from 'zod';

export const sessionStatusSchema = z.enum(['authenticated', 'anonymous']);
export const subscriptionPlanSchema = z.enum(['free', 'premium_monthly', 'premium_annual']);
export const subscriptionStatusSchema = z.enum(['active', 'inactive', 'past_due']);
export const verificationStatusSchema = z.enum(['none', 'pending', 'verified', 'rejected']);

export const viewerPreferencesSchema = z.object({
  theme_preference: z.enum(['light', 'dark', 'system']).default('dark'),
  content_density: z.enum(['comfortable', 'compact']).default('comfortable'),
});

export const viewerSubscriptionSchema = z.object({
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema,
  current_period_end: z.string().datetime().nullable(),
  is_trial: z.boolean(),
  has_had_trial: z.boolean(),
  paystack_authorization_code: z.string().nullable(),
  institution: z.string().nullable(),
  verification_status: verificationStatusSchema,
  verification_media_url: z.string().nullable(),
  verification_submitted_at: z.string().datetime().nullable(),
});

export const viewerUsageSchema = z.object({
  workspaces_count: z.number().int().nonnegative(),
  file_uploads_this_month: z.number().int().nonnegative(),
  ai_queries_today: z.number().int().nonnegative(),
  flashcards_count: z.number().int().nonnegative(),
});

export const viewerProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  full_name: z.string().min(1),
  display_name: z.string().min(1),
  photo_url: z.string().url().nullable(),
  bio: z.string().nullable(),
  matric_number: z.string().nullable(),
  department: z.string().nullable(),
  level: z.number().int().nullable(),
  is_admin: z.boolean(),
  preferences: viewerPreferencesSchema,
  preferred_tutor_personality: z.string(),
  subscription: viewerSubscriptionSchema,
  usage: viewerUsageSchema,
  current_streak: z.number().int().nonnegative(),
  total_xp: z.number().int().nonnegative(),
});

export const viewerSessionSchema = z.object({
  status: sessionStatusSchema,
  session_expires_at: z.string().datetime().nullable(),
  viewer: viewerProfileSchema.nullable(),
});

export type ViewerSession = z.infer<typeof viewerSessionSchema>;
export type ViewerProfile = z.infer<typeof viewerProfileSchema>;
export type ViewerSubscription = z.infer<typeof viewerSubscriptionSchema>;
export type ViewerUsage = z.infer<typeof viewerUsageSchema>;
export type ViewerPreferences = z.infer<typeof viewerPreferencesSchema>;
