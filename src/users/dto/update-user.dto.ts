import { z } from 'zod';

// Profile sub-schema for updating user
export const updateUserProfileSchema = z.object({
  jobTitle: z.string().max(255).optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
    .optional()
    .nullable(),
  managerUserId: z.string().uuid('Invalid manager user ID format').optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z
    .enum(['admin', 'manager', 'employee'], {
      errorMap: () => ({ message: 'Role must be admin, manager, or employee' }),
    })
    .optional(),
  profile: updateUserProfileSchema.optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;
