import { z } from 'zod';

export const createTimesheetSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export type CreateTimesheetDto = z.infer<typeof createTimesheetSchema>;
