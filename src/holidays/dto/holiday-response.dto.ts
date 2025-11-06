import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateHolidayRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
    nullable: true,
  })
  tenantId?: string | null;

  @ApiProperty({
    description: 'Country code (2-letter ISO)',
    example: 'US',
    maxLength: 2,
  })
  countryCode: string;

  @ApiProperty({
    description: 'Holiday name',
    example: "New Year's Day",
    maxLength: 255,
  })
  name: string;

  @ApiProperty({
    description: 'Holiday date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  date: string;

  @ApiProperty({
    description: 'Holiday type',
    example: 'public',
    enum: ['public', 'company', 'regional'],
    default: 'public',
  })
  type: string;

  @ApiProperty({
    description: 'Whether this is a recurring annual holiday',
    example: true,
    default: false,
  })
  isRecurring: boolean;

  @ApiProperty({
    description: 'Optional description',
    example: 'Public holiday celebrated nationwide',
    required: false,
    nullable: true,
  })
  description?: string | null;
}

export class UpdateHolidayRequestDto {
  @ApiProperty({
    description: 'Country code (2-letter ISO)',
    example: 'US',
    maxLength: 2,
    required: false,
  })
  countryCode?: string;

  @ApiProperty({
    description: 'Holiday name',
    example: 'Independence Day',
    maxLength: 255,
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Holiday date (YYYY-MM-DD)',
    example: '2025-07-04',
    required: false,
  })
  date?: string;

  @ApiProperty({
    description: 'Holiday type',
    example: 'public',
    enum: ['public', 'company', 'regional'],
    required: false,
  })
  type?: string;

  @ApiProperty({
    description: 'Whether this is a recurring annual holiday',
    example: false,
    required: false,
  })
  isRecurring?: boolean;

  @ApiProperty({
    description: 'Optional description',
    example: 'Annual company celebration',
    required: false,
    nullable: true,
  })
  description?: string | null;
}

// ===== Entity DTOs =====

export class HolidayDto {
  @ApiProperty({
    description: 'Holiday ID',
    example: '123e4567-e89b-12d3-a456-426614174060',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID (null for global holidays)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  tenantId: string | null;

  @ApiProperty({
    description: 'Country code (2-letter ISO)',
    example: 'US',
  })
  countryCode: string;

  @ApiProperty({
    description: 'Holiday name',
    example: "New Year's Day",
  })
  name: string;

  @ApiProperty({
    description: 'Holiday date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  date: string;

  @ApiProperty({
    description: 'Holiday type',
    example: 'public',
    enum: ['public', 'company', 'regional'],
  })
  type: string;

  @ApiProperty({
    description: 'Whether this is a recurring annual holiday',
    example: true,
  })
  isRecurring: boolean;

  @ApiProperty({
    description: 'Optional description',
    example: 'Public holiday celebrated nationwide',
    nullable: true,
  })
  description: string | null;
}

// ===== Response DTOs =====

export class HolidayResponseDto {
  @ApiProperty({
    description: 'Holiday data',
    type: HolidayDto,
  })
  data: HolidayDto;
}

export class HolidayListResponseDto {
  @ApiProperty({
    description: 'Array of holidays',
    type: [HolidayDto],
    isArray: true,
  })
  data: HolidayDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
