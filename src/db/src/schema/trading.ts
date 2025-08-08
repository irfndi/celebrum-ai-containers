import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * Production-ready positions table schema for Cloudflare D1
 */
export const positions = sqliteTable(
  'positions',
  {
    id: text('id').primaryKey().$defaultFn(() => `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
    userId: text('user_id').notNull(),
    
    // Trading information
    symbol: text('symbol').notNull(), // e.g., 'BTC/USDT'
    type: text('type', { enum: ['long', 'short'] }).notNull(),
    strategy: text('strategy', { enum: ['arbitrage', 'technical', 'manual'] }).notNull(),
    status: text('status', { enum: ['open', 'closed', 'partially_filled', 'cancelled'] }).notNull().default('open'),
    
    // Position details
    quantity: real('quantity').notNull(),
    entryPrice: real('entry_price').notNull(),
    exitPrice: real('exit_price'),
    stopLoss: real('stop_loss'),
    takeProfit: real('take_profit'),
    leverage: integer('leverage').default(1),
    fees: real('fees').default(0),
    pnl: real('pnl').default(0),
    
    // Exchange and metadata
    exchangeId: text('exchange_id').notNull(),
    metadata: text('metadata', { mode: 'json' }).default('{}'),
    
    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    userIdIdx: index('positions_user_id_idx').on(table.userId),
    statusIdx: index('positions_status_idx').on(table.status),
    symbolIdx: index('positions_symbol_idx').on(table.symbol),
  })
);

/**
 * Production-ready opportunities table schema for Cloudflare D1
 */
export const opportunities = sqliteTable(
  'opportunities',
  {
    id: text('id').primaryKey().$defaultFn(() => `opp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
    
    // Opportunity details
    type: text('type', { enum: ['arbitrage', 'technical'] }).notNull(),
    symbol: text('symbol').notNull(), // e.g., 'BTC/USDT'
    exchange1: text('exchange_1'),
    exchange2: text('exchange_2'),
    price1: real('price_1'),
    price2: real('price_2'),
    profitPercentage: real('profit_percentage').notNull(),
    confidence: real('confidence').notNull(),
    
    // Status and timing
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    
    // Timestamps
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => ({
    typeIdx: index('opportunities_type_idx').on(table.type),
    symbolIdx: index('opportunities_symbol_idx').on(table.symbol),
    activeIdx: index('opportunities_active_idx').on(table.isActive),
    expiresIdx: index('opportunities_expires_idx').on(table.expiresAt),
  })
);

/**
 * Production-ready trading strategies table schema for Cloudflare D1
 */
export const tradingStrategies = sqliteTable(
  'trading_strategies',
  {
    id: text('id').primaryKey().$defaultFn(() => `strat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['arbitrage', 'technical', 'manual'] }).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    settings: text('settings', { mode: 'json' }).default('{}'),
    
    // Performance metrics as JSON field
    performance: text('performance', { mode: 'json' })
      .$type<{
        totalTrades?: number;
        winRate?: number;
        averageReturn?: number;
        maxDrawdown?: number;
        sharpeRatio?: number;
        lastUpdated?: number;
      } | null>(),
    
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    userIdIdx: index('trading_strategies_user_id_idx').on(table.userId),
    typeIdx: index('trading_strategies_type_idx').on(table.type),
    activeIdx: index('trading_strategies_active_idx').on(table.isActive),
  })
);

// Export types
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type TradingStrategy = typeof tradingStrategies.$inferSelect;
export type NewTradingStrategy = typeof tradingStrategies.$inferInsert;