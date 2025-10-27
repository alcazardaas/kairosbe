import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO for Swagger documentation
 */
export class UpdateOrganizationRequestDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Organization phone number',
    example: '+1-555-123-4567',
    required: false,
    nullable: true,
  })
  phone?: string | null;

  @ApiProperty({
    description: 'Organization address',
    example: '123 Main Street, Suite 100, San Francisco, CA 94105',
    required: false,
    nullable: true,
  })
  address?: string | null;

  @ApiProperty({
    description: 'Organization logo URL (CDN or storage URL)',
    example: 'https://cdn.example.com/logos/acme-corp.png',
    required: false,
    nullable: true,
  })
  logoUrl?: string | null;

  @ApiProperty({
    description: 'Organization timezone (IANA timezone string)',
    example: 'America/New_York',
    required: false,
  })
  timezone?: string;

  @ApiProperty({
    description: 'Organization country (ISO 3166-1 alpha-2 code)',
    example: 'US',
    required: false,
    nullable: true,
  })
  country?: string | null;
}

/**
 * Organization data returned in responses
 */
export class OrganizationDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Organization slug (URL-friendly identifier)',
    example: 'acme-corp',
  })
  slug: string;

  @ApiProperty({
    description: 'Organization phone number',
    example: '+1-555-123-4567',
    nullable: true,
  })
  phone: string | null;

  @ApiProperty({
    description: 'Organization address',
    example: '123 Main Street, Suite 100, San Francisco, CA 94105',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: 'Organization logo URL',
    example: 'https://cdn.example.com/logos/acme-corp.png',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiProperty({
    description: 'Organization timezone (IANA timezone string)',
    example: 'America/New_York',
  })
  timezone: string;

  @ApiProperty({
    description: 'Organization country (ISO 3166-1 alpha-2 code)',
    example: 'US',
    nullable: true,
  })
  country: string | null;

  @ApiProperty({
    description: 'Organization creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;
}

/**
 * Response wrapper for organization data
 */
export class OrganizationResponseDto {
  @ApiProperty({
    description: 'Organization data',
    type: OrganizationDto,
  })
  data: OrganizationDto;
}
