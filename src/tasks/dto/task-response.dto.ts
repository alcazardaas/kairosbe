import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateTaskRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  projectId: string;

  @ApiProperty({
    description: 'Task name',
    example: 'Frontend Development',
    minLength: 1,
    maxLength: 255,
  })
  name: string;

  @ApiProperty({
    description: 'Parent task ID (for subtasks)',
    example: '123e4567-e89b-12d3-a456-426614174004',
    required: false,
    nullable: true,
  })
  parentTaskId?: string | null;
}

export class UpdateTaskRequestDto {
  @ApiProperty({
    description: 'Task name',
    example: 'Backend Development',
    minLength: 1,
    maxLength: 255,
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Parent task ID (for subtasks)',
    example: '123e4567-e89b-12d3-a456-426614174004',
    required: false,
    nullable: true,
  })
  parentTaskId?: string | null;
}

// ===== Entity DTOs =====

export class TaskDto {
  @ApiProperty({
    description: 'Task ID',
    example: '123e4567-e89b-12d3-a456-426614174005',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  projectId: string;

  @ApiProperty({
    description: 'Task name',
    example: 'Frontend Development',
  })
  name: string;

  @ApiProperty({
    description: 'Parent task ID (for subtasks)',
    example: '123e4567-e89b-12d3-a456-426614174004',
    nullable: true,
  })
  parentTaskId: string | null;

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

export class TaskResponseDto {
  @ApiProperty({
    description: 'Task data',
    type: TaskDto,
  })
  data: TaskDto;
}

export class TaskListResponseDto {
  @ApiProperty({
    description: 'Array of tasks',
    type: [TaskDto],
    isArray: true,
  })
  data: TaskDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
