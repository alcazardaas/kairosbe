import { z } from 'zod';

export const createTimesheetPolicySchema = z.object({
  week_start: z
    .number()
    .int()
    .min(0)
    .max(6, 'week_start must be between 0 (Sunday) and 6 (Saturday)')
    .default(1),
  max_hours_per_day: z.number().min(0).max(24).optional().nullable(),
  allow_overtime: z.boolean().default(true),
  lock_after_approval: z.boolean().default(true),
});

export type CreateTimesheetPolicyDto = z.infer<typeof createTimesheetPolicySchema>;
