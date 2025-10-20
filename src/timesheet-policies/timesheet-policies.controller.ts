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
import { TimesheetPoliciesService } from './timesheet-policies.service';
import {
  CreateTimesheetPolicyDto,
  createTimesheetPolicySchema,
} from './dto/create-timesheet-policy.dto';
import {
  UpdateTimesheetPolicyDto,
  updateTimesheetPolicySchema,
} from './dto/update-timesheet-policy.dto';
import {
  TimesheetPolicyResponseDto,
  TimesheetPolicyListResponseDto,
} from './dto/timesheet-policy-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Timesheet Policies')
@ApiSecurity('session')
@Controller('timesheet-policies')
export class TimesheetPoliciesController {
  constructor(private readonly timesheetPoliciesService: TimesheetPoliciesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all timesheet policies',
    description: 'Retrieve all timesheet policies across tenants.',
  })
  @ApiOkResponse({
    description: 'Timesheet policies retrieved successfully',
    type: TimesheetPolicyListResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findAll() {
    return this.timesheetPoliciesService.findAll();
  }

  @Get(':tenantId')
  @ApiOperation({
    summary: 'Get timesheet policy for a tenant',
    description: 'Retrieve the timesheet policy configuration for a specific tenant.',
  })
  @ApiOkResponse({
    description: 'Timesheet policy retrieved successfully',
    type: TimesheetPolicyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet policy not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@Param('tenantId') tenantId: string) {
    return this.timesheetPoliciesService.findOne(tenantId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a timesheet policy',
    description: 'Create a new timesheet policy for a tenant.',
  })
  @ApiCreatedResponse({
    description: 'Timesheet policy created successfully',
    type: TimesheetPolicyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid timesheet policy data or validation error',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(
    @Body(new ZodValidationPipe(createTimesheetPolicySchema))
    createTimesheetPolicyDto: CreateTimesheetPolicyDto,
  ) {
    return this.timesheetPoliciesService.create(createTimesheetPolicyDto);
  }

  @Patch(':tenantId')
  @ApiOperation({
    summary: 'Update a timesheet policy',
    description: 'Update the timesheet policy configuration for a tenant.',
  })
  @ApiOkResponse({
    description: 'Timesheet policy updated successfully',
    type: TimesheetPolicyResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or validation error',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Timesheet policy not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async update(
    @Param('tenantId') tenantId: string,
    @Body(new ZodValidationPipe(updateTimesheetPolicySchema))
    updateTimesheetPolicyDto: UpdateTimesheetPolicyDto,
  ) {
    return this.timesheetPoliciesService.update(tenantId, updateTimesheetPolicyDto);
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a timesheet policy',
    description: 'Delete the timesheet policy for a tenant.',
  })
  @ApiNoContentResponse({
    description: 'Timesheet policy deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Timesheet policy not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async remove(@Param('tenantId') tenantId: string) {
    return this.timesheetPoliciesService.remove(tenantId);
  }
}
