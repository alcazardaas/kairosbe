import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto, createTimeEntrySchema } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto, updateTimeEntrySchema } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto, queryTimeEntriesSchema } from './dto/query-time-entries.dto';
import { BulkTimeEntryDto, bulkTimeEntrySchema } from './dto/bulk-time-entry.dto';
import { CopyWeekDto, copyWeekSchema } from './dto/copy-week.dto';
import {
  QueryUserProjectStatsDto,
  queryUserProjectStatsSchema,
} from './dto/query-user-project-stats.dto';
import {
  TimeEntryResponseDto,
  TimeEntryListResponseDto,
  WeeklyHoursDto,
  ProjectHoursDto,
  UserProjectStatsDto,
} from './dto/time-entry-response.dto';
import {
  WeekViewResponseDto,
  BulkTimeEntryResultDto,
  CopyWeekResponseDto,
} from './dto/week-view-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';

@ApiTags('Time Entries')
@ApiSecurity('session')
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all time entries',
    description: 'Retrieve a paginated list of time entries with optional filtering and sorting.',
  })
  @ApiOkResponse({
    description: 'Time entries retrieved successfully',
    type: TimeEntryListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findAll(@Query(new ZodValidationPipe(queryTimeEntriesSchema)) query: QueryTimeEntriesDto) {
    return this.timeEntriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single time entry',
    description: 'Retrieve a time entry by its ID.',
  })
  @ApiOkResponse({
    description: 'Time entry retrieved successfully',
    type: TimeEntryResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.timeEntriesService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new time entry',
    description: 'Create a new time entry for logging work hours.',
  })
  @ApiCreatedResponse({
    description: 'Time entry created successfully',
    type: TimeEntryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid time entry data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(
    @Body(new ZodValidationPipe(createTimeEntrySchema)) createTimeEntryDto: CreateTimeEntryDto,
  ) {
    return this.timeEntriesService.create(createTimeEntryDto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a time entry',
    description: 'Update an existing time entry by its ID.',
  })
  @ApiOkResponse({
    description: 'Time entry updated successfully',
    type: TimeEntryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or validation error',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTimeEntrySchema)) updateTimeEntryDto: UpdateTimeEntryDto,
  ) {
    return this.timeEntriesService.update(id, updateTimeEntryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a time entry',
    description: 'Delete a time entry by its ID.',
  })
  @ApiNoContentResponse({
    description: 'Time entry deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Time entry not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async remove(@Param('id') id: string) {
    return this.timeEntriesService.remove(id);
  }

  @Get('stats/weekly/:userId/:weekStartDate')
  @ApiOperation({
    summary: 'Get weekly hours for a user with daily breakdown',
    description:
      'Calculate total hours worked by a user for a specific week, including daily breakdown, week end date, and entry count.',
  })
  @ApiOkResponse({
    description: 'Weekly hours retrieved successfully',
    type: WeeklyHoursDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getWeeklyHours(
    @Param('userId') userId: string,
    @Param('weekStartDate') weekStartDate: string,
  ) {
    return this.timeEntriesService.getWeeklyHours(userId, weekStartDate);
  }

  @Get('stats/project/:projectId')
  @ApiOperation({
    summary: 'Get project total hours',
    description: 'Calculate total hours logged to a specific project.',
  })
  @ApiOkResponse({
    description: 'Project hours retrieved successfully',
    type: ProjectHoursDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getProjectHours(@Param('projectId') projectId: string) {
    const total = await this.timeEntriesService.getProjectHours(projectId);
    return { projectId, totalHours: total };
  }

  @Get('stats/user-projects/:userId')
  @ApiOperation({
    summary: 'Get user project statistics',
    description:
      'Calculate hours distribution across projects for a user with optional date filtering. Defaults to current week if no filters provided.',
  })
  @ApiOkResponse({
    description: 'User project statistics retrieved successfully',
    type: UserProjectStatsDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getUserProjectStats(
    @Param('userId') userId: string,
    @Query(new ZodValidationPipe(queryUserProjectStatsSchema)) query: QueryUserProjectStatsDto,
  ) {
    return this.timeEntriesService.getUserProjectStats(userId, query);
  }

  @Get('week/:userId/:weekStartDate')
  @ApiOperation({
    summary: 'Get week view for timesheet grid',
    description:
      'Retrieve all time entries for a week with aggregations, project/task details, daily totals, and timesheet status.',
  })
  @ApiOkResponse({
    description: 'Week view retrieved successfully',
    type: WeekViewResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getWeekView(
    @Param('userId') userId: string,
    @Param('weekStartDate') weekStartDate: string,
    @CurrentTenantId() tenantId: string,
  ) {
    return this.timeEntriesService.getWeekView(userId, weekStartDate, tenantId);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk create/update time entries',
    description:
      'Create or update multiple time entries in a single request. Useful for filling entire week or updating multiple days.',
  })
  @ApiOkResponse({
    description: 'Bulk operation completed',
    type: BulkTimeEntryResultDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid bulk entry data',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async bulkCreateOrUpdate(
    @Body(new ZodValidationPipe(bulkTimeEntrySchema)) bulkDto: BulkTimeEntryDto,
    @CurrentTenantId() tenantId: string,
  ) {
    return this.timeEntriesService.bulkCreateOrUpdate(bulkDto, tenantId);
  }

  @Post('copy-week')
  @ApiOperation({
    summary: 'Copy time entries from one week to another',
    description:
      'Copy all time entries from a source week to a target week with optional overwrite.',
  })
  @ApiOkResponse({
    description: 'Week copied successfully',
    type: CopyWeekResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid copy week data',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async copyWeek(
    @Body(new ZodValidationPipe(copyWeekSchema)) copyDto: CopyWeekDto,
    @CurrentTenantId() tenantId: string,
  ) {
    return this.timeEntriesService.copyWeek(copyDto, tenantId);
  }
}
