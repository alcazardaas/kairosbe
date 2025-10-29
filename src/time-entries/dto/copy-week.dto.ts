import { z } from 'zod';

export const copyWeekSchema = z.object({
  user_id: z.string().uuid('Invalid user_id format'),
  from_week_start: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  to_week_start: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  overwrite_existing: z.boolean().optional().default(false),
  copy_notes: z.boolean().optional().default(false),
});

export type CopyWeekDto = z.infer<typeof copyWeekSchema>;
