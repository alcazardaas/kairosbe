import { z } from 'zod';

export const createHolidaySchema = z.object({
  tenantId: z.string().uuid('Invalid tenantId format').optional().nullable(),
  countryCode: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
  }),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  type: z.enum(['public', 'company', 'regional']).default('public'),
  isRecurring: z.boolean().default(false),
  description: z.string().optional().nullable(),
});

export type CreateHolidayDto = z.infer<typeof createHolidaySchema>;
