import { z } from 'zod';

export const queryUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/)
    .optional(),
  q: z.string().max(255).optional(), // Search by name or email
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  status: z.enum(['active', 'invited', 'disabled']).optional(),
  managerId: z.string().uuid().optional(), // Filter by manager (direct reports)
});

export type QueryUsersDto = z.infer<typeof queryUsersSchema>;
