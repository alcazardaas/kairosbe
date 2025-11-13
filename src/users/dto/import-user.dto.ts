import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Zod schema for validating a single row in the import file
 */
export const importUserRowSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['admin', 'manager', 'employee']),
  jobTitle: z.string().max(255).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD')
    .optional(),
  managerEmail: z.string().email().max(255).optional(),
  location: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
});

export type ImportUserRowDto = z.infer<typeof importUserRowSchema>;

/**
 * Query parameters for import request
 */
export const importRequestQuerySchema = z.object({
  dryRun: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

export type ImportRequestQueryDto = z.infer<typeof importRequestQuerySchema>;

/**
 * Query parameters for template download request
 */
export const templateRequestQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).optional().default('csv'),
});

export type TemplateRequestQueryDto = z.infer<typeof templateRequestQuerySchema>;

/**
 * Error detail for a single row in the import file
 */
export class ImportRowErrorDto {
  @ApiProperty({ description: 'Row number in file (1-indexed, excluding header)' })
  row: number;

  @ApiProperty({ description: 'Email from that row' })
  email: string;

  @ApiProperty({ description: 'List of validation error messages', type: [String] })
  errors: string[];
}

/**
 * User summary for created/existing users
 */
export class UserSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['admin', 'manager', 'employee'] })
  role: string;

  @ApiProperty({ enum: ['invited', 'active', 'disabled'] })
  status: string;

  @ApiProperty({ required: false })
  note?: string;
}

/**
 * Import result response
 */
export class ImportResultDto {
  @ApiProperty({ description: 'Whether import was successful' })
  success: boolean;

  @ApiProperty({ description: 'Whether this was a dry-run (validation only)' })
  dryRun: boolean;

  @ApiProperty({ description: 'Total number of rows in file' })
  totalRows: number;

  @ApiProperty({ description: 'Number of valid rows' })
  validRows: number;

  @ApiProperty({ description: 'Number of errors found' })
  errorCount: number;

  @ApiProperty({ required: false, description: 'Number of users created (if not dry-run)' })
  createdCount?: number;

  @ApiProperty({
    required: false,
    description: 'Number of existing users added to tenant (if not dry-run)',
  })
  existingCount?: number;

  @ApiProperty({ required: false, description: 'Success or error message' })
  message?: string;

  @ApiProperty({
    required: false,
    type: [ImportRowErrorDto],
    description: 'List of validation errors',
  })
  errors?: ImportRowErrorDto[];

  @ApiProperty({ required: false, type: [UserSummaryDto], description: 'List of created users' })
  createdUsers?: UserSummaryDto[];

  @ApiProperty({
    required: false,
    type: [UserSummaryDto],
    description: 'List of existing users added to tenant',
  })
  existingUsers?: UserSummaryDto[];
}
