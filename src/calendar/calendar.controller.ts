import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * GET /calendar
   * Get unified calendar feed
   *
   * Query params:
   * - user_id: User ID to fetch calendar for (defaults to current user)
   * - from: Start date (YYYY-MM-DD) - required
   * - to: End date (YYYY-MM-DD) - required
   * - include: Comma-separated list of item types (holidays,leave,timesheets)
   */
  @Get()
  async getCalendar(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Query('user_id') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('include') include?: string,
  ) {
    // Validate required parameters
    if (!from || !to) {
      throw new BadRequestException('Both "from" and "to" date parameters are required');
    }

    // Default to current user if user_id not provided
    const targetUserId = userId || session.userId;

    // Parse include parameter
    const includeItems = include
      ? include.split(',').map((s) => s.trim())
      : ['holidays', 'leave', 'timesheets'];

    const result = await this.calendarService.getCalendarFeed(
      tenantId,
      session.userId,
      targetUserId,
      from,
      to,
      includeItems,
    );

    return result;
  }
}
