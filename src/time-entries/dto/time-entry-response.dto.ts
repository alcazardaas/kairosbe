import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateTimeEntryRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  user_id: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  project_id: string;

  @ApiProperty({
    description: 'Task ID (optional)',
    example: '123e4567-e89b-12d3-a456-426614174005',
    required: false,
    nullable: true,
  })
  task_id?: string | null;

  @ApiProperty({
    description: 'Week start date (ISO 8601)',
    example: '2025-01-20T00:00:00.000Z',
  })
  week_start_date: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  day_of_week: number;

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
  tenant_id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  user_id: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  project_id: string;

  @ApiProperty({
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174005',
    nullable: true,
  })
  task_id: string | null;

  @ApiProperty({
    description: 'Week start date',
    example: '2025-01-20T00:00:00.000Z',
  })
  week_start_date: string;

  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
  })
  day_of_week: number;

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
  created_at: string;
}

export class WeeklyHoursDto {
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
    description: 'Total hours for the week',
    example: 40.0,
  })
  totalHours: number;
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
