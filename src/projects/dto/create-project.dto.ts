import { z } from 'zod';

export const createProjectSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant_id format'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  code: z.string().max(50, 'Code too long').optional().nullable(),
  active: z.boolean().default(true),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
