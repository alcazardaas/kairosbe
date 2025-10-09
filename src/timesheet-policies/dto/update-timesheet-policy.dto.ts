import { z } from 'zod';

export const updateTimesheetPolicySchema = z.object({
  week_start: z
    .number()
    .int()
    .min(0)
    .max(6, 'week_start must be between 0 (Sunday) and 6 (Saturday)')
    .optional(),
  max_hours_per_day: z.number().min(0).max(24).optional().nullable(),
  allow_overtime: z.boolean().optional(),
  lock_after_approval: z.boolean().optional(),
});

export type UpdateTimesheetPolicyDto = z.infer<typeof updateTimesheetPolicySchema>;
