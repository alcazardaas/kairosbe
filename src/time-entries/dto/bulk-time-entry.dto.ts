import { z } from 'zod';

export const bulkTimeEntrySchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
  weekStartDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  entries: z.array(
    z.object({
      projectId: z.string().uuid('Invalid projectId format'),
      taskId: z.string().uuid('Invalid taskId format').optional().nullable(),
      dayOfWeek: z
        .number()
        .int()
        .min(0)
        .max(6, 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)'),
      hours: z.number().min(0, 'hours must be >= 0').max(24, 'hours must be <= 24'),
      note: z.string().max(1000, 'note too long').optional().nullable(),
    }),
  ),
});

export type BulkTimeEntryDto = z.infer<typeof bulkTimeEntrySchema>;
