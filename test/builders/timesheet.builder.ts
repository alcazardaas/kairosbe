/**
 * Timesheet test data builder
 * Provides a fluent API for creating test timesheet objects
 */

import { TEST_TENANT_ID, TEST_USER_ID, VALID_WEEK_START } from '../constants';

export class TimesheetBuilder {
  private data: any = {
    id: 'timesheet-builder-default-id',
    tenantId: TEST_TENANT_ID,
    userId: TEST_USER_ID,
    weekStartDate: VALID_WEEK_START,
    status: 'draft',
    totalHours: 0,
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withUserId(userId: string): this {
    this.data.userId = userId;
    return this;
  }

  withTenantId(tenantId: string): this {
    this.data.tenantId = tenantId;
    return this;
  }

  withWeekStartDate(weekStartDate: string): this {
    this.data.weekStartDate = weekStartDate;
    return this;
  }

  withStatus(status: 'draft' | 'submitted' | 'approved' | 'rejected'): this {
    this.data.status = status;
    return this;
  }

  withTotalHours(hours: number): this {
    this.data.totalHours = hours;
    return this;
  }

  asDraft(): this {
    this.data.status = 'draft';
    this.data.submittedAt = null;
    this.data.approvedAt = null;
    this.data.approvedBy = null;
    return this;
  }

  asSubmitted(): this {
    this.data.status = 'submitted';
    this.data.submittedAt = new Date().toISOString();
    this.data.approvedAt = null;
    this.data.approvedBy = null;
    return this;
  }

  asApproved(approvedBy?: string): this {
    this.data.status = 'approved';
    this.data.submittedAt = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    this.data.approvedAt = new Date().toISOString();
    this.data.approvedBy = approvedBy || 'manager-id';
    return this;
  }

  asRejected(reason?: string): this {
    this.data.status = 'rejected';
    this.data.submittedAt = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    this.data.rejectionReason = reason || 'Incomplete hours';
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}
