import { z } from 'zod';

export const bulkTimeEntrySchema = z.object({
  user_id: z.string().uuid('Invalid user_id format'),
  week_start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  entries: z.array(
    z.object({
      project_id: z.string().uuid('Invalid project_id format'),
      task_id: z.string().uuid('Invalid task_id format').optional().nullable(),
      day_of_week: z
        .number()
        .int()
        .min(0)
        .max(6, 'day_of_week must be between 0 (Sunday) and 6 (Saturday)'),
      hours: z.number().min(0, 'hours must be >= 0').max(24, 'hours must be <= 24'),
      note: z.string().max(1000, 'note too long').optional().nullable(),
    }),
  ),
});

export type BulkTimeEntryDto = z.infer<typeof bulkTimeEntrySchema>;
