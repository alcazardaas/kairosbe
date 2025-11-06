import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { timeEntries, projects, tasks, timesheets, projectMembers } from '../db/schema';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto } from './dto/query-time-entries.dto';
import { BulkTimeEntryDto } from './dto/bulk-time-entry.dto';
import { CopyWeekDto } from './dto/copy-week.dto';
import { eq, and, sql, desc, asc, isNull, gte, lte } from 'drizzle-orm';
import { PaginatedResponse } from '../common/types/pagination.types';
import { createPaginatedResponse, calculateOffset } from '../common/helpers/pagination.helper';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

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
      tenantId,
      userId,
      projectId,
      taskId,
      weekStartDate,
      weekEndDate,
      dayOfWeek,
    } = query;
    const offset = calculateOffset(page, limit);

    // Build where conditions
    const conditions = [];
    if (tenantId) {
      conditions.push(eq(timeEntries.tenantId, tenantId));
    }
    if (userId) {
      conditions.push(eq(timeEntries.userId, userId));
    }
    if (projectId) {
      conditions.push(eq(timeEntries.projectId, projectId));
    }
    if (taskId !== undefined) {
      if (taskId === null) {
        conditions.push(isNull(timeEntries.taskId));
      } else {
        conditions.push(eq(timeEntries.taskId, taskId));
      }
    }
    // Handle weekStartDate and weekEndDate filtering
    if (weekStartDate && weekEndDate) {
      // Date range filtering: weekStartDate between start and end
      conditions.push(gte(timeEntries.weekStartDate, new Date(weekStartDate)));
      conditions.push(lte(timeEntries.weekStartDate, new Date(weekEndDate)));
    } else if (weekStartDate) {
      // Exact match for backward compatibility
      conditions.push(eq(timeEntries.weekStartDate, new Date(weekStartDate)));
    } else if (weekEndDate) {
      // Filter by end date only
      conditions.push(lte(timeEntries.weekStartDate, new Date(weekEndDate)));
    }
    if (dayOfWeek !== undefined) {
      conditions.push(eq(timeEntries.dayOfWeek, dayOfWeek));
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

    // Transform to camelCase for API response
    const transformedData = data.map(transformKeysToCamel);
    return createPaginatedResponse(transformedData, total, page, limit);
  }

  async findOne(id: string): Promise<typeof timeEntries.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);

    if (!result.length) {
      throw new NotFoundException(`Time entry with ID ${id} not found`);
    }

    return transformKeysToCamel(result[0]);
  }

  async create(createTimeEntryDto: CreateTimeEntryDto): Promise<typeof timeEntries.$inferSelect> {
    const db = this.dbService.getDb();

    // Validate project membership
    const isMember = await this.validateProjectMembership(
      createTimeEntryDto.tenantId,
      createTimeEntryDto.userId,
      createTimeEntryDto.projectId,
    );

    if (!isMember) {
      throw new ForbiddenException(
        `User is not a member of project ${createTimeEntryDto.projectId}`,
      );
    }

    // Validate timesheet is editable
    await this.validateTimesheetEditable(
      createTimeEntryDto.tenantId,
      createTimeEntryDto.userId,
      createTimeEntryDto.weekStartDate,
    );

    try {
      const result = await db
        .insert(timeEntries)
        .values({
          tenantId: createTimeEntryDto.tenantId,
          userId: createTimeEntryDto.userId,
          projectId: createTimeEntryDto.projectId,
          taskId: createTimeEntryDto.taskId,
          weekStartDate: new Date(createTimeEntryDto.weekStartDate),
          dayOfWeek: createTimeEntryDto.dayOfWeek,
          hours: createTimeEntryDto.hours.toString(),
          note: createTimeEntryDto.note,
        })
        .returning();

      return transformKeysToCamel(result[0]);
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
            `Project with ID ${createTimeEntryDto.projectId} not found`,
          );
        }
        if (error.constraint?.includes('user_id')) {
          throw new BadRequestException(`User with ID ${createTimeEntryDto.userId} not found`);
        }
        if (error.constraint?.includes('task_id')) {
          throw new BadRequestException(`Task with ID ${createTimeEntryDto.taskId} not found`);
        }
        if (error.constraint?.includes('tenant_id')) {
          throw new BadRequestException(`Tenant with ID ${createTimeEntryDto.tenantId} not found`);
        }
      }
      // Handle check constraint violations
      if (error.code === '23514') {
        if (error.constraint?.includes('day_of_week')) {
          throw new BadRequestException('dayOfWeek must be between 0 and 6');
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
    const existingEntry = await this.findOne(id);

    // Validate timesheet is editable
    await this.validateTimesheetEditable(
      existingEntry.tenantId,
      existingEntry.userId,
      existingEntry.weekStartDate.toISOString().split('T')[0],
    );

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

      return transformKeysToCamel(result[0]);
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
    const existingEntry = await this.findOne(id);

    // Validate timesheet is editable
    await this.validateTimesheetEditable(
      existingEntry.tenantId,
      existingEntry.userId,
      existingEntry.weekStartDate.toISOString().split('T')[0],
    );

    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  /**
   * Get weekly hours for a user with daily breakdown
   */
  async getWeeklyHours(
    userId: string,
    weekStartDate: string,
  ): Promise<{
    userId: string;
    weekStartDate: string;
    weekEndDate: string;
    totalHours: number;
    hoursPerDay: Record<string, number>;
    entriesCount: number;
  }> {
    const db = this.dbService.getDb();

    // Calculate week end date (6 days after start)
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndDate = weekEnd.toISOString().split('T')[0];

    // Get all time entries for the week
    const entries = await db
      .select({
        dayOfWeek: timeEntries.dayOfWeek,
        hours: timeEntries.hours,
      })
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, userId), eq(timeEntries.weekStartDate, new Date(weekStartDate))));

    // Initialize hoursPerDay with all 7 days set to 0
    const hoursPerDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      hoursPerDay[dateKey] = 0;
    }

    // Aggregate hours by day
    let totalHours = 0;
    entries.forEach((entry) => {
      const hours = Number(entry.hours);
      totalHours += hours;

      // Calculate date for this day of week
      const date = new Date(weekStart);
      date.setDate(date.getDate() + entry.dayOfWeek);
      const dateKey = date.toISOString().split('T')[0];
      hoursPerDay[dateKey] += hours;
    });

    // Round totalHours and hoursPerDay to 2 decimal places
    totalHours = Math.round(totalHours * 100) / 100;
    Object.keys(hoursPerDay).forEach((key) => {
      hoursPerDay[key] = Math.round(hoursPerDay[key] * 100) / 100;
    });

    return {
      userId,
      weekStartDate,
      weekEndDate,
      totalHours,
      hoursPerDay,
      entriesCount: entries.length,
    };
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

  /**
   * Get user project statistics with optional date filtering
   */
  async getUserProjectStats(
    userId: string,
    filters: {
      weekStartDate?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<{
    userId: string;
    totalHours: number;
    projects: Array<{
      projectId: string;
      projectName: string;
      totalHours: number;
      percentage: number;
    }>;
  }> {
    const db = this.dbService.getDb();

    // Build where conditions
    const conditions = [eq(timeEntries.userId, userId)];

    // If weekStartDate is provided, filter for that specific week
    if (filters.weekStartDate) {
      conditions.push(eq(timeEntries.weekStartDate, new Date(filters.weekStartDate)));
    }
    // Otherwise, if startDate/endDate are provided, use date range
    else {
      if (filters.startDate) {
        conditions.push(gte(timeEntries.weekStartDate, new Date(filters.startDate)));
      }
      if (filters.endDate) {
        conditions.push(lte(timeEntries.weekStartDate, new Date(filters.endDate)));
      }
    }

    // If no date filters provided, default to current week
    if (!filters.weekStartDate && !filters.startDate && !filters.endDate) {
      // Calculate current week start based on Monday (can be enhanced with policy later)
      const now = new Date();
      const currentDay = now.getDay(); // 0=Sunday, 6=Saturday
      const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);
      const weekStartDate = weekStart.toISOString().split('T')[0];
      conditions.push(eq(timeEntries.weekStartDate, new Date(weekStartDate)));
    }

    // Get time entries with project details
    const entries = await db
      .select({
        projectId: timeEntries.projectId,
        projectName: projects.name,
        hours: timeEntries.hours,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(...conditions));

    // Aggregate by project
    const projectMap = new Map<
      string,
      { projectId: string; projectName: string; totalHours: number }
    >();
    let totalHours = 0;

    entries.forEach((entry) => {
      const hours = Number(entry.hours);
      totalHours += hours;

      const projectId = entry.projectId;
      const projectName = entry.projectName || 'Unknown Project';

      if (projectMap.has(projectId)) {
        projectMap.get(projectId)!.totalHours += hours;
      } else {
        projectMap.set(projectId, {
          projectId,
          projectName,
          totalHours: hours,
        });
      }
    });

    // Convert map to array and calculate percentages
    const projectsArray = Array.from(projectMap.values()).map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      totalHours: Math.round(project.totalHours * 100) / 100,
      percentage: totalHours > 0 ? Math.round((project.totalHours / totalHours) * 10000) / 100 : 0,
    }));

    // Sort by totalHours descending
    projectsArray.sort((a, b) => b.totalHours - a.totalHours);

    return {
      userId,
      totalHours: Math.round(totalHours * 100) / 100,
      projects: projectsArray,
    };
  }

  /**
   * Get week view with aggregations and project/task details
   */
  async getWeekView(userId: string, weekStartDate: string, tenantId: string) {
    const db = this.dbService.getDb();

    // Calculate week end date (6 days after start)
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Get time entries with project and task details
    const entries = await db
      .select({
        id: timeEntries.id,
        project_id: timeEntries.projectId,
        project_name: projects.name,
        project_code: projects.code,
        task_id: timeEntries.taskId,
        task_name: tasks.name,
        day_of_week: timeEntries.dayOfWeek,
        hours: timeEntries.hours,
        note: timeEntries.note,
        created_at: timeEntries.createdAt,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .leftJoin(tasks, eq(timeEntries.taskId, tasks.id))
      .where(
        and(
          eq(timeEntries.userId, userId),
          eq(timeEntries.weekStartDate, new Date(weekStartDate)),
          eq(timeEntries.tenantId, tenantId),
        ),
      )
      .orderBy(asc(timeEntries.dayOfWeek), asc(projects.name));

    // Calculate daily totals (0=Sunday to 6=Saturday)
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    const byProject: Record<string, { project_name: string; project_code: string; hours: number }> =
      {};

    entries.forEach((entry) => {
      const hours = Number(entry.hours);
      dailyTotals[entry.day_of_week] += hours;

      if (!byProject[entry.project_id]) {
        byProject[entry.project_id] = {
          project_name: entry.project_name || '',
          project_code: entry.project_code || '',
          hours: 0,
        };
      }
      byProject[entry.project_id].hours += hours;
    });

    const weeklyTotal = dailyTotals.reduce((sum, hours) => sum + hours, 0);

    // Get or create timesheet
    let [timesheet] = await db
      .select({
        id: timesheets.id,
        status: timesheets.status,
        submitted_at: timesheets.submittedAt,
        reviewed_at: timesheets.reviewedAt,
        review_note: timesheets.reviewNote,
      })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          eq(timesheets.weekStartDate, weekStartDate),
          eq(timesheets.tenantId, tenantId),
        ),
      )
      .limit(1);

    // Auto-create draft timesheet if not found
    if (!timesheet) {
      const [newTimesheet] = await db
        .insert(timesheets)
        .values({
          tenantId,
          userId,
          weekStartDate,
          status: 'draft',
        })
        .returning({
          id: timesheets.id,
          status: timesheets.status,
          submitted_at: timesheets.submittedAt,
          reviewed_at: timesheets.reviewedAt,
          review_note: timesheets.reviewNote,
        });

      timesheet = newTimesheet;
    }

    // Format entries with date calculated from week_start_date + day_of_week
    const formattedEntries = entries.map((entry) => {
      const entryDate = new Date(weekStartDate);
      entryDate.setDate(entryDate.getDate() + entry.day_of_week);

      return {
        id: entry.id,
        project_id: entry.project_id,
        project_name: entry.project_name || '',
        project_code: entry.project_code || '',
        task_id: entry.task_id,
        task_name: entry.task_name,
        day_of_week: entry.day_of_week,
        date: entryDate.toISOString().split('T')[0],
        hours: Number(entry.hours),
        note: entry.note,
      };
    });

    // Convert by_project object to projectBreakdown array
    const projectBreakdown = Object.entries(byProject).map(([projectId, info]) => ({
      projectId,
      projectName: info.project_name,
      projectCode: info.project_code,
      totalHours: Math.round(info.hours * 100) / 100,
    }));

    const response = {
      week_start_date: weekStartDate,
      week_end_date: weekEnd.toISOString().split('T')[0],
      user_id: userId,
      entries: formattedEntries,
      daily_totals: dailyTotals.map((h) => Math.round(h * 100) / 100),
      weekly_total: Math.round(weeklyTotal * 100) / 100,
      by_project: byProject,
      projectBreakdown,
      timesheet: timesheet,
    };

    // Transform all keys to camelCase for API response
    return transformKeysToCamel(response);
  }

  /**
   * Bulk create/update time entries
   */
  async bulkCreateOrUpdate(bulkDto: BulkTimeEntryDto, tenantId: string) {
    const db = this.dbService.getDb();
    const created: any[] = [];
    const updated: any[] = [];
    const errors: any[] = [];

    // Validate project membership first
    for (const entry of bulkDto.entries) {
      const isMember = await this.validateProjectMembership(
        tenantId,
        bulkDto.userId,
        entry.projectId,
      );

      if (!isMember) {
        errors.push({
          dayOfWeek: entry.dayOfWeek,
          projectId: entry.projectId,
          error: `User is not a member of project ${entry.projectId}`,
        });
        continue;
      }

      try {
        // Check if entry exists
        const existing = await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.tenantId, tenantId),
              eq(timeEntries.userId, bulkDto.userId),
              eq(timeEntries.projectId, entry.projectId),
              entry.taskId
                ? eq(timeEntries.taskId, entry.taskId)
                : isNull(timeEntries.taskId),
              eq(timeEntries.weekStartDate, new Date(bulkDto.weekStartDate)),
              eq(timeEntries.dayOfWeek, entry.dayOfWeek),
            ),
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing
          const [updatedEntry] = await db
            .update(timeEntries)
            .set({
              hours: entry.hours.toString(),
              note: entry.note,
            })
            .where(eq(timeEntries.id, existing[0].id))
            .returning();

          updated.push(updatedEntry);
        } else {
          // Create new
          const [createdEntry] = await db
            .insert(timeEntries)
            .values({
              tenantId,
              userId: bulkDto.userId,
              projectId: entry.projectId,
              taskId: entry.taskId,
              weekStartDate: new Date(bulkDto.weekStartDate),
              dayOfWeek: entry.dayOfWeek,
              hours: entry.hours.toString(),
              note: entry.note,
            })
            .returning();

          created.push(createdEntry);
        }
      } catch (error) {
        errors.push({
          dayOfWeek: entry.dayOfWeek,
          projectId: entry.projectId,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Transform all entries to camelCase
    const response = {
      created: created.map(transformKeysToCamel),
      updated: updated.map(transformKeysToCamel),
      errors,
      summary: {
        createdCount: created.length,
        updatedCount: updated.length,
        errorCount: errors.length,
        totalRequested: bulkDto.entries.length,
      },
    };

    return response;
  }

  /**
   * Copy time entries from one week to another
   */
  async copyWeek(copyDto: CopyWeekDto, tenantId: string) {
    const db = this.dbService.getDb();

    // Get all entries from source week
    const sourceEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.tenantId, tenantId),
          eq(timeEntries.userId, copyDto.userId),
          eq(timeEntries.weekStartDate, new Date(copyDto.fromWeekStart)),
        ),
      );

    if (sourceEntries.length === 0) {
      return {
        copiedCount: 0,
        skippedCount: 0,
        overwrittenCount: 0,
        entries: [],
        skipped: [],
      };
    }

    const copiedEntries: any[] = [];
    const skipped: any[] = [];
    let overwrittenCount = 0;

    for (const sourceEntry of sourceEntries) {
      try {
        // Check if entry exists in target week
        const existing = await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.tenantId, tenantId),
              eq(timeEntries.userId, copyDto.userId),
              eq(timeEntries.projectId, sourceEntry.projectId),
              sourceEntry.taskId
                ? eq(timeEntries.taskId, sourceEntry.taskId)
                : isNull(timeEntries.taskId),
              eq(timeEntries.weekStartDate, new Date(copyDto.toWeekStart)),
              eq(timeEntries.dayOfWeek, sourceEntry.dayOfWeek),
            ),
          )
          .limit(1);

        if (existing.length > 0 && !copyDto.overwriteExisting) {
          skipped.push({
            dayOfWeek: sourceEntry.dayOfWeek,
            projectId: sourceEntry.projectId,
            reason: 'Entry already exists',
          });
          continue;
        }

        if (existing.length > 0 && copyDto.overwriteExisting) {
          // Update existing entry
          const [updated] = await db
            .update(timeEntries)
            .set({
              hours: sourceEntry.hours,
              note: copyDto.copyNotes ? sourceEntry.note : null,
            })
            .where(eq(timeEntries.id, existing[0].id))
            .returning();

          copiedEntries.push(updated);
          overwrittenCount++;
        } else {
          // Create new entry
          const [newEntry] = await db
            .insert(timeEntries)
            .values({
              tenantId,
              userId: copyDto.userId,
              projectId: sourceEntry.projectId,
              taskId: sourceEntry.taskId,
              weekStartDate: new Date(copyDto.toWeekStart),
              dayOfWeek: sourceEntry.dayOfWeek,
              hours: sourceEntry.hours,
              note: copyDto.copyNotes ? sourceEntry.note : null,
            })
            .returning();

          copiedEntries.push(newEntry);
        }
      } catch (error) {
        skipped.push({
          dayOfWeek: sourceEntry.dayOfWeek,
          projectId: sourceEntry.projectId,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return {
      copiedCount: copiedEntries.length - overwrittenCount,
      skippedCount: skipped.length,
      overwrittenCount: overwrittenCount,
      entries: copiedEntries.map(transformKeysToCamel),
      skipped,
    };
  }

  /**
   * Validate that user is a member of the project
   */
  async validateProjectMembership(
    tenantId: string,
    userId: string,
    projectId: string,
  ): Promise<boolean> {
    const db = this.dbService.getDb();

    const [membership] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.tenantId, tenantId),
          eq(projectMembers.userId, userId),
          eq(projectMembers.projectId, projectId),
        ),
      )
      .limit(1);

    return !!membership;
  }

  /**
   * Check if timesheet is editable (draft or rejected status)
   */
  async validateTimesheetEditable(
    tenantId: string,
    userId: string,
    weekStartDate: string,
  ): Promise<void> {
    const db = this.dbService.getDb();

    const [timesheet] = await db
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

    if (timesheet && timesheet.status !== 'draft' && timesheet.status !== 'rejected') {
      throw new ForbiddenException(
        `Cannot modify time entries. Timesheet status is ${timesheet.status}`,
      );
    }
  }
}
