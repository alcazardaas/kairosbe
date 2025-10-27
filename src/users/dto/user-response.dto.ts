import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Entity DTOs =====

export class UserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'User locale/language preference',
    example: 'en',
    nullable: true,
  })
  locale: string | null;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-01-20T14:30:00.000Z',
    nullable: true,
  })
  lastLoginAt: string | null;
}

export class MembershipDto {
  @ApiProperty({
    description: 'User role in the organization',
    example: 'employee',
    enum: ['admin', 'manager', 'employee'],
  })
  role: string;

  @ApiProperty({
    description: 'Membership status',
    example: 'active',
    enum: ['active', 'invited', 'disabled'],
  })
  status: string;

  @ApiProperty({
    description: 'Membership creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
  })
  createdAt: string;
}

export class ProfileDto {
  @ApiProperty({
    description: 'Job title',
    example: 'Software Engineer',
    nullable: true,
  })
  jobTitle: string | null;

  @ApiProperty({
    description: 'Employment start date',
    example: '2025-01-01',
    nullable: true,
  })
  startDate: string | null;

  @ApiProperty({
    description: 'Manager user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  managerUserId: string | null;

  @ApiProperty({
    description: 'Work location',
    example: 'New York, NY',
    nullable: true,
  })
  location: string | null;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-0123',
    nullable: true,
  })
  phone: string | null;
}

export class EmployeeDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'User locale/language preference',
    example: 'en',
    nullable: true,
  })
  locale: string | null;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2025-01-15T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2025-01-20T14:30:00.000Z',
    nullable: true,
  })
  lastLoginAt: string | null;

  @ApiProperty({
    description: 'Membership information',
    type: MembershipDto,
  })
  membership: MembershipDto;

  @ApiProperty({
    description: 'Profile information',
    type: ProfileDto,
    nullable: true,
  })
  profile: ProfileDto | null;
}

// ===== Request DTOs for OpenAPI =====

export class ProfileRequestDto {
  @ApiProperty({
    description: 'Job title',
    example: 'Software Engineer',
    required: false,
  })
  jobTitle?: string;

  @ApiProperty({
    description: 'Employment start date (YYYY-MM-DD)',
    example: '2025-01-01',
    required: false,
  })
  startDate?: string;

  @ApiProperty({
    description: 'Manager user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  managerUserId?: string;

  @ApiProperty({
    description: 'Work location',
    example: 'New York, NY',
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-0123',
    required: false,
  })
  phone?: string;
}

export class CreateUserRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'jane.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Jane Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'User role in the organization',
    example: 'employee',
    enum: ['admin', 'manager', 'employee'],
  })
  role: string;

  @ApiProperty({
    description: 'User profile information',
    type: ProfileRequestDto,
    required: false,
  })
  profile?: ProfileRequestDto;

  @ApiProperty({
    description: 'Send invitation email to user',
    example: true,
    default: true,
    required: false,
  })
  sendInvite?: boolean;
}

export class UpdateUserRequestDto {
  @ApiProperty({
    description: 'User full name',
    example: 'Jane Smith',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'User role in the organization',
    example: 'manager',
    enum: ['admin', 'manager', 'employee'],
    required: false,
  })
  role?: string;

  @ApiProperty({
    description: 'User profile information (partial updates supported)',
    type: ProfileRequestDto,
    required: false,
  })
  profile?: ProfileRequestDto;
}

// ===== Response DTOs =====

export class UserResponseDto {
  @ApiProperty({
    description: 'Employee data',
    type: EmployeeDto,
  })
  data: EmployeeDto;
}

export class UserListResponseDto {
  @ApiProperty({
    description: 'Array of employees',
    type: [EmployeeDto],
    isArray: true,
  })
  data: EmployeeDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
