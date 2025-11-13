import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  code: z.string().max(50, 'Code too long').optional().nullable(),
  active: z.boolean().default(true),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
  clientName: z.string().max(255, 'Client name too long').optional().nullable(),
  budgetHours: z.coerce.number().positive('Budget hours must be positive').optional().nullable(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
