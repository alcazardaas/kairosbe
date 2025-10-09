import { z } from 'zod';

export const updateBenefitTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  unit: z
    .enum(['days', 'hours'], {
      errorMap: () => ({ message: 'Unit must be either "days" or "hours"' }),
    })
    .optional(),
  requires_approval: z.boolean().optional(),
});

export type UpdateBenefitTypeDto = z.infer<typeof updateBenefitTypeSchema>;
