import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TimesheetPoliciesService } from './timesheet-policies.service';
import {
  CreateTimesheetPolicyDto,
  createTimesheetPolicySchema,
} from './dto/create-timesheet-policy.dto';
import {
  UpdateTimesheetPolicyDto,
  updateTimesheetPolicySchema,
} from './dto/update-timesheet-policy.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('timesheet-policies')
export class TimesheetPoliciesController {
  constructor(private readonly timesheetPoliciesService: TimesheetPoliciesService) {}

  @Get()
  async findAll() {
    return this.timesheetPoliciesService.findAll();
  }

  @Get(':tenantId')
  async findOne(@Param('tenantId') tenantId: string) {
    return this.timesheetPoliciesService.findOne(tenantId);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createTimesheetPolicySchema))
    createTimesheetPolicyDto: CreateTimesheetPolicyDto,
  ) {
    return this.timesheetPoliciesService.create(createTimesheetPolicyDto);
  }

  @Patch(':tenantId')
  async update(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(updateTimesheetPolicySchema))
    updateTimesheetPolicyDto: UpdateTimesheetPolicyDto,
  ) {
    return this.timesheetPoliciesService.update(tenantId, updateTimesheetPolicyDto);
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('tenantId') tenantId: string) {
    return this.timesheetPoliciesService.remove(tenantId);
  }
}
