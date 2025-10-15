import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  benefitTypeId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export type CreateLeaveRequestDto = z.infer<typeof createLeaveRequestSchema>;
