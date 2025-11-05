import { z } from 'zod';

export const queryHolidaysSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenantId: z.string().uuid().optional().nullable(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  search: z.string().max(255).optional(),
  type: z.enum(['public', 'company', 'regional']).optional(),
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
  upcoming: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

export type QueryHolidaysDto = z.infer<typeof queryHolidaysSchema>;
