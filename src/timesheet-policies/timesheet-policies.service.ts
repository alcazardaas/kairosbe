import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { timesheetPolicies } from '../db/schema/timesheet-policies';
import { CreateTimesheetPolicyDto } from './dto/create-timesheet-policy.dto';
import { UpdateTimesheetPolicyDto } from './dto/update-timesheet-policy.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class TimesheetPoliciesService {
  constructor(private readonly dbService: DbService) {}

  async findAll(): Promise<Array<typeof timesheetPolicies.$inferSelect>> {
    const db = this.dbService.getDb();
    return db.select().from(timesheetPolicies);
  }

  async findOne(tenantId: string): Promise<typeof timesheetPolicies.$inferSelect> {
    const db = this.dbService.getDb();
    const result = await db
      .select()
      .from(timesheetPolicies)
      .where(eq(timesheetPolicies.tenantId, tenantId))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException(`Timesheet policy for tenant ${tenantId} not found`);
    }

    return result[0];
  }

  async create(
    createTimesheetPolicyDto: CreateTimesheetPolicyDto,
  ): Promise<typeof timesheetPolicies.$inferSelect> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(timesheetPolicies)
        .values({
          tenantId: createTimesheetPolicyDto.tenant_id,
          weekStart: createTimesheetPolicyDto.week_start,
          maxHoursPerDay: createTimesheetPolicyDto.max_hours_per_day?.toString(),
          allowOvertime: createTimesheetPolicyDto.allow_overtime,
          lockAfterApproval: createTimesheetPolicyDto.lock_after_approval,
        })
        .returning();

      return result[0];
    } catch (error) {
      // Handle unique constraint violation (tenant_id is primary key)
      if (error.code === '23505') {
        throw new ConflictException(
          `Timesheet policy for tenant ${createTimesheetPolicyDto.tenant_id} already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    updateTimesheetPolicyDto: UpdateTimesheetPolicyDto,
  ): Promise<typeof timesheetPolicies.$inferSelect> {
    const db = this.dbService.getDb();

    // Check if policy exists
    await this.findOne(tenantId);

    const result = await db
      .update(timesheetPolicies)
      .set({
        ...(updateTimesheetPolicyDto.week_start !== undefined && {
          weekStart: updateTimesheetPolicyDto.week_start,
        }),
        ...(updateTimesheetPolicyDto.max_hours_per_day !== undefined && {
          maxHoursPerDay: updateTimesheetPolicyDto.max_hours_per_day?.toString(),
        }),
        ...(updateTimesheetPolicyDto.allow_overtime !== undefined && {
          allowOvertime: updateTimesheetPolicyDto.allow_overtime,
        }),
        ...(updateTimesheetPolicyDto.lock_after_approval !== undefined && {
          lockAfterApproval: updateTimesheetPolicyDto.lock_after_approval,
        }),
      })
      .where(eq(timesheetPolicies.tenantId, tenantId))
      .returning();

    return result[0];
  }

  async remove(tenantId: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if policy exists
    await this.findOne(tenantId);

    await db.delete(timesheetPolicies).where(eq(timesheetPolicies.tenantId, tenantId));
  }
}
