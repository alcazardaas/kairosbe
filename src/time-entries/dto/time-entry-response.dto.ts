import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateTimeEntryRequestDto {
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
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  projectId: string;

  @ApiProperty({
    description: 'Task ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174005',
    required: false,
    nullable: true,
  })
  taskId?: string | null;

  @ApiProperty({
    description: 'Week start date (ISO 8601)',
    example: '2025-01-20T00:00:00.000Z',
  })
  weekStartDate: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Hours worked',
    example: 8.5,
    minimum: 0,
  })
  hours: number;

  @ApiProperty({
    description: 'Optional note',
    example: 'Worked on feature implementation',
    required: false,
    nullable: true,
  })
  note?: string | null;
}

export class UpdateTimeEntryRequestDto {
  @ApiProperty({
    description: 'Hours worked',
    example: 7.5,
    minimum: 0,
    required: false,
  })
  hours?: number;

  @ApiProperty({
    description: 'Optional note',
    example: 'Updated time entry',
    required: false,
    nullable: true,
  })
  note?: string | null;
}

// ===== Entity DTOs =====

export class TimeEntryDto {
  @ApiProperty({
    description: 'Time entry ID',
    example: '123e4567-e89b-12d3-a456-426614174010',
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
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  projectId: string;

  @ApiProperty({
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174005',
    nullable: true,
  })
  taskId: string | null;

  @ApiProperty({
    description: 'Week start date',
    example: '2025-01-20T00:00:00.000Z',
  })
  weekStartDate: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Hours worked',
    example: 8.5,
  })
  hours: number;

  @ApiProperty({
    description: 'Note',
    example: 'Worked on feature implementation',
    nullable: true,
  })
  note: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-20T09:00:00.000Z',
  })
  createdAt: string;
}

export class WeeklyHoursDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Week start date (YYYY-MM-DD)',
    example: '2025-01-27',
  })
  weekStartDate: string;

  @ApiProperty({
    description: 'Week end date (YYYY-MM-DD)',
    example: '2025-02-02',
  })
  weekEndDate: string;

  @ApiProperty({
    description: 'Total hours for the week',
    example: 42.5,
  })
  totalHours: number;

  @ApiProperty({
    description: 'Hours per day (date keys in YYYY-MM-DD format)',
    example: {
      '2025-01-27': 8.5,
      '2025-01-28': 7.0,
      '2025-01-29': 8.0,
      '2025-01-30': 8.0,
      '2025-01-31': 7.5,
      '2025-02-01': 3.5,
      '2025-02-02': 0,
    },
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  hoursPerDay: Record<string, number>;

  @ApiProperty({
    description: 'Total number of time entries in the week',
    example: 15,
  })
  entriesCount: number;
}

export class ProjectHoursDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  projectId: string;

  @ApiProperty({
    description: 'Total hours for the project',
    example: 120.5,
  })
  totalHours: number;
}

export class ProjectStatsDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'proj-001',
  })
  projectId: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Kairos Frontend',
  })
  projectName: string;

  @ApiProperty({
    description: 'Total hours logged to this project',
    example: 25.5,
  })
  totalHours: number;

  @ApiProperty({
    description: 'Percentage of total hours (rounded to 2 decimal places)',
    example: 60.0,
  })
  percentage: number;
}

export class UserProjectStatsDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user123',
  })
  userId: string;

  @ApiProperty({
    description: 'Total hours across all projects',
    example: 42.5,
  })
  totalHours: number;

  @ApiProperty({
    description: 'Project statistics sorted by total hours descending',
    type: [ProjectStatsDto],
    isArray: true,
  })
  projects: ProjectStatsDto[];
}

// ===== Response DTOs =====

export class TimeEntryResponseDto {
  @ApiProperty({
    description: 'Time entry data',
    type: TimeEntryDto,
  })
  data: TimeEntryDto;
}

export class TimeEntryListResponseDto {
  @ApiProperty({
    description: 'Array of time entries',
    type: [TimeEntryDto],
    isArray: true,
  })
  data: TimeEntryDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
