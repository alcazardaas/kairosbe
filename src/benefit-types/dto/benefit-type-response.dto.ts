import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateBenefitTypeRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

  @ApiProperty({
    description: 'Benefit type key (unique identifier)',
    example: 'pto',
    maxLength: 50,
  })
  key: string;

  @ApiProperty({
    description: 'Benefit type name',
    example: 'Paid Time Off',
    maxLength: 255,
  })
  name: string;

  @ApiProperty({
    description: 'Unit of measurement (days or hours)',
    example: 'days',
    enum: ['days', 'hours'],
  })
  unit: string;

  @ApiProperty({
    description: 'Whether approval is required',
    example: true,
    default: true,
  })
  requires_approval: boolean;
}

export class UpdateBenefitTypeRequestDto {
  @ApiProperty({
    description: 'Benefit type name',
    example: 'Vacation Days',
    maxLength: 255,
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Unit of measurement (days or hours)',
    example: 'hours',
    enum: ['days', 'hours'],
    required: false,
  })
  unit?: string;

  @ApiProperty({
    description: 'Whether approval is required',
    example: false,
    required: false,
  })
  requires_approval?: boolean;
}

// ===== Entity DTOs =====

export class BenefitTypeDto {
  @ApiProperty({
    description: 'Benefit type ID',
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

  @ApiProperty({
    description: 'Benefit type key',
    example: 'pto',
  })
  key: string;

  @ApiProperty({
    description: 'Benefit type name',
    example: 'Paid Time Off',
  })
  name: string;

  @ApiProperty({
    description: 'Unit of measurement',
    example: 'days',
    enum: ['days', 'hours'],
  })
  unit: string;

  @ApiProperty({
    description: 'Whether approval is required',
    example: true,
  })
  requires_approval: boolean;

  @ApiProperty({
    description: 'Whether negative balance is allowed (e.g., unpaid leave)',
    example: false,
  })
  allow_negative_balance: boolean;

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

// ===== Response DTOs =====

export class BenefitTypeResponseDto {
  @ApiProperty({
    description: 'Benefit type data',
    type: BenefitTypeDto,
  })
  data: BenefitTypeDto;
}

export class BenefitTypeListResponseDto {
  @ApiProperty({
    description: 'Array of benefit types',
    type: [BenefitTypeDto],
    isArray: true,
  })
  data: BenefitTypeDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
