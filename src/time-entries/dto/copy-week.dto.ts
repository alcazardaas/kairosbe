import { z } from 'zod';

export const copyWeekSchema = z.object({
  userId: z.string().uuid('Invalid userId format'),
  fromWeekStart: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  toWeekStart: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  overwriteExisting: z.boolean().optional().default(false),
  copyNotes: z.boolean().optional().default(false),
});

export type CopyWeekDto = z.infer<typeof copyWeekSchema>;
