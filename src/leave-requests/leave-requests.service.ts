import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, sql, inArray, gte, lte, or, desc } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import {
  benefitRequests,
  benefitBalances,
  benefitTypes,
  benefitPolicies,
  users,
  profiles,
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
    currentUserId: string,
    filters?: {
      mine?: boolean;
      team?: boolean;
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const conditions = [eq(benefitRequests.tenantId, tenantId)];

    // Handle team filtering for managers
    if (filters?.team) {
      // Get direct reports (users where manager_user_id = current user)
      const directReports = await this.db.db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(and(eq(profiles.tenantId, tenantId), eq(profiles.managerUserId, currentUserId)));

      const teamUserIds = directReports.map((r) => r.userId);

      if (teamUserIds.length === 0) {
        // No direct reports, return empty
        return { data: [], total: 0, page: filters.page || 1, pageSize: filters.pageSize || 20 };
      }

      conditions.push(inArray(benefitRequests.userId, teamUserIds));
    } else if (filters?.mine) {
      conditions.push(eq(benefitRequests.userId, currentUserId));
    }

    if (filters?.status) {
      conditions.push(eq(benefitRequests.status, filters.status));
    }

    // Date range overlap filtering: (start_date <= to) AND (end_date >= from)
    if (filters?.from && filters?.to) {
      conditions.push(lte(benefitRequests.startDate, sql`${filters.to}::date`));
      conditions.push(gte(benefitRequests.endDate, sql`${filters.from}::date`));
    } else if (filters?.from) {
      conditions.push(gte(benefitRequests.endDate, sql`${filters.from}::date`));
    } else if (filters?.to) {
      conditions.push(lte(benefitRequests.startDate, sql`${filters.to}::date`));
    }

    // Get total count
    const [{ count }] = await this.db.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(benefitRequests)
      .where(and(...conditions));

    // Apply pagination
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

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
      .orderBy(desc(benefitRequests.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data: results,
      total: count,
      page,
      pageSize,
    };
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

    // Check if user has sufficient balance (skip if benefit type allows negative balance)
    if (!benefitType[0].allowNegativeBalance) {
      const balance = await this.getUserBenefitBalance(tenantId, userId, dto.benefitTypeId);
      if (parseFloat(balance.currentBalance) < dto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${balance.currentBalance}, Requested: ${dto.amount}`,
        );
      }
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

    // Get benefit type to check if balance deduction is needed
    const benefitType = await this.db.db
      .select()
      .from(benefitTypes)
      .where(eq(benefitTypes.id, request.benefitTypeId))
      .limit(1);

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

    // Deduct from balance only if benefit type doesn't allow negative balance
    if (benefitType[0] && !benefitType[0].allowNegativeBalance) {
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
    }

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
        benefitTypeKey: benefitTypes.key,
        benefitTypeName: benefitTypes.name,
        currentBalance: benefitBalances.currentBalance,
        totalAmount: benefitPolicies.annualAmount,
        unit: benefitTypes.unit,
        requiresApproval: benefitTypes.requiresApproval,
      })
      .from(benefitBalances)
      .leftJoin(benefitTypes, eq(benefitBalances.benefitTypeId, benefitTypes.id))
      .leftJoin(
        benefitPolicies,
        and(
          eq(benefitPolicies.tenantId, tenantId),
          eq(benefitPolicies.benefitTypeId, benefitTypes.id),
          // Get the active policy (effective_from <= now and (effective_to is null or effective_to >= now))
          lte(benefitPolicies.effectiveFrom, sql`CURRENT_DATE`),
          or(
            sql`${benefitPolicies.effectiveTo} IS NULL`,
            gte(benefitPolicies.effectiveTo, sql`CURRENT_DATE`),
          ),
        ),
      )
      .where(and(eq(benefitBalances.tenantId, tenantId), eq(benefitBalances.userId, userId)));

    // Calculate usedAmount = totalAmount - currentBalance
    return results.map((row) => ({
      id: row.id,
      benefitTypeId: row.benefitTypeId,
      benefitTypeKey: row.benefitTypeKey,
      benefitTypeName: row.benefitTypeName,
      currentBalance: row.currentBalance,
      totalAmount: row.totalAmount || '0',
      usedAmount:
        row.totalAmount && row.currentBalance
          ? (parseFloat(row.totalAmount) - parseFloat(row.currentBalance)).toFixed(2)
          : '0',
      unit: row.unit,
      requiresApproval: row.requiresApproval,
    }));
  }

  /**
   * Get a single benefit balance (helper method)
   * Auto-creates with 0 balance if not found
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
      // Auto-create benefit balance with 0 balance
      const [newBalance] = await this.db.db
        .insert(benefitBalances)
        .values({
          tenantId,
          userId,
          benefitTypeId,
          currentBalance: '0',
        })
        .returning();

      return newBalance;
    }

    return results[0];
  }
}
