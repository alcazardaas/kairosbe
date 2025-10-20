import { ApiProperty } from '@nestjs/swagger';

// ===== Request DTOs =====

export class CreateTimesheetRequestDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  user_id: string;

  @ApiProperty({
    description: 'Week start date (YYYY-MM-DD)',
    example: '2025-01-20',
  })
  week_start_date: string;
}

export class ReviewTimesheetRequestDto {
  @ApiProperty({
    description: 'Review note (optional)',
    example: 'Approved for payment',
    required: false,
    nullable: true,
  })
  note?: string | null;
}

// ===== Entity DTOs =====

export class TimesheetDto {
  @ApiProperty({
    description: 'Timesheet ID',
    example: '123e4567-e89b-12d3-a456-426614174020',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Week start date',
    example: '2025-01-20',
  })
  weekStartDate: string;

  @ApiProperty({
    description: 'Timesheet status',
    example: 'pending',
    enum: ['draft', 'pending', 'approved', 'rejected'],
  })
  status: string;

  @ApiProperty({
    description: 'Submission timestamp',
    example: '2025-01-25T17:00:00.000Z',
    nullable: true,
  })
  submittedAt: string | null;

  @ApiProperty({
    description: 'User ID who submitted',
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
  })
  submittedByUserId: string | null;

  @ApiProperty({
    description: 'Review timestamp',
    example: '2025-01-26T10:00:00.000Z',
    nullable: true,
  })
  reviewedAt: string | null;

  @ApiProperty({
    description: 'User ID who reviewed',
    example: '123e4567-e89b-12d3-a456-426614174050',
    nullable: true,
  })
  reviewedByUserId: string | null;

  @ApiProperty({
    description: 'Review note',
    example: 'Approved for payment',
    nullable: true,
  })
  reviewNote: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-20T09:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-26T10:00:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Time entries in this timesheet',
    type: Array,
    required: false,
  })
  time_entries?: any[];
}

export class TimesheetPaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
  })
  page_size: number;

  @ApiProperty({
    description: 'Total number of timesheets',
    example: 42,
  })
  total: number;
}

// ===== Response DTOs =====

export class TimesheetResponseDto {
  @ApiProperty({
    description: 'Timesheet data',
    type: TimesheetDto,
  })
  data: TimesheetDto;
}

export class TimesheetListResponseDto {
  @ApiProperty({
    description: 'Array of timesheets',
    type: [TimesheetDto],
    isArray: true,
  })
  data: TimesheetDto[];

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
  })
  page_size: number;

  @ApiProperty({
    description: 'Total number of timesheets',
    example: 42,
  })
  total: number;
}
