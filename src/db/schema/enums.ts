import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role_enum', ['admin', 'manager', 'employee']);

export const membershipStatusEnum = pgEnum('membership_status_enum', [
  'active',
  'invited',
  'disabled',
]);

export const accrualMethodEnum = pgEnum('accrual_method_enum', ['annual', 'monthly', 'none']);

export const requestStatusEnum = pgEnum('request_status_enum', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const timesheetStatusEnum = pgEnum('timesheet_status_enum', [
  'draft',
  'submitted',
  'approved',
  'rejected',
]);
