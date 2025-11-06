import { ApiProperty } from '@nestjs/swagger';

// ===== Request DTOs =====

export class CreateLeaveRequestRequestDto {
  @ApiProperty({
    description: 'Benefit type ID',
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  benefitTypeId: string;

  @ApiProperty({
    description: 'Leave start date (YYYY-MM-DD)',
    example: '2025-02-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Leave end date (YYYY-MM-DD)',
    example: '2025-02-05',
  })
  endDate: string;

  @ApiProperty({
    description: 'Amount of benefit to use (days or hours)',
    example: 5.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Optional note',
    example: 'Family vacation',
    required: false,
    nullable: true,
  })
  note?: string | null;
}

export class ReviewLeaveRequestRequestDto {
  @ApiProperty({
    description: 'Review note (optional)',
    example: 'Approved - enjoy your time off',
    required: false,
    nullable: true,
  })
  note?: string | null;
}

// ===== Entity DTOs =====

export class LeaveRequestDto {
  @ApiProperty({
    description: 'Leave request ID',
    example: '123e4567-e89b-12d3-a456-426614174040',
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
    description: 'User name',
    example: 'John Doe',
    nullable: true,
  })
  userName: string | null;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@company.com',
  })
  userEmail: string;

  @ApiProperty({
    description: 'Benefit type ID',
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  benefitTypeId: string;

  @ApiProperty({
    description: 'Leave start date',
    example: '2025-02-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Leave end date',
    example: '2025-02-05',
  })
  endDate: string;

  @ApiProperty({
    description: 'Amount of benefit used',
    example: 5.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Request status',
    example: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status: string;

  @ApiProperty({
    description: 'Approver user ID',
    example: '123e4567-e89b-12d3-a456-426614174050',
    nullable: true,
  })
  approverUserId: string | null;

  @ApiProperty({
    description: 'Approval timestamp',
    example: '2025-01-25T10:00:00.000Z',
    nullable: true,
  })
  approvedAt: string | null;

  @ApiProperty({
    description: 'Note',
    example: 'Family vacation',
    nullable: true,
  })
  note: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-20T09:00:00.000Z',
  })
  createdAt: string;
}

export class BenefitBalanceDto {
  @ApiProperty({
    description: 'Balance ID',
    example: '123e4567-e89b-12d3-a456-426614174035',
  })
  id: string;

  @ApiProperty({
    description: 'Benefit type ID',
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  benefitTypeId: string;

  @ApiProperty({
    description: 'Benefit type key (e.g., vacation, sick)',
    example: 'vacation',
  })
  benefitTypeKey: string;

  @ApiProperty({
    description: 'Benefit type display name',
    example: 'Vacation Leave',
  })
  benefitTypeName: string;

  @ApiProperty({
    description: 'Current balance (remaining)',
    example: '15.00',
  })
  currentBalance: string;

  @ApiProperty({
    description: 'Total annual amount allocated',
    example: '20.00',
  })
  totalAmount: string;

  @ApiProperty({
    description: 'Amount used (calculated: totalAmount - currentBalance)',
    example: '5.00',
  })
  usedAmount: string;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'days',
    enum: ['days', 'hours'],
  })
  unit: string;

  @ApiProperty({
    description: 'Whether this benefit requires approval',
    example: true,
    required: false,
  })
  requiresApproval?: boolean;
}

export class LeaveRequestMetaDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Count of results',
    example: 5,
  })
  count: number;
}

// ===== Response DTOs =====

export class LeaveRequestResponseDto {
  @ApiProperty({
    description: 'Leave request data',
    type: LeaveRequestDto,
  })
  data: LeaveRequestDto;
}

export class LeaveRequestListResponseDto {
  @ApiProperty({
    description: 'Array of leave requests',
    type: [LeaveRequestDto],
    isArray: true,
  })
  data: LeaveRequestDto[];

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Page size',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of leave requests',
    example: 42,
  })
  total: number;
}

export class BenefitBalancesResponseDto {
  @ApiProperty({
    description: 'Array of benefit balances',
    type: [BenefitBalanceDto],
    isArray: true,
  })
  data: BenefitBalanceDto[];

  @ApiProperty({
    description: 'Metadata',
    type: LeaveRequestMetaDto,
  })
  meta: LeaveRequestMetaDto;
}
