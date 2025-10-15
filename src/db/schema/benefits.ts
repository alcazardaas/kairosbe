import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  unique,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accrualMethodEnum, requestStatusEnum } from './enums';
import { tenants } from './tenants';
import { users } from './users';

export const benefitTypes = pgTable(
  'benefit_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    unit: text('unit').notNull(),
    requiresApproval: boolean('requires_approval').notNull().default(true),
  },
  (table) => ({
    uniqTenantKey: unique().on(table.tenantId, table.key),
    unitCheck: check('unit_check', sql`${table.unit} IN ('days', 'hours')`),
  }),
);

export const benefitPolicies = pgTable('benefit_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  benefitTypeId: uuid('benefit_type_id')
    .notNull()
    .references(() => benefitTypes.id, { onDelete: 'cascade' }),
  accrualMethod: accrualMethodEnum('accrual_method').notNull(),
  annualAmount: numeric('annual_amount', { precision: 6, scale: 2 }).notNull().default('0'),
  carryoverLimit: numeric('carryover_limit', { precision: 6, scale: 2 }).notNull().default('0'),
  negativeBalanceOk: boolean('negative_balance_ok').notNull().default(false),
  effectiveFrom: timestamp('effective_from', { mode: 'date' }).notNull(),
  effectiveTo: timestamp('effective_to', { mode: 'date' }),
});

export const benefitBalances = pgTable(
  'benefit_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    benefitTypeId: uuid('benefit_type_id')
      .notNull()
      .references(() => benefitTypes.id, { onDelete: 'cascade' }),
    currentBalance: numeric('current_balance', { precision: 7, scale: 2 }).notNull().default('0'),
  },
  (table) => ({
    uniqTenantUserBenefit: unique().on(table.tenantId, table.userId, table.benefitTypeId),
  }),
);

export const benefitRequests = pgTable(
  'benefit_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    benefitTypeId: uuid('benefit_type_id')
      .notNull()
      .references(() => benefitTypes.id, { onDelete: 'cascade' }),
    startDate: timestamp('start_date', { mode: 'date' }).notNull(),
    endDate: timestamp('end_date', { mode: 'date' }).notNull(),
    amount: numeric('amount', { precision: 6, scale: 2 }).notNull(),
    status: requestStatusEnum('status').notNull().default('pending'),
    approverUserId: uuid('approver_user_id').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Composite index for manager team views (tenant + status + dates + user)
    teamViewIdx: index('idx_benefit_requests_team_view').on(
      table.tenantId,
      table.status,
      table.startDate,
      table.endDate,
      table.userId,
    ),
  }),
);
