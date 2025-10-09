import { z } from 'zod';

export const queryTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenant_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  parent_task_id: z.string().uuid().optional().nullable(),
  search: z.string().max(255).optional(),
});

export type QueryTasksDto = z.infer<typeof queryTasksSchema>;
