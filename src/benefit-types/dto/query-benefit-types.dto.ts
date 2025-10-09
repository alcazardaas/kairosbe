import { z } from 'zod';

export const queryBenefitTypesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  tenant_id: z.string().uuid().optional(),
  unit: z.enum(['days', 'hours']).optional(),
  requires_approval: z.coerce.boolean().optional(),
  search: z.string().max(255).optional(),
});

export type QueryBenefitTypesDto = z.infer<typeof queryBenefitTypesSchema>;
