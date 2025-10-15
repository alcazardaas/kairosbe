import { Injectable, ForbiddenException } from '@nestjs/common';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { holidays, benefitRequests, timesheets, users, profiles, benefitTypes } from '../db/schema';

export interface CalendarItem {
  type: 'holiday' | 'leave' | 'timesheet_period';
  title: string;
  date?: string;
  start?: string;
  end?: string;
  userId?: string;
  status?: string;
}

@Injectable()
export class CalendarService {
  constructor(private readonly db: DbService) {}

  /**
   * Get unified calendar feed for a user
   * Includes holidays, approved leave, and optionally timesheets
   */
  async getCalendarFeed(
    tenantId: string,
    currentUserId: string,
    targetUserId: string,
    from: string,
    to: string,
    include: string[] = ['holidays', 'leave', 'timesheets'],
  ): Promise<{ items: CalendarItem[] }> {
    // Check authorization: user can view their own calendar,
    // or manager can view team member calendars
    if (currentUserId !== targetUserId) {
      await this.verifyManagerAccess(tenantId, currentUserId, targetUserId);
    }

    const items: CalendarItem[] = [];

    // Fetch holidays if requested
    if (include.includes('holidays')) {
      const holidayItems = await this.getHolidays(tenantId, from, to);
      items.push(...holidayItems);
    }

    // Fetch approved leave if requested
    if (include.includes('leave')) {
      const leaveItems = await this.getApprovedLeave(tenantId, targetUserId, from, to);
      items.push(...leaveItems);
    }

    // Fetch timesheets if requested
    if (include.includes('timesheets')) {
      const timesheetItems = await this.getTimesheets(tenantId, targetUserId, from, to);
      items.push(...timesheetItems);
    }

    return { items };
  }

  /**
   * Verify that current user is the manager of target user
   */
  private async verifyManagerAccess(
    tenantId: string,
    managerId: string,
    employeeId: string,
  ): Promise<void> {
    const [profile] = await this.db.db
      .select({ managerUserId: profiles.managerUserId })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), eq(profiles.userId, employeeId)))
      .limit(1);

    if (!profile || profile.managerUserId !== managerId) {
      throw new ForbiddenException('You can only view calendars for your direct reports');
    }
  }

  /**
   * Get holidays within date range
   */
  private async getHolidays(tenantId: string, from: string, to: string): Promise<CalendarItem[]> {
    const results = await this.db.db
      .select({
        date: holidays.date,
        name: holidays.name,
      })
      .from(holidays)
      .where(
        and(
          or(eq(holidays.tenantId, tenantId), sql`${holidays.tenantId} IS NULL`),
          gte(holidays.date, sql`${from}::date`),
          lte(holidays.date, sql`${to}::date`),
        ),
      );

    return results.map((h) => ({
      type: 'holiday' as const,
      title: h.name,
      date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : String(h.date),
    }));
  }

  /**
   * Get approved leave requests within date range
   */
  private async getApprovedLeave(
    tenantId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<CalendarItem[]> {
    const results = await this.db.db
      .select({
        startDate: benefitRequests.startDate,
        endDate: benefitRequests.endDate,
        userId: benefitRequests.userId,
        userName: users.name,
        benefitTypeName: benefitTypes.name,
      })
      .from(benefitRequests)
      .leftJoin(users, eq(benefitRequests.userId, users.id))
      .leftJoin(benefitTypes, eq(benefitRequests.benefitTypeId, benefitTypes.id))
      .where(
        and(
          eq(benefitRequests.tenantId, tenantId),
          eq(benefitRequests.userId, userId),
          eq(benefitRequests.status, 'approved'),
          // Date overlap: (start_date <= to) AND (end_date >= from)
          lte(benefitRequests.startDate, sql`${to}::date`),
          gte(benefitRequests.endDate, sql`${from}::date`),
        ),
      );

    return results.map((r) => ({
      type: 'leave' as const,
      title: `${r.benefitTypeName || 'Leave'} - ${r.userName || 'Unknown'}`,
      start:
        r.startDate instanceof Date ? r.startDate.toISOString().split('T')[0] : String(r.startDate),
      end: r.endDate instanceof Date ? r.endDate.toISOString().split('T')[0] : String(r.endDate),
      userId: r.userId,
    }));
  }

  /**
   * Get timesheet periods within date range
   */
  private async getTimesheets(
    tenantId: string,
    userId: string,
    from: string,
    to: string,
  ): Promise<CalendarItem[]> {
    // Get timesheet policy for week calculation
    const weekLength = 7; // Default to 7 days

    const results = await this.db.db
      .select({
        weekStartDate: timesheets.weekStartDate,
        status: timesheets.status,
        userId: timesheets.userId,
      })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.tenantId, tenantId),
          eq(timesheets.userId, userId),
          gte(timesheets.weekStartDate, sql`${from}::date`),
          lte(timesheets.weekStartDate, sql`${to}::date`),
        ),
      );

    return results.map((t) => {
      // weekStartDate is a date string from the database
      const weekStart = String(t.weekStartDate);

      // Calculate week end (week_start + 6 days)
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + weekLength - 1);
      const weekEnd = endDate.toISOString().split('T')[0];

      return {
        type: 'timesheet_period' as const,
        title: `Timesheet (${t.status})`,
        start: weekStart,
        end: weekEnd,
        status: t.status,
        userId: t.userId,
      };
    });
  }
}
