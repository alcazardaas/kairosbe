import { z } from 'zod';

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  code: z.string().max(50, 'Code too long').optional().nullable(),
  active: z.boolean().optional(),
});

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
