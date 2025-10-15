import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  benefitRequests,
  benefitBalances,
  benefitTypes,
  users,
} from '../db/schema';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ReviewLeaveRequestDto } from './dto/review-leave-request.dto';

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly db: DbService) {}

  /**
   * Find all leave requests with optional filters
   */
  async findAll(
    tenantId: string,
    userId?: string,
    filters?: {
      mine?: boolean;
      team?: boolean;
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    },
  ) {
    const conditions = [eq(benefitRequests.tenantId, tenantId)];

    if (filters?.mine && userId) {
      conditions.push(eq(benefitRequests.userId, userId));
    }

    if (filters?.status) {
      conditions.push(eq(benefitRequests.status, filters.status));
    }

    // For team view, we'd typically filter by manager relationship
    // For now, we'll show all requests for the tenant if team=true
    // This can be enhanced later with proper manager hierarchy

    const results = await this.db.db
      .select({
        id: benefitRequests.id,
        userId: benefitRequests.userId,
        benefitTypeId: benefitRequests.benefitTypeId,
        startDate: benefitRequests.startDate,
        endDate: benefitRequests.endDate,
        amount: benefitRequests.amount,
        status: benefitRequests.status,
        approverUserId: benefitRequests.approverUserId,
        approvedAt: benefitRequests.approvedAt,
        note: benefitRequests.note,
        createdAt: benefitRequests.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
        benefitType: {
          id: benefitTypes.id,
          key: benefitTypes.key,
          name: benefitTypes.name,
          unit: benefitTypes.unit,
        },
      })
      .from(benefitRequests)
      .leftJoin(users, eq(benefitRequests.userId, users.id))
      .leftJoin(benefitTypes, eq(benefitRequests.benefitTypeId, benefitTypes.id))
      .where(and(...conditions))
      .orderBy(sql`${benefitRequests.createdAt} DESC`);

    return results;
  }

  /**
   * Find a single leave request by ID
   */
  async findOne(tenantId: string, id: string) {
    const results = await this.db.db
      .select({
        id: benefitRequests.id,
        userId: benefitRequests.userId,
        benefitTypeId: benefitRequests.benefitTypeId,
        startDate: benefitRequests.startDate,
        endDate: benefitRequests.endDate,
        amount: benefitRequests.amount,
        status: benefitRequests.status,
        approverUserId: benefitRequests.approverUserId,
        approvedAt: benefitRequests.approvedAt,
        note: benefitRequests.note,
        createdAt: benefitRequests.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
        benefitType: {
          id: benefitTypes.id,
          key: benefitTypes.key,
          name: benefitTypes.name,
          unit: benefitTypes.unit,
        },
      })
      .from(benefitRequests)
      .leftJoin(users, eq(benefitRequests.userId, users.id))
      .leftJoin(benefitTypes, eq(benefitRequests.benefitTypeId, benefitTypes.id))
      .where(and(eq(benefitRequests.tenantId, tenantId), eq(benefitRequests.id, id)))
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Create a new leave request
   */
  async create(tenantId: string, userId: string, dto: CreateLeaveRequestDto) {
    // Validate benefit type exists
    const benefitType = await this.db.db
      .select()
      .from(benefitTypes)
      .where(and(eq(benefitTypes.tenantId, tenantId), eq(benefitTypes.id, dto.benefitTypeId)))
      .limit(1);

    if (benefitType.length === 0) {
      throw new BadRequestException('Invalid benefit type');
    }

    // Check if user has sufficient balance
    const balance = await this.getUserBenefitBalance(tenantId, userId, dto.benefitTypeId);
    if (parseFloat(balance.currentBalance) < dto.amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance.currentBalance}, Requested: ${dto.amount}`,
      );
    }

    // Create the request
    const results = await this.db.db
      .insert(benefitRequests)
      .values({
        tenantId,
        userId,
        benefitTypeId: dto.benefitTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        amount: dto.amount.toString(),
        note: dto.note,
        status: 'pending',
      })
      .returning();

    return results[0];
  }

  /**
   * Approve a leave request and update balance
   */
  async approve(tenantId: string, id: string, approverUserId: string, dto?: ReviewLeaveRequestDto) {
    // Find the request
    const request = await this.findOne(tenantId, id);

    // Validate status
    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot approve request with status: ${request.status}`);
    }

    // Update the request
    const updated = await this.db.db
      .update(benefitRequests)
      .set({
        status: 'approved',
        approverUserId,
        approvedAt: new Date(),
        note: dto?.note || request.note,
      })
      .where(and(eq(benefitRequests.tenantId, tenantId), eq(benefitRequests.id, id)))
      .returning();

    // Deduct from balance
    const currentBalance = await this.getUserBenefitBalance(
      tenantId,
      request.userId,
      request.benefitTypeId,
    );

    const newBalance = parseFloat(currentBalance.currentBalance) - parseFloat(request.amount);

    await this.db.db
      .update(benefitBalances)
      .set({
        currentBalance: newBalance.toString(),
      })
      .where(
        and(
          eq(benefitBalances.tenantId, tenantId),
          eq(benefitBalances.userId, request.userId),
          eq(benefitBalances.benefitTypeId, request.benefitTypeId),
        ),
      );

    return updated[0];
  }

  /**
   * Reject a leave request
   */
  async reject(tenantId: string, id: string, approverUserId: string, dto?: ReviewLeaveRequestDto) {
    // Find the request
    const request = await this.findOne(tenantId, id);

    // Validate status
    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot reject request with status: ${request.status}`);
    }

    // Update the request
    const updated = await this.db.db
      .update(benefitRequests)
      .set({
        status: 'rejected',
        approverUserId,
        approvedAt: new Date(),
        note: dto?.note || request.note,
      })
      .where(and(eq(benefitRequests.tenantId, tenantId), eq(benefitRequests.id, id)))
      .returning();

    return updated[0];
  }

  /**
   * Cancel a leave request (user can cancel their own pending requests)
   */
  async cancel(tenantId: string, id: string, userId: string) {
    // Find the request
    const request = await this.findOne(tenantId, id);

    // Validate it belongs to the user
    if (request.userId !== userId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    // Validate status
    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel request with status: ${request.status}`);
    }

    // Update the request
    const updated = await this.db.db
      .update(benefitRequests)
      .set({
        status: 'cancelled',
      })
      .where(and(eq(benefitRequests.tenantId, tenantId), eq(benefitRequests.id, id)))
      .returning();

    return updated[0];
  }

  /**
   * Get benefit balances for a user
   */
  async getUserBenefitBalances(tenantId: string, userId: string) {
    const results = await this.db.db
      .select({
        id: benefitBalances.id,
        benefitTypeId: benefitBalances.benefitTypeId,
        currentBalance: benefitBalances.currentBalance,
        benefitType: {
          id: benefitTypes.id,
          key: benefitTypes.key,
          name: benefitTypes.name,
          unit: benefitTypes.unit,
          requiresApproval: benefitTypes.requiresApproval,
        },
      })
      .from(benefitBalances)
      .leftJoin(benefitTypes, eq(benefitBalances.benefitTypeId, benefitTypes.id))
      .where(and(eq(benefitBalances.tenantId, tenantId), eq(benefitBalances.userId, userId)));

    return results;
  }

  /**
   * Get a single benefit balance (helper method)
   */
  private async getUserBenefitBalance(tenantId: string, userId: string, benefitTypeId: string) {
    const results = await this.db.db
      .select()
      .from(benefitBalances)
      .where(
        and(
          eq(benefitBalances.tenantId, tenantId),
          eq(benefitBalances.userId, userId),
          eq(benefitBalances.benefitTypeId, benefitTypeId),
        ),
      )
      .limit(1);

    if (results.length === 0) {
      throw new NotFoundException('Benefit balance not found for this user');
    }

    return results[0];
  }
}
