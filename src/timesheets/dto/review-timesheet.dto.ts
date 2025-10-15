import { z } from 'zod';

export const reviewTimesheetSchema = z.object({
  reviewNote: z.string().optional(),
});

export type ReviewTimesheetDto = z.infer<typeof reviewTimesheetSchema>;
