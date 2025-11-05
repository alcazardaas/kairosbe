import { z } from 'zod';

export const queryTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenantId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional().nullable(),
  search: z.string().max(255).optional(),
});

export type QueryTasksDto = z.infer<typeof queryTasksSchema>;
