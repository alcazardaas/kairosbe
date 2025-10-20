import { Controller, Get, Post, Delete, Body, Param, Query, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { LeaveRequestsService } from './leave-requests.service';
import {
  CurrentTenantId,
  CurrentSession,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createLeaveRequestSchema,
  CreateLeaveRequestDto,
} from './dto/create-leave-request.dto';
import {
  reviewLeaveRequestSchema,
  ReviewLeaveRequestDto,
} from './dto/review-leave-request.dto';
import {
  LeaveRequestResponseDto,
  LeaveRequestListResponseDto,
  BenefitBalancesResponseDto,
  CreateLeaveRequestRequestDto,
  ReviewLeaveRequestRequestDto,
} from './dto/leave-request-response.dto';
import { ErrorResponseDto } from '../common/dto/response.dto';

@ApiTags('Leave Requests')
@ApiSecurity('session')
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'List leave requests',
    description: 'Retrieve leave requests with optional filters. Supports ?mine=true for own requests, ?team=true for team view (managers), and date range filtering.',
  })
  @ApiOkResponse({
    description: 'Leave requests retrieved successfully',
    type: LeaveRequestListResponseDto,
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
    @Query('mine') mine?: string,
    @Query('team') team?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected' | 'cancelled',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    const userId = session?.userId;
    const filters = {
      mine: mine === 'true',
      team: team === 'true',
      status,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    };

    const result = await this.leaveRequestsService.findAll(tenantId, userId, filters);

    return {
      data: result.data,
      page: result.page,
      page_size: result.pageSize,
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single leave request',
    description: 'Retrieve a leave request by its ID.',
  })
  @ApiOkResponse({
    description: 'Leave request retrieved successfully',
    type: LeaveRequestResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Leave request not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    const result = await this.leaveRequestsService.findOne(tenantId, id);
    return { data: result };
  }

  @Post()
  @UsePipes(new ZodValidationPipe(createLeaveRequestSchema))
  @ApiOperation({
    summary: 'Create a new leave request',
    description: 'Create a new leave request for PTO, sick leave, or other benefits.',
  })
  @ApiCreatedResponse({
    description: 'Leave request created successfully',
    type: LeaveRequestResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid leave request data or insufficient balance',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    const userId = session.userId;
    const result = await this.leaveRequestsService.create(tenantId, userId, dto);
    return { data: result };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(reviewLeaveRequestSchema))
  @ApiOperation({
    summary: 'Approve a leave request',
    description: 'Approve a pending leave request and update user balance. Requires manager role.',
  })
  @ApiOkResponse({
    description: 'Leave request approved successfully',
    type: LeaveRequestResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Leave request cannot be approved (invalid status)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Leave request not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async approve(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Param('id') id: string,
    @Body() dto?: ReviewLeaveRequestDto,
  ) {
    const approverUserId = session.userId;
    const result = await this.leaveRequestsService.approve(tenantId, id, approverUserId, dto);
    return { data: result };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(reviewLeaveRequestSchema))
  @ApiOperation({
    summary: 'Reject a leave request',
    description: 'Reject a pending leave request with an optional review note. Requires manager role.',
  })
  @ApiOkResponse({
    description: 'Leave request rejected successfully',
    type: LeaveRequestResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Leave request cannot be rejected (invalid status)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Leave request not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async reject(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Param('id') id: string,
    @Body() dto?: ReviewLeaveRequestDto,
  ) {
    const approverUserId = session.userId;
    const result = await this.leaveRequestsService.reject(tenantId, id, approverUserId, dto);
    return { data: result };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel a leave request',
    description: 'Cancel own pending leave request.',
  })
  @ApiOkResponse({
    description: 'Leave request cancelled successfully',
    type: LeaveRequestResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Leave request cannot be cancelled (invalid status or not owned by user)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Leave request not found',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async cancel(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Param('id') id: string,
  ) {
    const userId = session.userId;
    const result = await this.leaveRequestsService.cancel(tenantId, id, userId);
    return { data: result };
  }

  @Get('users/:userId/benefits')
  @ApiOperation({
    summary: 'Get user benefit balances',
    description: 'Retrieve all benefit balances for a user (PTO, sick leave, etc.).',
  })
  @ApiOkResponse({
    description: 'Benefit balances retrieved successfully',
    type: BenefitBalancesResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired session token',
    type: ErrorResponseDto,
  })
  async getUserBenefits(@CurrentTenantId() tenantId: string, @Param('userId') userId: string) {
    const results = await this.leaveRequestsService.getUserBenefitBalances(tenantId, userId);
    return {
      data: results,
      meta: {
        userId,
        count: results.length,
      },
    };
  }
}
