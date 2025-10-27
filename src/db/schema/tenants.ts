import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerUserId: uuid('owner_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Organization fields
  phone: text('phone'),
  address: text('address'),
  logoUrl: text('logo_url'),
  timezone: text('timezone').default('UTC'),
  country: text('country'), // ISO 3166-1 alpha-2 country code
});
