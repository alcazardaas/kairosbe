import { ApiProperty } from '@nestjs/swagger';

// ===== Entity DTOs =====

export class SearchProjectDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Website Redesign',
  })
  name: string;

  @ApiProperty({
    description: 'Project code',
    example: 'WEB-2024',
    nullable: true,
  })
  code: string | null;

  @ApiProperty({
    description: 'Whether the project is active',
    example: true,
  })
  active: boolean;
}

export class SearchTaskDto {
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
    description: 'Parent task ID',
    example: '123e4567-e89b-12d3-a456-426614174004',
    nullable: true,
  })
  parentTaskId: string | null;
}

export class SearchMetaDto {
  @ApiProperty({
    description: 'Search query',
    example: 'website',
  })
  query: string;

  @ApiProperty({
    description: 'Number of results',
    example: 5,
  })
  count: number;

  @ApiProperty({
    description: 'Project ID filter (for task search)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  projectId?: string;
}

// ===== Response DTOs =====

export class SearchProjectsResponseDto {
  @ApiProperty({
    description: 'Array of matching projects',
    type: [SearchProjectDto],
    isArray: true,
  })
  data: SearchProjectDto[];

  @ApiProperty({
    description: 'Search metadata',
    type: SearchMetaDto,
  })
  meta: SearchMetaDto;
}

export class SearchTasksResponseDto {
  @ApiProperty({
    description: 'Array of matching tasks',
    type: [SearchTaskDto],
    isArray: true,
  })
  data: SearchTaskDto[];

  @ApiProperty({
    description: 'Search metadata',
    type: SearchMetaDto,
  })
  meta: SearchMetaDto;
}
