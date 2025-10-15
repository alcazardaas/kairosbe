import { pgTable, uuid, date, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { timesheetStatusEnum } from './enums';

export const timesheets = pgTable(
  'timesheets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekStartDate: date('week_start_date').notNull(),
    status: timesheetStatusEnum('status').notNull().default('draft'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    submittedByUserId: uuid('submitted_by_user_id').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userWeekIdx: index('idx_timesheets_user_week').on(table.userId, table.weekStartDate),
    statusIdx: index('idx_timesheets_status').on(table.status),
  }),
);
