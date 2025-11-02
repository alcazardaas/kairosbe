import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { CurrentTenantId } from '../auth/decorators/current-user.decorator';

@ApiTags('Timesheet Policies')
@ApiSecurity('session')
@Controller('timesheet-policies')
export class TimesheetPoliciesController {
  constructor(private readonly timesheetPoliciesService: TimesheetPoliciesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get timesheet policy for current tenant',
    description: 'Retrieve the timesheet policy configuration for the authenticated user\'s tenant.',
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
  async findOne(@CurrentTenantId() tenantId: string) {
    return this.timesheetPoliciesService.findOne(tenantId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a timesheet policy',
    description: 'Create a new timesheet policy for the current tenant.',
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
    @CurrentTenantId() tenantId: string,
    @Body(new ZodValidationPipe(createTimesheetPolicySchema))
    createTimesheetPolicyDto: CreateTimesheetPolicyDto,
  ) {
    return this.timesheetPoliciesService.create(tenantId, createTimesheetPolicyDto);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update a timesheet policy',
    description: 'Update the timesheet policy configuration for the current tenant.',
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
    @CurrentTenantId() tenantId: string,
    @Body(new ZodValidationPipe(updateTimesheetPolicySchema))
    updateTimesheetPolicyDto: UpdateTimesheetPolicyDto,
  ) {
    return this.timesheetPoliciesService.update(tenantId, updateTimesheetPolicyDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a timesheet policy',
    description: 'Delete the timesheet policy for the current tenant.',
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
  async remove(@CurrentTenantId() tenantId: string) {
    return this.timesheetPoliciesService.remove(tenantId);
  }
}
