import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, sql, desc, gte, lte, inArray } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { timesheets, timeEntries, users, profiles, timesheetPolicies } from '../db/schema';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { ReviewTimesheetDto } from './dto/review-timesheet.dto';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

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

    // Transform to camelCase for API response
    return {
      data: enrichedResults.map(transformKeysToCamel),
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

    // Transform to camelCase for API response
    return transformKeysToCamel({
      ...timesheet,
      timeEntries: entries,
    });
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

    return transformKeysToCamel(timesheet);
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
      throw new BadRequestException(
        `Timesheet cannot be submitted. Current status: ${timesheet.status}`,
      );
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

    return transformKeysToCamel(updated);
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
      throw new BadRequestException(
        `Timesheet cannot be approved. Current status: ${timesheet.status}`,
      );
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

    return transformKeysToCamel(updated);
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
      throw new BadRequestException(
        `Timesheet cannot be rejected. Current status: ${timesheet.status}`,
      );
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

    return transformKeysToCamel(updated);
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

  /**
   * Validate timesheet against policy rules
   */
  async validateTimesheet(tenantId: string, timesheetId: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, timesheetId), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    // Get tenant policy
    const [policy] = await this.db.db
      .select()
      .from(timesheetPolicies)
      .where(eq(timesheetPolicies.tenantId, tenantId))
      .limit(1);

    // Get all time entries for this timesheet
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

    const errors: any[] = [];
    const warnings: any[] = [];

    // Calculate daily totals
    const dailyTotals: Record<number, number> = {};
    let weeklyTotal = 0;
    const projectSet = new Set<string>();

    entries.forEach((entry) => {
      const hours = Number(entry.hours);
      dailyTotals[entry.dayOfWeek] = (dailyTotals[entry.dayOfWeek] || 0) + hours;
      weeklyTotal += hours;
      projectSet.add(entry.projectId);
    });

    // Validate daily max hours
    if (policy && policy.maxHoursPerDay) {
      Object.entries(dailyTotals).forEach(([day, hours]) => {
        if (hours > Number(policy.maxHoursPerDay)) {
          const weekStart = new Date(timesheet.weekStartDate);
          const entryDate = new Date(weekStart);
          entryDate.setDate(entryDate.getDate() + Number(day));

          const dayNames = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ];

          errors.push({
            type: 'max_hours_exceeded',
            severity: 'error',
            message: `${dayNames[Number(day)]} exceeds maximum ${policy.maxHoursPerDay} hours per day (logged: ${hours})`,
            day_of_week: Number(day),
            date: entryDate.toISOString().split('T')[0],
            hours,
            max_allowed: Number(policy.maxHoursPerDay),
          });
        }
      });
    }

    // Check for empty days (warning only)
    for (let day = 0; day < 7; day++) {
      if (!dailyTotals[day]) {
        const weekStart = new Date(timesheet.weekStartDate);
        const entryDate = new Date(weekStart);
        entryDate.setDate(entryDate.getDate() + day);

        const dayNames = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];

        warnings.push({
          type: 'no_entries',
          severity: 'warning',
          message: `No time entries for ${dayNames[day]}`,
          day_of_week: day,
          date: entryDate.toISOString().split('T')[0],
        });
      }
    }

    // Warning for low weekly hours (assuming 40 hours standard)
    const expectedWeeklyHours = 40;
    if (weeklyTotal < expectedWeeklyHours) {
      warnings.push({
        type: 'low_hours',
        severity: 'warning',
        message: `Total hours (${weeklyTotal}) below expected (${expectedWeeklyHours})`,
        hours: weeklyTotal,
        expected: expectedWeeklyHours,
      });
    }

    const response = {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total_hours: weeklyTotal,
        days_with_entries: Object.keys(dailyTotals).length,
        entry_count: entries.length,
        project_count: projectSet.size,
        status: timesheet.status,
      },
    };

    // Transform to camelCase for API response
    return transformKeysToCamel(response);
  }

  /**
   * Recall a submitted timesheet back to draft
   */
  async recall(tenantId: string, timesheetId: string, currentUserId: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, timesheetId), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${timesheetId} not found`);
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestException(
        `Cannot recall timesheet. Current status: ${timesheet.status}. Only submitted timesheets can be recalled.`,
      );
    }

    // Check if user owns this timesheet
    if (timesheet.userId !== currentUserId) {
      throw new ForbiddenException('You can only recall your own timesheets');
    }

    // Check if already reviewed
    if (timesheet.reviewedAt) {
      throw new BadRequestException('Cannot recall timesheet that has already been reviewed');
    }

    const previousStatus = timesheet.status;

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'draft',
        submittedAt: null,
        submittedByUserId: null,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    const response = {
      id: updated.id,
      status: updated.status,
      previous_status: previousStatus,
      recalled_at: new Date(),
      recalled_by_user_id: currentUserId,
    };

    // Transform to camelCase for API response
    return transformKeysToCamel(response);
  }

  /**
   * Get or create current week's timesheet for logged-in user
   */
  async getMyCurrent(tenantId: string, userId: string, weekStartPolicy: number = 1) {
    // Calculate current week start date based on policy
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 6=Saturday

    // Calculate days to subtract to get to week start
    let daysToSubtract = currentDay - weekStartPolicy;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    const weekStartDate = weekStart.toISOString().split('T')[0];

    // Try to find existing timesheet
    const [existing] = await this.db.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.tenantId, tenantId),
          eq(timesheets.userId, userId),
          eq(timesheets.weekStartDate, weekStartDate),
        ),
      )
      .limit(1);

    if (existing) {
      return transformKeysToCamel({
        ...existing,
        auto_created: false,
      });
    }

    // Create new draft timesheet
    const [newTimesheet] = await this.db.db
      .insert(timesheets)
      .values({
        tenantId,
        userId,
        weekStartDate,
        status: 'draft',
      })
      .returning();

    return transformKeysToCamel({
      ...newTimesheet,
      auto_created: true,
    });
  }
}
