import { z } from 'zod';

/**
 * Change password request schema
 * User must be authenticated and provide current password
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .refine((val) => val.length <= 128, 'Password must not exceed 128 characters'),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
