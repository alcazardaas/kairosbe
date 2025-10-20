import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';
import { CalendarResponseDto } from './dto/calendar-response.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Calendar')
@ApiSecurity('session')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({
    summary: 'Get unified calendar feed',
    description: 'Retrieve a unified calendar feed including holidays, leave requests, and timesheets for a user. Query parameters: user_id (optional, defaults to current user), from (required YYYY-MM-DD), to (required YYYY-MM-DD), include (optional comma-separated: holidays,leave,timesheets).',
  })
  @ApiOkResponse({
    description: 'Calendar feed retrieved successfully',
    type: CalendarResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Missing required parameters (from and to dates)',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
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
