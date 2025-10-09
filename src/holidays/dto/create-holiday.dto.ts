import { z } from 'zod';

export const createHolidaySchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant_id format').optional().nullable(),
  country_code: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
});

export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;
