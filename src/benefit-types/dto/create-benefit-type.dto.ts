import { z } from 'zod';

export const createBenefitTypeSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant_id format'),
  key: z
    .string()
    .min(1, 'Key is required')
    .max(50, 'Key too long')
    .regex(/^[a-z0-9_-]+$/, 'Key must be lowercase alphanumeric with hyphens/underscores'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  unit: z.enum(['days', 'hours'], {
    errorMap: () => ({ message: 'Unit must be either "days" or "hours"' }),
  }),
  requires_approval: z.boolean().default(true),
});

export type CreateBenefitTypeDto = z.infer<typeof createBenefitTypeSchema>;
