import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

/**
 * Production-ready users table schema for Cloudflare D1
 * 
 * This schema is designed to work with both the application logic
 * and the Cloudflare D1 database constraints.
 */
export const users = sqliteTable(
  'users',
  {
    // Primary key - use text for better compatibility with Cloudflare D1
    id: text('id').primaryKey().$defaultFn(() => `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
    
    // Telegram integration fields - use text for better compatibility
    telegramId: text('telegram_id').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    username: text('username'),
    languageCode: text('language_code'),
    
    // User profile information
    email: text('email'),
    
    // User role and status (CRITICAL FOR RBAC)
    role: text('role', { enum: ['free', 'pro', 'ultra', 'admin', 'superadmin'] }).notNull().default('free'),
    status: text('status', { enum: ['active', 'suspended', 'banned'] }).notNull().default('active'),
    
    // Timestamps - use integer for better D1 compatibility
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),
    
    // JSON fields for complex data - stored as TEXT in D1
    settings: text('settings', { mode: 'json' }).default('{}'),
    apiLimits: text('api_limits', { mode: 'json' }).default('{}'),
    tradingPreferences: text('trading_preferences', { mode: 'json' }).default('{}'),
    
    // Financial information
    accountBalance: text('account_balance').default('0.00'),
    betaExpiresAt: integer('beta_expires_at', { mode: 'timestamp' }),
  },
  (table) => ({
    uniqueTelegramId: unique().on(table.telegramId),
    uniqueUsername: unique().on(table.username),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;