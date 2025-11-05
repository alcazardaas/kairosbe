import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { timesheetPolicies } from '../db/schema/timesheet-policies';
import { CreateTimesheetPolicyDto } from './dto/create-timesheet-policy.dto';
import { UpdateTimesheetPolicyDto } from './dto/update-timesheet-policy.dto';
import { eq } from 'drizzle-orm';
import { transformKeysToCamel } from '../common/helpers/case-transform.helper';

@Injectable()
export class TimesheetPoliciesService {
  constructor(private readonly dbService: DbService) {}

  async findAll(): Promise<any[]> {
    const db = this.dbService.getDb();
    const results = await db.select().from(timesheetPolicies);
    return results.map((result) => transformKeysToCamel(result));
  }

  async findOne(tenantId: string): Promise<any> {
    const db = this.dbService.getDb();
    const result = await db
      .select()
      .from(timesheetPolicies)
      .where(eq(timesheetPolicies.tenantId, tenantId))
      .limit(1);

    if (!result.length) {
      throw new NotFoundException(`Timesheet policy for tenant ${tenantId} not found`);
    }

    return transformKeysToCamel(result[0]);
  }

  async create(
    tenantId: string,
    createTimesheetPolicyDto: CreateTimesheetPolicyDto,
  ): Promise<any> {
    const db = this.dbService.getDb();

    try {
      const result = await db
        .insert(timesheetPolicies)
        .values({
          tenantId: tenantId,
          weekStart: createTimesheetPolicyDto.weekStart,
          maxHoursPerDay: createTimesheetPolicyDto.maxHoursPerDay?.toString(),
          allowOvertime: createTimesheetPolicyDto.allowOvertime,
          lockAfterApproval: createTimesheetPolicyDto.lockAfterApproval,
        })
        .returning();

      return transformKeysToCamel(result[0]);
    } catch (error) {
      // Handle unique constraint violation (tenant_id is primary key)
      if (error.code === '23505') {
        throw new ConflictException(
          `Timesheet policy for tenant ${tenantId} already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    updateTimesheetPolicyDto: UpdateTimesheetPolicyDto,
  ): Promise<any> {
    const db = this.dbService.getDb();

    // Check if policy exists
    await this.findOne(tenantId);

    const result = await db
      .update(timesheetPolicies)
      .set({
        ...(updateTimesheetPolicyDto.weekStart !== undefined && {
          weekStart: updateTimesheetPolicyDto.weekStart,
        }),
        ...(updateTimesheetPolicyDto.maxHoursPerDay !== undefined && {
          maxHoursPerDay: updateTimesheetPolicyDto.maxHoursPerDay?.toString(),
        }),
        ...(updateTimesheetPolicyDto.allowOvertime !== undefined && {
          allowOvertime: updateTimesheetPolicyDto.allowOvertime,
        }),
        ...(updateTimesheetPolicyDto.lockAfterApproval !== undefined && {
          lockAfterApproval: updateTimesheetPolicyDto.lockAfterApproval,
        }),
      })
      .where(eq(timesheetPolicies.tenantId, tenantId))
      .returning();

    return transformKeysToCamel(result[0]);
  }

  async remove(tenantId: string): Promise<void> {
    const db = this.dbService.getDb();

    // Check if policy exists
    await this.findOne(tenantId);

    await db.delete(timesheetPolicies).where(eq(timesheetPolicies.tenantId, tenantId));
  }
}
