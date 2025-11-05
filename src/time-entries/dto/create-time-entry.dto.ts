import { z } from 'zod';

export const createTimeEntrySchema = z.object({
  tenantId: z.string().uuid('Invalid tenantId format'),
  userId: z.string().uuid('Invalid userId format'),
  projectId: z.string().uuid('Invalid projectId format'),
  taskId: z.string().uuid('Invalid taskId format').optional().nullable(),
  weekStartDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  dayOfWeek: z
    .number()
    .int()
    .min(0)
    .max(6, 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'),
  hours: z.number().min(0, 'hours must be >= 0').max(24, 'hours must be <= 24'),
  note: z.string().max(1000, 'note too long').optional().nullable(),
});

export type CreateTimeEntryDto = z.infer<typeof createTimeEntrySchema>;
