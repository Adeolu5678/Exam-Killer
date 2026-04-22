import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export const signupRequestSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(2).max(80),
  matric_number: z.string().trim().min(1).max(60).optional().nullable(),
  department: z.string().trim().min(1).max(120).optional().nullable(),
  level: z.number().int().min(100).max(700).optional().nullable(),
  referral_code: z.string().trim().min(1).max(32).optional().nullable(),
});

export const sessionMutationRequestSchema = z.object({
  idToken: z.string().min(1),
});

export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type SignupRequestInput = z.infer<typeof signupRequestSchema>;
export type SessionMutationRequestInput = z.infer<typeof sessionMutationRequestSchema>;
