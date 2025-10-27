import { z } from 'zod';

/**
 * Zod schema for updating organization settings
 * All fields are optional to support partial updates
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  logoUrl: z.string().url().max(500).optional().nullable(),
  timezone: z.string().max(100).optional(), // IANA timezone string (e.g., "America/New_York")
  country: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, 'Country must be a 2-letter ISO 3166-1 alpha-2 code (e.g., "US", "CA")')
    .optional()
    .nullable(),
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
