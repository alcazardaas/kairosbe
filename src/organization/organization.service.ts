import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { tenants } from '../db/schema';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

/**
 * Service for managing organization (tenant) settings
 */
@Injectable()
export class OrganizationService {
  constructor(private readonly db: DbService) {}

  /**
   * Get organization details for the current tenant
   * @param tenantId - Current tenant ID from session
   * @returns Organization data
   * @throws NotFoundException if tenant not found
   */
  async getOrganization(tenantId: string) {
    const [organization] = await this.db.db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        phone: tenants.phone,
        address: tenants.address,
        logoUrl: tenants.logoUrl,
        timezone: tenants.timezone,
        country: tenants.country,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      data: {
        ...organization,
        createdAt: organization.createdAt.toISOString(),
      },
    };
  }

  /**
   * Update organization settings
   * @param tenantId - Current tenant ID from session
   * @param dto - Organization fields to update
   * @returns Updated organization data
   * @throws NotFoundException if tenant not found
   */
  async updateOrganization(tenantId: string, dto: UpdateOrganizationDto) {
    // First check if tenant exists
    const [existingTenant] = await this.db.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!existingTenant) {
      throw new NotFoundException('Organization not found');
    }

    // Update tenant with provided fields
    const [updatedOrganization] = await this.db.db
      .update(tenants)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.country !== undefined && { country: dto.country }),
      })
      .where(eq(tenants.id, tenantId))
      .returning({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        phone: tenants.phone,
        address: tenants.address,
        logoUrl: tenants.logoUrl,
        timezone: tenants.timezone,
        country: tenants.country,
        createdAt: tenants.createdAt,
      });

    return {
      data: {
        ...updatedOrganization,
        createdAt: updatedOrganization.createdAt.toISOString(),
      },
    };
  }
}
