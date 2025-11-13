import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { holidays } from '../db/schema/holidays';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { QueryHolidaysDto } from './dto/query-holidays.dto';
import { eq, and, ilike, sql, desc, asc, gte, lte, lt, isNull } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

@Injectable()
export class HolidaysService {
  constructor(private readonly dbService: DbService) {}

  async findAll(query: QueryHolidaysDto): Promise<PaginatedResponse<any>> {
    const db = this.dbService.getDb();
    const {
      page,
      limit,
      sort,
      tenantId,
      countryCode,
      year,
      search,
      type,
      startDate,
      endDate,
      upcoming,
    } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenantId !== undefined) {
      if (tenantId === null) {
        conditions.push(isNull(holidays.tenantId));
      } else {
        conditions.push(eq(holidays.tenantId, tenantId));
      }
    }
    if (countryCode) {
      conditions.push(eq(holidays.countryCode, countryCode));
    }
    if (type) {
      conditions.push(eq(holidays.type, type));
    }
    if (year) {
      const yearStartDate = new Date(`${year}-01-01`);
      const yearEndDate = new Date(`${year + 1}-01-01`);
      conditions.push(gte(holidays.date, yearStartDate));
      conditions.push(lt(holidays.date, yearEndDate));
    }
    if (startDate) {
      conditions.push(gte(holidays.date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(holidays.date, new Date(endDate)));
    }
    if (upcoming) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      conditions.push(gte(holidays.date, today));
    }
    if (search) {
      conditions.push(ilike(holidays.name, `%${search}%`));
    }

    // Default behavior: if no date filters provided, show next 12 months
    if (!year && !startDate && !endDate && !upcoming) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneYearFromNow = new Date(today);
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      conditions.push(gte(holidays.date, today));
      conditions.push(lte(holidays.date, oneYearFromNow));
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
        countryCode: holidays.countryCode,
        tenantId: holidays.tenantId,
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

    const transformedData = data.map((item) => transformKeysToCamel(item));
    return createPaginatedResponse(transformedData, total, page, limit);
  }

  async findOne(id: string): Promise<any> {
    const db = this.dbService.getDb();
    const result = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }

    return transformKeysToCamel(result[0]);
  }

  async create(createHolidayDto: CreateHolidayDto): Promise<any> {
    const db = this.dbService.getDb();

    const result = await db
      .insert(holidays)
      .values({
        tenantId: createHolidayDto.tenantId,
        countryCode: createHolidayDto.countryCode,
        date: new Date(createHolidayDto.date),
        name: createHolidayDto.name,
        type: createHolidayDto.type,
        isRecurring: createHolidayDto.isRecurring,
        description: createHolidayDto.description,
      })
      .returning();

    return transformKeysToCamel(result[0]);
  }

  async update(id: string, updateHolidayDto: UpdateHolidayDto): Promise<any> {
    const db = this.dbService.getDb();

    // Check if holiday exists
    await this.findOne(id);

    const result = await db
      .update(holidays)
      .set({
        ...(updateHolidayDto.countryCode !== undefined && {
          countryCode: updateHolidayDto.countryCode,
        }),
        ...(updateHolidayDto.date !== undefined && { date: new Date(updateHolidayDto.date) }),
        ...(updateHolidayDto.name !== undefined && { name: updateHolidayDto.name }),
        ...(updateHolidayDto.type !== undefined && { type: updateHolidayDto.type }),
        ...(updateHolidayDto.isRecurring !== undefined && {
          isRecurring: updateHolidayDto.isRecurring,
        }),
        ...(updateHolidayDto.description !== undefined && {
          description: updateHolidayDto.description,
        }),
      })
      .where(eq(holidays.id, id))
      .returning();

    return transformKeysToCamel(result[0]);
  }

  async remove(id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if holiday exists
    await this.findOne(id);

    await db.delete(holidays).where(eq(holidays.id, id));
  }
}
