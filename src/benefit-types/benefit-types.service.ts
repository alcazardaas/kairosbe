import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { benefitTypes } from '../db/schema/benefits';
import { CreateBenefitTypeDto } from './dto/create-benefit-type.dto';
import { UpdateBenefitTypeDto } from './dto/update-benefit-type.dto';
import { QueryBenefitTypesDto } from './dto/query-benefit-types.dto';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

@Injectable()
export class BenefitTypesService {
  constructor(private readonly dbService: DbService) {}

  async findAll(
    tenantId: string,
    query: QueryBenefitTypesDto,
  ): Promise<PaginatedResponse<any>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, unit, requiresApproval, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions - always filter by tenant
    const conditions = [eq(benefitTypes.tenantId, tenantId)];
    if (unit) {
      conditions.push(eq(benefitTypes.unit, unit));
    }
    if (requiresApproval !== undefined) {
      conditions.push(eq(benefitTypes.requiresApproval, requiresApproval));
    }
    if (search) {
      conditions.push(ilike(benefitTypes.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: benefitTypes.id,
        key: benefitTypes.key,
        name: benefitTypes.name,
        unit: benefitTypes.unit,
        tenantId: benefitTypes.tenantId,
        requiresApproval: benefitTypes.requiresApproval,
      };
      const column = columnMap[field];
      if (column) {
        orderByClause = order === 'desc' ? desc(column) : asc(column);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(benefitTypes)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select()
      .from(benefitTypes)
      .where(whereClause)
      .orderBy(orderByClause || asc(benefitTypes.name))
      .limit(limit)
      .offset(offset);

    const transformedData = data.map((item) => transformKeysToCamel(item));
    return createPaginatedResponse(transformedData, total, page, limit);
  }

  async findOne(tenantId: string, id: string): Promise<any> {
    const db = this.dbService.getDb();
    const result = await db
      .select()
      .from(benefitTypes)
      .where(and(eq(benefitTypes.tenantId, tenantId), eq(benefitTypes.id, id)))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException(`Benefit type with ID ${id} not found`);
    }

    return transformKeysToCamel(result[0]);
  }

  async create(tenantId: string, createBenefitTypeDto: CreateBenefitTypeDto): Promise<any> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(benefitTypes)
        .values({
          tenantId: tenantId,
          key: createBenefitTypeDto.key,
          name: createBenefitTypeDto.name,
          unit: createBenefitTypeDto.unit,
          requiresApproval: createBenefitTypeDto.requiresApproval,
        })
        .returning();

      return transformKeysToCamel(result[0]);
    } catch (error) {
      // Handle unique constraint violation (tenant_id + key must be unique)
      if (error.code === '23505') {
        throw new ConflictException(
          `Benefit type with key "${createBenefitTypeDto.key}" already exists for this tenant`,
        );
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    id: string,
    updateBenefitTypeDto: UpdateBenefitTypeDto,
  ): Promise<any> {
    const db = this.dbService.getDb();

    // Check if benefit type exists and belongs to tenant
    await this.findOne(tenantId, id);

    const result = await db
      .update(benefitTypes)
      .set({
        ...(updateBenefitTypeDto.name !== undefined && { name: updateBenefitTypeDto.name }),
        ...(updateBenefitTypeDto.unit !== undefined && { unit: updateBenefitTypeDto.unit }),
        ...(updateBenefitTypeDto.requiresApproval !== undefined && {
          requiresApproval: updateBenefitTypeDto.requiresApproval,
        }),
      })
      .where(and(eq(benefitTypes.tenantId, tenantId), eq(benefitTypes.id, id)))
      .returning();

    return transformKeysToCamel(result[0]);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if benefit type exists and belongs to tenant
    await this.findOne(tenantId, id);

    await db
      .delete(benefitTypes)
      .where(and(eq(benefitTypes.tenantId, tenantId), eq(benefitTypes.id, id)));
  }
}
