import { Controller, Get, Post, Delete, Body, Param, Query, UsePipes } from '@nestjs/common';
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

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  /**
   * GET /leave-requests
   * List leave requests with optional filters
   */
  @Get()
  async findAll(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Query('mine') mine?: string,
    @Query('team') team?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected' | 'cancelled',
  ) {
    const userId = session?.userId;
    const filters = {
      mine: mine === 'true',
      team: team === 'true',
      status,
    };

    const results = await this.leaveRequestsService.findAll(tenantId, userId, filters);

    return {
      data: results,
      meta: {
        count: results.length,
        filters,
      },
    };
  }

  /**
   * GET /leave-requests/:id
   * Get a single leave request
   */
  @Get(':id')
  async findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
    const result = await this.leaveRequestsService.findOne(tenantId, id);
    return { data: result };
  }

  /**
   * POST /leave-requests
   * Create a new leave request
   */
  @Post()
  @UsePipes(new ZodValidationPipe(createLeaveRequestSchema))
  async create(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Body() dto: CreateLeaveRequestDto,
  ) {
    const userId = session.userId;
    const result = await this.leaveRequestsService.create(tenantId, userId, dto);
    return { data: result };
  }

  /**
   * POST /leave-requests/:id/approve
   * Approve a leave request
   */
  @Post(':id/approve')
  @UsePipes(new ZodValidationPipe(reviewLeaveRequestSchema))
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

  /**
   * POST /leave-requests/:id/reject
   * Reject a leave request
   */
  @Post(':id/reject')
  @UsePipes(new ZodValidationPipe(reviewLeaveRequestSchema))
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

  /**
   * DELETE /leave-requests/:id
   * Cancel a leave request (user can cancel their own pending requests)
   */
  @Delete(':id')
  async cancel(
    @CurrentTenantId() tenantId: string,
    @CurrentSession() session: any,
    @Param('id') id: string,
  ) {
    const userId = session.userId;
    const result = await this.leaveRequestsService.cancel(tenantId, id, userId);
    return { data: result };
  }

  /**
   * GET /leave-requests/users/:userId/benefits
   * Get benefit balances for a user
   */
  @Get('users/:userId/benefits')
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
