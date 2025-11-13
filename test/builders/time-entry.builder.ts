/**
 * Time Entry test data builder
 * Provides a fluent API for creating test time entry objects
 */

import {
  TEST_TENANT_ID,
  TEST_USER_ID,
  TEST_PROJECT_ID,
  TEST_TASK_ID,
  TEST_TIMESHEET_ID,
  VALID_WEEK_START,
} from '../constants';

export class TimeEntryBuilder {
  private data: any = {
    id: 'time-entry-builder-default-id',
    tenantId: TEST_TENANT_ID,
    timesheetId: TEST_TIMESHEET_ID,
    userId: TEST_USER_ID,
    projectId: TEST_PROJECT_ID,
    taskId: TEST_TASK_ID,
    weekStartDate: VALID_WEEK_START,
    dayOfWeek: 1, // Monday
    hours: 8,
    note: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withTimesheetId(timesheetId: string): this {
    this.data.timesheetId = timesheetId;
    return this;
  }

  withUserId(userId: string): this {
    this.data.userId = userId;
    return this;
  }

  withProjectId(projectId: string): this {
    this.data.projectId = projectId;
    return this;
  }

  withTaskId(taskId: string | null): this {
    this.data.taskId = taskId;
    return this;
  }

  withWeekStartDate(weekStartDate: string): this {
    this.data.weekStartDate = weekStartDate;
    return this;
  }

  withDayOfWeek(dayOfWeek: number): this {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('dayOfWeek must be between 0 and 6');
    }
    this.data.dayOfWeek = dayOfWeek;
    return this;
  }

  withHours(hours: number): this {
    this.data.hours = hours;
    return this;
  }

  withNote(note: string): this {
    this.data.note = note;
    return this;
  }

  onMonday(): this {
    this.data.dayOfWeek = 1;
    return this;
  }

  onTuesday(): this {
    this.data.dayOfWeek = 2;
    return this;
  }

  onWednesday(): this {
    this.data.dayOfWeek = 3;
    return this;
  }

  onThursday(): this {
    this.data.dayOfWeek = 4;
    return this;
  }

  onFriday(): this {
    this.data.dayOfWeek = 5;
    return this;
  }

  onSaturday(): this {
    this.data.dayOfWeek = 6;
    return this;
  }

  onSunday(): this {
    this.data.dayOfWeek = 0;
    return this;
  }

  build(): any {
    return { ...this.data };
  }
}
