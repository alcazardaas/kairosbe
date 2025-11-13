import { z } from 'zod';

export const bulkAddMembersSchema = z.object({
  userIds: z
    .array(z.string().uuid('Invalid user ID format'))
    .min(1, 'At least one user ID is required'),
  role: z.string().max(50).optional().default('member'),
});

export type BulkAddMembersDto = z.infer<typeof bulkAddMembersSchema>;
