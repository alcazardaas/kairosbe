import { pgTable, uuid, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

/**
 * Password reset tokens for self-service password recovery
 * Tokens are time-limited (default 15 minutes) and single-use
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: uuid('token').notNull().unique().defaultRandom(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  },
  (table) => ({
    tokenIdx: index('idx_password_reset_tokens_token').on(table.token),
    userIdIdx: index('idx_password_reset_tokens_user_id').on(table.userId),
    tenantIdIdx: index('idx_password_reset_tokens_tenant_id').on(table.tenantId),
  }),
);
