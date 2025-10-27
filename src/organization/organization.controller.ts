import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { UpdateOrganizationDto, updateOrganizationSchema } from './dto/update-organization.dto';
import {
  OrganizationResponseDto,
  UpdateOrganizationRequestDto,
} from './dto/organization-response.dto';
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';

/**
 * Organization settings controller
 * Manages organization/tenant profile information
 * Admin-only access
 */
@ApiTags('Organization')
@ApiSecurity('session')
@Controller('organization')
@UseGuards(RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Get organization settings',
    description:
      'Retrieve the current organization profile including name, contact information, branding, and preferences. Only accessible by admin users.',
  })
  @ApiOkResponse({
    description: 'Organization settings retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Only admins can view organization settings.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  async getOrganization(@CurrentTenantId() tenantId: string) {
    return this.organizationService.getOrganization(tenantId);
  }

  @Patch()
  @Roles('admin')
  @ApiOperation({
    summary: 'Update organization settings',
    description:
      'Update organization profile information. Supports partial updates - only provided fields will be updated. Logo upload should be handled separately by the frontend (upload to CDN/S3 and provide URL). Only accessible by admin users.',
  })
  @ApiBody({
    type: UpdateOrganizationRequestDto,
    description: 'Organization fields to update',
    examples: {
      full: {
        summary: 'Update all fields',
        value: {
          name: 'Acme Corporation',
          phone: '+1-555-123-4567',
          address: '123 Main Street, Suite 100, San Francisco, CA 94105',
          logoUrl: 'https://cdn.example.com/logos/acme-corp.png',
          timezone: 'America/New_York',
          country: 'US',
        },
      },
      partial: {
        summary: 'Update only phone and address',
        value: {
          phone: '+1-555-987-6543',
          address: '456 Oak Avenue, New York, NY 10001',
        },
      },
      clearFields: {
        summary: 'Clear optional fields',
        value: {
          phone: null,
          address: null,
          logoUrl: null,
          country: null,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Organization settings updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid organization data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied. Only admins can update organization settings.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
    type: ErrorResponseDto,
  })
  async updateOrganization(
    @CurrentTenantId() tenantId: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.updateOrganization(tenantId, dto);
  }
}
