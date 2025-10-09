import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { holidays } from '../db/schema/holidays';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { QueryHolidaysDto } from './dto/query-holidays.dto';
import { eq, and, ilike, sql, desc, asc, gte, lt, isNull } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';

@Injectable()
export class HolidaysService {
  constructor(private readonly dbService: DbService) {}

  async findAll(query: QueryHolidaysDto): Promise<PaginatedResponse<typeof holidays.$inferSelect>> {
    const db = this.dbService.getDb();
    const { page, limit, sort, tenant_id, country_code, year, search } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenant_id !== undefined) {
      if (tenant_id === null) {
        conditions.push(isNull(holidays.tenantId));
      } else {
        conditions.push(eq(holidays.tenantId, tenant_id));
      }
    }
    if (country_code) {
      conditions.push(eq(holidays.countryCode, country_code));
    }
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year + 1}-01-01`);
      conditions.push(gte(holidays.date, startDate));
      conditions.push(lt(holidays.date, endDate));
    }
    if (search) {
      conditions.push(ilike(holidays.name, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: holidays.id,
        date: holidays.date,
        name: holidays.name,
        country_code: holidays.countryCode,
        tenant_id: holidays.tenantId,
      };
      const column = columnMap[field];
      if (column) {
        orderByClause = order === 'desc' ? desc(column) : asc(column);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(holidays)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select()
      .from(holidays)
      .where(whereClause)
      .orderBy(orderByClause || asc(holidays.date))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<typeof holidays.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return result[0];
  }

  async create(createHolidayDto: CreateHolidayDto): Promise<typeof holidays.$inferSelect> {
    const db = this.dbService.getDb();

    const result = await db
      .insert(holidays)
      .values({
        tenantId: createHolidayDto.tenant_id,
        countryCode: createHolidayDto.country_code,
        date: new Date(createHolidayDto.date),
        name: createHolidayDto.name,
      })
      .returning();

    return result[0];
  }

  async update(
    id: string,
    updateHolidayDto: UpdateHolidayDto,
  ): Promise<typeof holidays.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if holiday exists
    await this.findOne(id);

    const result = await db
      .update(holidays)
      .set({
        ...(updateHolidayDto.country_code !== undefined && {
          countryCode: updateHolidayDto.country_code,
        }),
        ...(updateHolidayDto.date !== undefined && { date: new Date(updateHolidayDto.date) }),
        ...(updateHolidayDto.name !== undefined && { name: updateHolidayDto.name }),
      })
      .where(eq(holidays.id, id))
      .returning();

    return result[0];
  }

  async remove(id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if holiday exists
    await this.findOne(id);

    await db.delete(holidays).where(eq(holidays.id, id));
  }
}
