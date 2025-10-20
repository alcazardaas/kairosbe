import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateProjectRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Website Redesign',
    minLength: 1,
    maxLength: 255,
  })
  name: string;

  @ApiProperty({
    description: 'Project code (optional)',
    example: 'WEB-2024',
    maxLength: 50,
    required: false,
    nullable: true,
  })
  code?: string | null;

  @ApiProperty({
    description: 'Whether the project is active',
    example: true,
    default: true,
  })
  active: boolean;
}

export class UpdateProjectRequestDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Website Redesign v2',
    minLength: 1,
    maxLength: 255,
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Project code',
    example: 'WEB-2024',
    maxLength: 50,
    required: false,
    nullable: true,
  })
  code?: string | null;

  @ApiProperty({
    description: 'Whether the project is active',
    example: false,
    required: false,
  })
  active?: boolean;
}

export class AddMemberRequestDto {
  @ApiProperty({
    description: 'User ID to assign to project',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Role for the user on this project',
    example: 'member',
    required: false,
  })
  role?: string;
}

// ===== Entity DTOs =====

export class ProjectDto {
  @ApiProperty({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

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

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
    required: false,
  })
  created_at?: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-20T15:30:00.000Z',
    required: false,
  })
  updated_at?: string;
}

export class ProjectMemberDto {
  @ApiProperty({
    description: 'Project member ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
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
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'User role on the project',
    example: 'member',
    nullable: true,
  })
  role: string | null;

  @ApiProperty({
    description: 'Timestamp when user was assigned to project',
    example: '2025-01-15T10:00:00.000Z',
  })
  createdAt: string;
}

// ===== Response DTOs =====

export class ProjectResponseDto {
  @ApiProperty({
    description: 'Project data',
    type: ProjectDto,
  })
  data: ProjectDto;
}

export class ProjectListResponseDto {
  @ApiProperty({
    description: 'Array of projects',
    type: [ProjectDto],
    isArray: true,
  })
  data: ProjectDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}

export class ProjectMembersResponseDto {
  @ApiProperty({
    description: 'Array of project members',
    type: [ProjectMemberDto],
    isArray: true,
  })
  data: ProjectMemberDto[];
}

export class ProjectMemberResponseDto {
  @ApiProperty({
    description: 'Project member data',
    type: ProjectMemberDto,
  })
  data: ProjectMemberDto;
}
