import { z } from 'zod';

export const queryHolidaysSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenant_id: z.string().uuid().optional().nullable(),
  country_code: z.string().length(2).toUpperCase().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  search: z.string().max(255).optional(),
});

export type QueryHolidaysDto = z.infer<typeof queryHolidaysSchema>;
