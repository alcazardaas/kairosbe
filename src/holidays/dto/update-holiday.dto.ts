import { z } from 'zod';

export const updateHolidaySchema = z.object({
  countryCode: z.string().length(2, 'Country code must be 2 characters').toUpperCase().optional(),
  date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
    })
    .optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  type: z.enum(['public', 'company', 'regional']).optional(),
  isRecurring: z.boolean().optional(),
  description: z.string().optional().nullable(),
});

export type UpdateHolidayDto = z.infer<typeof updateHolidaySchema>;
