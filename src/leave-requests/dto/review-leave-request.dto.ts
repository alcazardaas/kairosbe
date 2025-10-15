import { z } from 'zod';

export const reviewLeaveRequestSchema = z.object({
  note: z.string().optional(),
});

export type ReviewLeaveRequestDto = z.infer<typeof reviewLeaveRequestSchema>;
