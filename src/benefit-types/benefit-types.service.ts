import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { benefitTypes } from '../db/schema/benefits';
import { CreateBenefitTypeDto } from './dto/create-benefit-type.dto';
import { UpdateBenefitTypeDto } from './dto/update-benefit-type.dto';
import { QueryBenefitTypesDto } from './dto/query-benefit-types.dto';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';

@Injectable()
export class BenefitTypesService {
  constructor(private readonly dbService: DbService) {}

  async findAll(
    query: QueryBenefitTypesDto,
  ): Promise<PaginatedResponse<typeof benefitTypes.$inferSelect>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, tenant_id, unit, requires_approval, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenant_id) {
      conditions.push(eq(benefitTypes.tenantId, tenant_id));
    }
    if (unit) {
      conditions.push(eq(benefitTypes.unit, unit));
    }
    if (requires_approval !== undefined) {
      conditions.push(eq(benefitTypes.requiresApproval, requires_approval));
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
        tenant_id: benefitTypes.tenantId,
        requires_approval: benefitTypes.requiresApproval,
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

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<typeof benefitTypes.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db.select().from(benefitTypes).where(eq(benefitTypes.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Benefit type with ID ${id} not found`);
    }

    return result[0];
  }

  async create(
    createBenefitTypeDto: CreateBenefitTypeDto,
  ): Promise<typeof benefitTypes.$inferSelect> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(benefitTypes)
        .values({
          tenantId: createBenefitTypeDto.tenant_id,
          key: createBenefitTypeDto.key,
          name: createBenefitTypeDto.name,
          unit: createBenefitTypeDto.unit,
          requiresApproval: createBenefitTypeDto.requires_approval,
        })
        .returning();

      return result[0];
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
    id: string,
    updateBenefitTypeDto: UpdateBenefitTypeDto,
  ): Promise<typeof benefitTypes.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if benefit type exists
    await this.findOne(id);

    const result = await db
      .update(benefitTypes)
      .set({
        ...(updateBenefitTypeDto.name !== undefined && { name: updateBenefitTypeDto.name }),
        ...(updateBenefitTypeDto.unit !== undefined && { unit: updateBenefitTypeDto.unit }),
        ...(updateBenefitTypeDto.requires_approval !== undefined && {
          requiresApproval: updateBenefitTypeDto.requires_approval,
        }),
      })
      .where(eq(benefitTypes.id, id))
      .returning();

    return result[0];
  }

  async remove(id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if benefit type exists
    await this.findOne(id);

    await db.delete(benefitTypes).where(eq(benefitTypes.id, id));
  }
}
