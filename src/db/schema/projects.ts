import { pgTable, uuid, text, boolean, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    code: text('code'),
    active: boolean('active').notNull().default(true),
  },
  (table) => ({
    uniqTenantName: unique().on(table.tenantId, table.name),
  }),
);

// Self-referencing foreign key for parent_task_id
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    parentTaskId: uuid('parent_task_id'),
  },
  (table) => ({
    uniqTenantProjectTask: unique().on(table.tenantId, table.projectId, table.name),
  }),
);
