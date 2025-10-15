import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { timesheets, timeEntries, users } from '../db/schema';
import { CreateTimesheetDto } from './dto/create-timesheet.dto';
import { ReviewTimesheetDto } from './dto/review-timesheet.dto';

@Injectable()
export class TimesheetsService {
  constructor(private readonly db: DbService) {}

  /**
   * List timesheets with optional filtering
   */
  async findAll(tenantId: string, userId?: string, weekStartDate?: string, status?: string) {
    let query = this.db.db
      .select({
        id: timesheets.id,
        userId: timesheets.userId,
        weekStartDate: timesheets.weekStartDate,
        status: timesheets.status,
        submittedAt: timesheets.submittedAt,
        reviewedAt: timesheets.reviewedAt,
        reviewNote: timesheets.reviewNote,
        createdAt: timesheets.createdAt,
        updatedAt: timesheets.updatedAt,
      })
      .from(timesheets)
      .where(eq(timesheets.tenantId, tenantId))
      .$dynamic();

    const conditions = [eq(timesheets.tenantId, tenantId)];

    if (userId) {
      conditions.push(eq(timesheets.userId, userId));
    }

    if (weekStartDate) {
      conditions.push(eq(timesheets.weekStartDate, weekStartDate));
    }

    if (status) {
      conditions.push(eq(timesheets.status, status as any));
    }

    const results = await this.db.db
      .select()
      .from(timesheets)
      .where(and(...conditions))
      .orderBy(desc(timesheets.weekStartDate));

    return results;
  }

  /**
   * Get a single timesheet by ID with its time entries
   */
  async findOne(tenantId: string, id: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    // Get associated time entries
    const entries = await this.db.db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.tenantId, tenantId),
          eq(timeEntries.userId, timesheet.userId),
          sql`${timeEntries.weekStartDate} = ${timesheet.weekStartDate}`,
        ),
      );

    return {
      ...timesheet,
      timeEntries: entries,
    };
  }

  /**
   * Create a new draft timesheet
   */
  async create(tenantId: string, dto: CreateTimesheetDto) {
    // Check if timesheet already exists for this user and week
    const [existing] = await this.db.db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.tenantId, tenantId),
          eq(timesheets.userId, dto.userId),
          eq(timesheets.weekStartDate, dto.weekStartDate),
        ),
      )
      .limit(1);

    if (existing) {
      throw new BadRequestException(
        `Timesheet already exists for user ${dto.userId} and week ${dto.weekStartDate}`,
      );
    }

    const [timesheet] = await this.db.db
      .insert(timesheets)
      .values({
        tenantId,
        userId: dto.userId,
        weekStartDate: dto.weekStartDate,
        status: 'draft',
      })
      .returning();

    return timesheet;
  }

  /**
   * Submit a timesheet for approval
   */
  async submit(tenantId: string, id: string, currentUserId: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'draft') {
      throw new BadRequestException(`Timesheet cannot be submitted. Current status: ${timesheet.status}`);
    }

    // Check if user owns this timesheet or is submitting on their behalf
    if (timesheet.userId !== currentUserId) {
      throw new ForbiddenException('You can only submit your own timesheets');
    }

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        submittedByUserId: currentUserId,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    return updated;
  }

  /**
   * Approve a timesheet (manager/admin only)
   */
  async approve(tenantId: string, id: string, currentUserId: string, dto?: ReviewTimesheetDto) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestException(`Timesheet cannot be approved. Current status: ${timesheet.status}`);
    }

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        reviewedByUserId: currentUserId,
        reviewNote: dto?.reviewNote,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    return updated;
  }

  /**
   * Reject a timesheet (manager/admin only)
   */
  async reject(tenantId: string, id: string, currentUserId: string, dto: ReviewTimesheetDto) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestException(`Timesheet cannot be rejected. Current status: ${timesheet.status}`);
    }

    if (!dto.reviewNote) {
      throw new BadRequestException('Review note is required when rejecting a timesheet');
    }

    const [updated] = await this.db.db
      .update(timesheets)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedByUserId: currentUserId,
        reviewNote: dto.reviewNote,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a draft timesheet
   */
  async remove(tenantId: string, id: string, currentUserId: string) {
    const [timesheet] = await this.db.db
      .select()
      .from(timesheets)
      .where(and(eq(timesheets.id, id), eq(timesheets.tenantId, tenantId)))
      .limit(1);

    if (!timesheet) {
      throw new NotFoundException(`Timesheet with ID ${id} not found`);
    }

    if (timesheet.status !== 'draft') {
      throw new BadRequestException('Only draft timesheets can be deleted');
    }

    if (timesheet.userId !== currentUserId) {
      throw new ForbiddenException('You can only delete your own draft timesheets');
    }

    await this.db.db.delete(timesheets).where(eq(timesheets.id, id));
  }
}
