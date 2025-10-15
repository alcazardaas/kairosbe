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
import { TimesheetsService } from './timesheets.service';
import { CreateTimesheetDto, createTimesheetSchema } from './dto/create-timesheet.dto';
import { ReviewTimesheetDto, reviewTimesheetSchema } from './dto/review-timesheet.dto';
import { CurrentTenantId, CurrentSession } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get()
  async findAll(
    @CurrentTenantId() tenantId: string,
    @Query('user_id') userId?: string,
    @Query('week_start') weekStart?: string,
    @Query('status') status?: string,
  ) {
    const timesheets = await this.timesheetsService.findAll(tenantId, userId, weekStart, status);
    return {
      data: timesheets,
      meta: {
        total: timesheets.length,
      },
    };
  }

  @Get(':id')
  async findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    const timesheet = await this.timesheetsService.findOne(tenantId, id);
    return {
      data: timesheet,
    };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createTimesheetSchema))
  async create(@CurrentTenantId() tenantId: string, @Body() dto: CreateTimesheetDto) {
    const timesheet = await this.timesheetsService.create(tenantId, dto);
    return {
      data: timesheet,
    };
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submit(@CurrentTenantId() tenantId: string, @Param('id') id: string, @CurrentSession() session: any) {
    const timesheet = await this.timesheetsService.submit(tenantId, id, session.userId);
    return {
      data: timesheet,
    };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(reviewTimesheetSchema))
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
  async remove(@CurrentTenantId() tenantId: string, @Param('id') id: string, @CurrentSession() session: any) {
    await this.timesheetsService.remove(tenantId, id, session.userId);
  }
}
