import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, sql, desc, gte, lte, inArray } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { timesheets, timeEntries, users, profiles } from '../db/schema';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { ReviewTimesheetDto } from './dto/review-timesheet.dto';

@Injectable()
export class TimesheetsService {
  constructor(private readonly db: DbService) {}

  /**
   * List timesheets with optional filtering
   */
  async findAll(
    tenantId: string,
    currentUserId: string,
    filters?: {
      userId?: string;
      weekStartDate?: string;
      status?: string;
      team?: boolean;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const conditions = [eq(timesheets.tenantId, tenantId)];

    // Handle team filtering for managers
    if (filters?.team) {
      // Get direct reports (users where manager_user_id = current user)
      const directReports = await this.db.db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(and(eq(profiles.tenantId, tenantId), eq(profiles.managerUserId, currentUserId)));

      const teamUserIds = directReports.map((r) => r.userId);

      if (teamUserIds.length === 0) {
        // No direct reports, return empty
        return { data: [], total: 0, page: filters.page || 1, pageSize: filters.pageSize || 20 };
      }

      conditions.push(inArray(timesheets.userId, teamUserIds));
    } else if (filters?.userId) {
      conditions.push(eq(timesheets.userId, filters.userId));
    }

    if (filters?.weekStartDate) {
      conditions.push(eq(timesheets.weekStartDate, filters.weekStartDate));
    }

    if (filters?.status) {
      conditions.push(eq(timesheets.status, filters.status as any));
    }

    // Date range filtering
    if (filters?.from) {
      conditions.push(gte(timesheets.weekStartDate, filters.from));
    }

    if (filters?.to) {
      conditions.push(lte(timesheets.weekStartDate, filters.to));
    }

    // Get total count
    const [{ count }] = await this.db.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(timesheets)
      .where(and(...conditions));

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // Get paginated results with user info
    const results = await this.db.db
      .select({
        id: timesheets.id,
        userId: timesheets.userId,
        weekStartDate: timesheets.weekStartDate,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
        reviewedAt: timesheets.reviewedAt,
        reviewNote: timesheets.reviewNote,
        createdAt: timesheets.createdAt,
        updatedAt: timesheets.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(timesheets.weekStartDate))
      .limit(pageSize)
      .offset(offset);

    // Calculate total hours for each timesheet (for team view)
    const hoursMap = await this.calculateTotalHours(
      tenantId,
      results.map((r) => ({ userId: r.userId, weekStartDate: r.weekStartDate })),
    );

    const enrichedResults = results.map((r) => {
      const key = `${r.userId}-${r.weekStartDate}`;
      return {
        ...r,
        totalHours: hoursMap.get(key) || 0,
      };
    });

    return {
      data: enrichedResults,
      total: count,
      page,
      pageSize,
    };
  }

  /**
   * Get a single timesheet by ID with its time entries
   */
  async findOne(tenantId: string, id: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    // Get associated time entries
    const entries = await this.db.db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.tenantId, tenantId),
          eq(timeEntries.userId, timesheet.userId),
          sql`${timeEntries.weekStartDate} = ${timesheet.weekStartDate}`,
        ),
      );

    return {
      ...timesheet,
      timeEntries: entries,
    };
  }

  /**
   * Create a new draft timesheet
   */
  async create(tenantId: string, dto: CreateTimesheetDto) {
    // Check if timesheet already exists for this user and week
    const [existing] = await this.db.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.tenantId, tenantId),
          eq(timesheets.userId, dto.userId),
          eq(timesheets.weekStartDate, dto.weekStartDate),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(
        `Timesheet already exists for user ${dto.userId} and week ${dto.weekStartDate}`,
      );
    }

    const [timesheet] = await this.db.db
      .insert(timesheets)
      .values({
        tenantId,
        userId: dto.userId,
        weekStartDate: dto.weekStartDate,
        status: 'draft',
      })
      .returning();

    return timesheet;
  }

  /**
   * Submit a timesheet for approval
   */
  async submit(tenantId: string, id: string, currentUserId: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'draft') {
      throw new BadRequestException(`Timesheet cannot be submitted. Current status: ${timesheet.status}`);
    }

    // Check if user owns this timesheet or is submitting on their behalf
    if (timesheet.userId !== currentUserId) {
      throw new ForbiddenException('You can only submit your own timesheets');
    }

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        submittedByUserId: currentUserId,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    return updated;
  }

  /**
   * Approve a timesheet (manager/admin only)
   */
  async approve(tenantId: string, id: string, currentUserId: string, dto?: ReviewTimesheetDto) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestException(`Timesheet cannot be approved. Current status: ${timesheet.status}`);
    }

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedByUserId: currentUserId,
        reviewNote: dto?.reviewNote,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    return updated;
  }

  /**
   * Reject a timesheet (manager/admin only)
   */
  async reject(tenantId: string, id: string, currentUserId: string, dto: ReviewTimesheetDto) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestException(`Timesheet cannot be rejected. Current status: ${timesheet.status}`);
    }

    if (!dto.reviewNote) {
      throw new BadRequestException('Review note is required when rejecting a timesheet');
    }

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedByUserId: currentUserId,
        reviewNote: dto.reviewNote,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a draft timesheet
   */
  async remove(tenantId: string, id: string, currentUserId: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'draft') {
      throw new BadRequestException('Only draft timesheets can be deleted');
    }

    if (timesheet.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own draft timesheets');
    }

    await this.db.db.delete(timesheets).where(eq(timesheets.id, id));
  }

  /**
   * Helper method to calculate total hours for timesheets
   */
  private async calculateTotalHours(
    tenantId: string,
    timesheetData: Array<{ userId: string; weekStartDate: string }>,
  ): Promise<Map<string, number>> {
    if (timesheetData.length === 0) {
      return new Map();
    }

    const hoursMap = new Map<string, number>();

    for (const ts of timesheetData) {
      const [result] = await this.db.db
        .select({
          total: sql<number>`COALESCE(SUM(${timeEntries.hours}), 0)`,
        })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.tenantId, tenantId),
            eq(timeEntries.userId, ts.userId),
            sql`${timeEntries.weekStartDate} = ${ts.weekStartDate}`,
          ),
        );

      const key = `${ts.userId}-${ts.weekStartDate}`;
      hoursMap.set(key, Number(result?.total || 0));
    }

    return hoursMap;
  }
}
