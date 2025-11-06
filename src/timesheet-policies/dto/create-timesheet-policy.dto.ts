import { z } from 'zod';

export const createTimesheetPolicySchema = z.object({
  weekStart: z
    .number()
    .int()
    .min(0)
    .max(6, 'weekStart must be between 0 (Sunday) and 6 (Saturday)')
    .default(1),
  maxHoursPerDay: z.number().min(0).max(24).optional().nullable(),
  allowOvertime: z.boolean().default(true),
  lockAfterApproval: z.boolean().default(true),
});

export type CreateTimesheetPolicyDto = z.infer<typeof createTimesheetPolicySchema>;
