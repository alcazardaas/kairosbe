import { z } from 'zod';

export const updateTimesheetPolicySchema = z.object({
  weekStart: z
    .number()
    .int()
    .min(0)
    .max(6, 'weekStart must be between 0 (Sunday) and 6 (Saturday)')
    .optional(),
  maxHoursPerDay: z.number().min(0).max(24).optional().nullable(),
  allowOvertime: z.boolean().optional(),
  lockAfterApproval: z.boolean().optional(),
});

export type UpdateTimesheetPolicyDto = z.infer<typeof updateTimesheetPolicySchema>;
