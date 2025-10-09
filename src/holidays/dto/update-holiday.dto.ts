import { z } from 'zod';

export const updateHolidaySchema = z.object({
  country_code: z.string().length(2, 'Country code must be 2 characters').toUpperCase().optional(),
  date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
    })
    .optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
});

export type UpdateHolidayDto = z.infer<typeof updateHolidaySchema>;
