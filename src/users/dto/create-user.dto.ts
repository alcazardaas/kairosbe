import { z } from 'zod';

// Profile sub-schema for creating user
export const createUserProfileSchema = z.object({
  jobTitle: z.string().max(255).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
    .optional(),
  managerUserId: z.string().uuid('Invalid manager user ID format').optional(),
  location: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'manager', 'employee'], {
    errorMap: () => ({ message: 'Role must be admin, manager, or employee' }),
  }),
  profile: createUserProfileSchema.optional(),
  sendInvite: z.boolean().default(true),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type CreateUserProfileDto = z.infer<typeof createUserProfileSchema>;
