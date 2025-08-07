import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * Production-ready user username history table schema for Cloudflare D1
 */
export const userUsernameHistory = sqliteTable(
  'user_username_history',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    telegramId: text('telegram_id').notNull(), // For faster lookups
    username: text('username'), // Can be null if user had no username
    changedAt: integer('changed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    // Track the source of the change
    changeSource: text('change_source', { 
      enum: ['telegram_update', 'manual_correction', 'system_migration'] 
    })
      .notNull()
      .default('telegram_update'),
  }
);

export type UserUsernameHistory = typeof userUsernameHistory.$inferSelect;
export type NewUserUsernameHistory = typeof userUsernameHistory.$inferInsert;