import { ApiProperty } from '@nestjs/swagger';

export class LoginRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  password: string;

  @ApiProperty({
    description: 'Tenant ID (optional - if user belongs to multiple tenants)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  tenantId?: string;
}

export class LoginResponseDataDto {
  @ApiProperty({
    description: 'Session token for authenticated requests',
    example: '987fcdeb-51a2-43f7-b8c3-9abc12345678',
  })
  sessionToken: string;

  @ApiProperty({
    description: 'Refresh token to obtain new session tokens',
    example: 'abc12345-6789-def0-1234-56789abcdef0',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Tenant ID for this session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2025-11-20T12:00:00.000Z',
  })
  expiresAt: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Login result data',
    type: LoginResponseDataDto,
  })
  data: LoginResponseDataDto;
}

export class RefreshRequestDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'abc12345-6789-def0-1234-56789abcdef0',
  })
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({
    description: 'New session tokens',
    type: LoginResponseDataDto,
  })
  data: LoginResponseDataDto;
}

export class UserDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User locale preference',
    example: 'en-US',
    required: false,
  })
  locale?: string;
}

export class TenantDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;
}

export class MembershipDto {
  @ApiProperty({
    description: 'User role in the tenant',
    example: 'employee',
    enum: ['admin', 'manager', 'employee'],
  })
  role: string;

  @ApiProperty({
    description: 'Membership status',
    example: 'active',
    enum: ['active', 'inactive'],
  })
  status: string;
}

export class TimesheetPolicyDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Standard hours per week',
    example: 40,
  })
  hoursPerWeek: number;

  @ApiProperty({
    description: 'Week start day (0=Sunday, 1=Monday, etc.)',
    example: 1,
  })
  weekStartDay: number;

  @ApiProperty({
    description: 'Require approval for timesheets',
    example: true,
  })
  requireApproval: boolean;

  @ApiProperty({
    description: 'Allow editing after submission',
    example: false,
  })
  allowEditAfterSubmit: boolean;
}

export class MeResponseDataDto {
  @ApiProperty({
    description: 'Current user information',
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: 'Current tenant information',
    type: TenantDto,
  })
  tenant: TenantDto;

  @ApiProperty({
    description: 'User membership details',
    type: MembershipDto,
  })
  membership: MembershipDto;

  @ApiProperty({
    description: 'Tenant timesheet policy',
    type: TimesheetPolicyDto,
    nullable: true,
  })
  timesheetPolicy: TimesheetPolicyDto | null;
}

export class MeResponseDto {
  @ApiProperty({
    description: 'Current user context',
    type: MeResponseDataDto,
  })
  data: MeResponseDataDto;
}

export class SignupRequestDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@newcompany.com',
  })
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Company/organization name',
    example: 'Acme Corporation',
  })
  companyName: string;

  @ApiProperty({
    description: 'Timezone for the organization',
    example: 'America/New_York',
    default: 'UTC',
  })
  timezone: string;

  @ApiProperty({
    description: 'Terms and conditions acceptance',
    example: true,
  })
  acceptedTerms: boolean;
}

export class SignupResponseDataDto {
  @ApiProperty({
    description: 'Session token for authenticated requests',
    example: '987fcdeb-51a2-43f7-b8c3-9abc12345678',
  })
  token: string;

  @ApiProperty({
    description: 'Refresh token to obtain new session tokens',
    example: 'abc12345-6789-def0-1234-56789abcdef0',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Session expiration timestamp',
    example: '2025-11-20T12:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Created user information',
    type: UserDto,
  })
  user: UserDto;

  @ApiProperty({
    description: 'Created tenant information',
  })
  tenant: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({
    description: 'User membership details',
    type: MembershipDto,
  })
  membership: MembershipDto;
}

export class SignupResponseDto {
  @ApiProperty({
    description: 'Signup result data',
    type: SignupResponseDataDto,
  })
  data: SignupResponseDataDto;
}
