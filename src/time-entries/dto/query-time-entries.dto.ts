import { z } from 'zod';

export const queryTimeEntriesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenant_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional().nullable(),
  week_start_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
  day_of_week: z.coerce.number().int().min(0).max(6).optional(),
});

export type QueryTimeEntriesDto = z.infer<typeof queryTimeEntriesSchema>;
