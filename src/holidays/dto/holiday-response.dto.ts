import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/dto/response.dto';

// ===== Request DTOs =====

export class CreateHolidayRequestDto {
  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

  @ApiProperty({
    description: 'Holiday name',
    example: 'New Year\'s Day',
    maxLength: 255,
  })
  name: string;

  @ApiProperty({
    description: 'Holiday date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  date: string;

  @ApiProperty({
    description: 'Whether this is a recurring annual holiday',
    example: true,
    default: false,
  })
  is_recurring: boolean;
}

export class UpdateHolidayRequestDto {
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
    description: 'Whether this is a recurring annual holiday',
    example: false,
    required: false,
  })
  is_recurring?: boolean;
}

// ===== Entity DTOs =====

export class HolidayDto {
  @ApiProperty({
    description: 'Holiday ID',
    example: '123e4567-e89b-12d3-a456-426614174060',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  tenant_id: string;

  @ApiProperty({
    description: 'Holiday name',
    example: 'New Year\'s Day',
  })
  name: string;

  @ApiProperty({
    description: 'Holiday date',
    example: '2025-01-01',
  })
  date: string;

  @ApiProperty({
    description: 'Whether this is a recurring annual holiday',
    example: true,
  })
  is_recurring: boolean;

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
