import { z } from 'zod';

export const updateTimeEntrySchema = z.object({
  hours: z.number().min(0, 'hours must be >= 0').max(24, 'hours must be <= 24').optional(),
  note: z.string().max(1000, 'note too long').optional().nullable(),
});

export type UpdateTimeEntryDto = z.infer<typeof updateTimeEntrySchema>;
