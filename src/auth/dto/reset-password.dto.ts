import { z } from 'zod';

/**
 * Reset password request schema
 * Public endpoint - uses token from forgot password flow
 */
export const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid reset token format'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => val.length <= 128, 'Password must not exceed 128 characters'),
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
