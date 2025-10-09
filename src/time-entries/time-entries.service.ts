import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { timeEntries } from '../db/schema/time-entries';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto } from './dto/query-time-entries.dto';
import { eq, and, sql, desc, asc, isNull } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly dbService: DbService) {}

  async findAll(
    query: QueryTimeEntriesDto,
  ): Promise<PaginatedResponse<typeof timeEntries.$inferSelect>> {
    const db = this.dbService.getDb();
    const {
      page,
      limit,
      sort,
      tenant_id,
      user_id,
      project_id,
      task_id,
      week_start_date,
      day_of_week,
    } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenant_id) {
      conditions.push(eq(timeEntries.tenantId, tenant_id));
    }
    if (user_id) {
      conditions.push(eq(timeEntries.userId, user_id));
    }
    if (project_id) {
      conditions.push(eq(timeEntries.projectId, project_id));
    }
    if (task_id !== undefined) {
      if (task_id === null) {
        conditions.push(isNull(timeEntries.taskId));
      } else {
        conditions.push(eq(timeEntries.taskId, task_id));
      }
    }
    if (week_start_date) {
      conditions.push(eq(timeEntries.weekStartDate, new Date(week_start_date)));
    }
    if (day_of_week !== undefined) {
      conditions.push(eq(timeEntries.dayOfWeek, day_of_week));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Parse sort parameter
    let orderByClause;
    if (sort) {
      const [field, order] = sort.split(':');
      const columnMap: Record<string, any> = {
        id: timeEntries.id,
        week_start_date: timeEntries.weekStartDate,
        day_of_week: timeEntries.dayOfWeek,
        hours: timeEntries.hours,
        created_at: timeEntries.createdAt,
        user_id: timeEntries.userId,
        project_id: timeEntries.projectId,
      };
      const column = columnMap[field];
      if (column) {
        orderByClause = order === 'desc' ? desc(column) : asc(column);
      }
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(timeEntries)
      .where(whereClause);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const data = await db
      .select()
      .from(timeEntries)
      .where(whereClause)
      .orderBy(orderByClause || desc(timeEntries.createdAt))
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<typeof timeEntries.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Time entry with ID ${id} not found`);
    }

    return result[0];
  }

  async create(createTimeEntryDto: CreateTimeEntryDto): Promise<typeof timeEntries.$inferSelect> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(timeEntries)
        .values({
          tenantId: createTimeEntryDto.tenant_id,
          userId: createTimeEntryDto.user_id,
          projectId: createTimeEntryDto.project_id,
          taskId: createTimeEntryDto.task_id,
          weekStartDate: new Date(createTimeEntryDto.week_start_date),
          dayOfWeek: createTimeEntryDto.day_of_week,
          hours: createTimeEntryDto.hours.toString(),
          note: createTimeEntryDto.note,
        })
        .returning();

      return result[0];
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        throw new ConflictException(
          `Time entry already exists for this user, project, task, week, and day combination`,
        );
      }
      // Handle foreign key constraint violations
      if (error.code === '23503') {
        if (error.constraint?.includes('project_id')) {
          throw new BadRequestException(
            `Project with ID ${createTimeEntryDto.project_id} not found`,
          );
        }
        if (error.constraint?.includes('user_id')) {
          throw new BadRequestException(`User with ID ${createTimeEntryDto.user_id} not found`);
        }
        if (error.constraint?.includes('task_id')) {
          throw new BadRequestException(`Task with ID ${createTimeEntryDto.task_id} not found`);
        }
        if (error.constraint?.includes('tenant_id')) {
          throw new BadRequestException(`Tenant with ID ${createTimeEntryDto.tenant_id} not found`);
        }
      }
      // Handle check constraint violations
      if (error.code === '23514') {
        if (error.constraint?.includes('day_of_week')) {
          throw new BadRequestException('day_of_week must be between 0 and 6');
        }
        if (error.constraint?.includes('hours')) {
          throw new BadRequestException('hours must be >= 0');
        }
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateTimeEntryDto: UpdateTimeEntryDto,
  ): Promise<typeof timeEntries.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if time entry exists
    await this.findOne(id);

    try {
      const updateData: any = {};
      if (updateTimeEntryDto.hours !== undefined) {
        updateData.hours = updateTimeEntryDto.hours.toString();
      }
      if (updateTimeEntryDto.note !== undefined) {
        updateData.note = updateTimeEntryDto.note;
      }

      const result = await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, id))
        .returning();

      return result[0];
    } catch (error) {
      // Handle check constraint violations
      if (error.code === '23514') {
        if (error.constraint?.includes('hours')) {
          throw new BadRequestException('hours must be >= 0');
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if time entry exists
    await this.findOne(id);

    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  /**
   * Get total hours for a user in a specific week
   */
  async getWeeklyHours(userId: string, weekStartDate: string): Promise<number> {
    const db = this.dbService.getDb();

    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${timeEntries.hours} AS NUMERIC)), 0)` })
      .from(timeEntries)
      .where(
        and(eq(timeEntries.userId, userId), eq(timeEntries.weekStartDate, new Date(weekStartDate))),
      );

    return Number(result[0]?.total || 0);
  }

  /**
   * Get total hours for a project
   */
  async getProjectHours(projectId: string): Promise<number> {
    const db = this.dbService.getDb();

    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(CAST(${timeEntries.hours} AS NUMERIC)), 0)` })
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId));

    return Number(result[0]?.total || 0);
  }
}
