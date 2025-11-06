import { ApiProperty } from '@nestjs/swagger';

// ===== Request DTOs =====

export class CreateTimesheetPolicyRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Standard hours per week',
    example: 40,
    minimum: 0,
  })
  hoursPerWeek: number;

  @ApiProperty({
    description: 'Week start day (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  weekStartDay: number;

  @ApiProperty({
    description: 'Whether approval is required for timesheets',
    example: true,
    default: true,
  })
  requireApproval: boolean;

  @ApiProperty({
    description: 'Whether editing is allowed after submission',
    example: false,
    default: false,
  })
  allowEditAfterSubmit: boolean;
}

export class UpdateTimesheetPolicyRequestDto {
  @ApiProperty({
    description: 'Standard hours per week',
    example: 37.5,
    minimum: 0,
    required: false,
  })
  hoursPerWeek?: number;

  @ApiProperty({
    description: 'Week start day (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 0,
    minimum: 0,
    maximum: 6,
    required: false,
  })
  weekStartDay?: number;

  @ApiProperty({
    description: 'Whether approval is required for timesheets',
    example: false,
    required: false,
  })
  requireApproval?: boolean;

  @ApiProperty({
    description: 'Whether editing is allowed after submission',
    example: true,
    required: false,
  })
  allowEditAfterSubmit?: boolean;
}

// ===== Entity DTOs =====

export class TimesheetPolicyDto {
  @ApiProperty({
    description: 'Tenant ID (primary key)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Standard hours per week',
    example: 40,
  })
  hoursPerWeek: number;

  @ApiProperty({
    description: 'Week start day (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  weekStartDay: number;

  @ApiProperty({
    description: 'Whether approval is required for timesheets',
    example: true,
  })
  requireApproval: boolean;

  @ApiProperty({
    description: 'Whether editing is allowed after submission',
    example: false,
  })
  allowEditAfterSubmit: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
    required: false,
  })
  createdAt?: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-20T15:30:00.000Z',
    required: false,
  })
  updatedAt?: string;
}

// ===== Response DTOs =====

export class TimesheetPolicyResponseDto {
  @ApiProperty({
    description: 'Timesheet policy data',
    type: TimesheetPolicyDto,
  })
  data: TimesheetPolicyDto;
}

export class TimesheetPolicyListResponseDto {
  @ApiProperty({
    description: 'Array of timesheet policies',
    type: [TimesheetPolicyDto],
    isArray: true,
  })
  data: TimesheetPolicyDto[];
}
