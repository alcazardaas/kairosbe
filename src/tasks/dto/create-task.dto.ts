import { z } from 'zod';

export const createTaskSchema = z.object({
  tenantId: z.string().uuid('Invalid tenantId format'),
  projectId: z.string().uuid('Invalid projectId format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  parentTaskId: z.string().uuid('Invalid parentTaskId format').optional().nullable(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
