import { z } from 'zod';

export const queryTimeEntriesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional().nullable(),
  weekStartDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
  weekEndDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
});

export type QueryTimeEntriesDto = z.infer<typeof queryTimeEntriesSchema>;
