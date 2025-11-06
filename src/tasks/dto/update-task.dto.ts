import { z } from 'zod';

export const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  parentTaskId: z.string().uuid('Invalid parentTaskId format').optional().nullable(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
