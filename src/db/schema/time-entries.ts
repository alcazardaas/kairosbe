import {
  pgTable,
  uuid,
  timestamp,
  integer,
  numeric,
  text,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';
import { users } from './users';
import { projects, tasks } from './projects';

export const timeEntries = pgTable(
  'time_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id),
    weekStartDate: timestamp('week_start_date', { mode: 'date' }).notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    hours: numeric('hours', { precision: 4, scale: 2 }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqTimeEntry: unique().on(
      table.tenantId,
      table.userId,
      table.projectId,
      table.taskId,
      table.weekStartDate,
      table.dayOfWeek,
    ),
    dayOfWeekCheck: check('day_of_week_check', sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
    hoursCheck: check('hours_check', sql`${table.hours} >= 0`),
  }),
);
