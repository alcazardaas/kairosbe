import { z } from 'zod';

export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: z.string().optional(),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;
