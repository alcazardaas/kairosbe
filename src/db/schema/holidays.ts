import { pgTable, uuid, char, timestamp, text, varchar, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const holidays = pgTable('holidays', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  countryCode: char('country_code', { length: 2 }).notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(),
  name: text('name').notNull(),
  type: varchar('type', { length: 20 }).notNull().default('public'), // 'public', 'company', 'regional'
  isRecurring: boolean('is_recurring').notNull().default(false),
  description: text('description'),
});
