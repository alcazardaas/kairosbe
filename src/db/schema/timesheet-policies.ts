import { pgTable, uuid, integer, numeric, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const timesheetPolicies = pgTable('timesheet_policies', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  weekStart: integer('week_start').notNull().default(1),
  maxHoursPerDay: numeric('max_hours_per_day', { precision: 4, scale: 2 }).default('12'),
  allowOvertime: boolean('allow_overtime').notNull().default(true),
  lockAfterApproval: boolean('lock_after_approval').notNull().default(true),
});
