import { z } from 'zod';

export const createTaskSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant_id format'),
  project_id: z.string().uuid('Invalid project_id format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  parent_task_id: z.string().uuid('Invalid parent_task_id format').optional().nullable(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
