import { z } from 'zod';

export const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  parent_task_id: z.string().uuid('Invalid parent_task_id format').optional().nullable(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
