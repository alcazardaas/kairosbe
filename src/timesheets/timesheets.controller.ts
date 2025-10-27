import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
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
import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto, createTimesheetSchema } from './dto/create-timesheet.dto';
import { ReviewTimesheetDto, reviewTimesheetSchema } from './dto/review-timesheet.dto';
import {
  TimesheetResponseDto,
  TimesheetListResponseDto,
  CreateTimesheetRequestDto,
  ReviewTimesheetRequestDto,
} from './dto/timesheet-response.dto';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Timesheets')
@ApiSecurity('session')
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List timesheets',
    description:
      'Retrieve timesheets with optional filters. Supports team view for managers (?team=true) and date range filtering.',
  })
  @ApiOkResponse({
    description: 'Timesheets retrieved successfully',
    type: TimesheetListResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findAll(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Query('user_id') userId?: string,
    @Query('week_start') weekStart?: string,
    @Query('status') status?: string,
    @Query('team') team?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    const result = await this.timesheetsService.findAll(tenantId, session.userId, {
      userId,
      weekStartDate: weekStart,
      status,
      team: team === 'true',
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });

    return {
      data: result.data,
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single timesheet',
    description: 'Retrieve a timesheet by its ID, including associated time entries.',
  })
  @ApiOkResponse({
    description: 'Timesheet retrieved successfully',
    type: TimesheetResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    const timesheet = await this.timesheetsService.findOne(tenantId, id);
    return {
      data: timesheet,
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createTimesheetSchema))
  @ApiOperation({
    summary: 'Create a new timesheet',
    description: 'Create a new draft timesheet for a user and week.',
  })
  @ApiCreatedResponse({
    description: 'Timesheet created successfully',
    type: TimesheetResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid timesheet data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(@CurrentTenantId() tenantId: string, @Body() dto: CreateTimesheetDto) {
    const timesheet = await this.timesheetsService.create(tenantId, dto);
    return {
      data: timesheet,
    };
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit a timesheet for approval',
    description:
      'Submit a draft timesheet for manager approval. Changes status from draft to pending.',
  })
  @ApiOkResponse({
    description: 'Timesheet submitted successfully',
    type: TimesheetResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Timesheet cannot be submitted (invalid status)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async submit(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentSession() session: any,
  ) {
    const timesheet = await this.timesheetsService.submit(tenantId, id, session.userId);
    return {
      data: timesheet,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(reviewTimesheetSchema))
  @ApiOperation({
    summary: 'Approve a timesheet',
    description: 'Approve a pending timesheet. Requires manager role.',
  })
  @ApiOkResponse({
    description: 'Timesheet approved successfully',
    type: TimesheetResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Timesheet cannot be approved (invalid status)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async approve(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentSession() session: any,
    @Body() dto: ReviewTimesheetDto,
  ) {
    const timesheet = await this.timesheetsService.approve(tenantId, id, session.userId, dto);
    return {
      data: timesheet,
    };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(reviewTimesheetSchema))
  @ApiOperation({
    summary: 'Reject a timesheet',
    description: 'Reject a pending timesheet with an optional review note. Requires manager role.',
  })
  @ApiOkResponse({
    description: 'Timesheet rejected successfully',
    type: TimesheetResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Timesheet cannot be rejected (invalid status)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async reject(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentSession() session: any,
    @Body() dto: ReviewTimesheetDto,
  ) {
    const timesheet = await this.timesheetsService.reject(tenantId, id, session.userId, dto);
    return {
      data: timesheet,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a timesheet',
    description: 'Delete a draft timesheet. Only draft timesheets can be deleted.',
  })
  @ApiNoContentResponse({
    description: 'Timesheet deleted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Timesheet cannot be deleted (not in draft status)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async remove(
    @CurrentTenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentSession() session: any,
  ) {
    await this.timesheetsService.remove(tenantId, id, session.userId);
  }
}
