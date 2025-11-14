import { z } from 'zod';

/**
 * Forgot password request schema
 * Public endpoint - generates reset token for user's email
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
});

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
