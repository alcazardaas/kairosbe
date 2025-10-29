import { z } from 'zod';

export const queryUserProjectStatsSchema = z.object({
  weekStartDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
  endDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
});

export type QueryUserProjectStatsDto = z.infer<typeof queryUserProjectStatsSchema>;
