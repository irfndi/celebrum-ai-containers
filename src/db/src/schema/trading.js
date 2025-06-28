"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradingStrategies = exports.opportunities = exports.positions = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const users_js_1 = require("./users.js");
exports.positions = (0, sqlite_core_1.sqliteTable)('positions', {
    id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id')
        .notNull()
        .references(() => users_js_1.users.id, { onDelete: 'cascade' }),
    exchangeId: (0, sqlite_core_1.text)('exchange_id').notNull(),
    symbol: (0, sqlite_core_1.text)('symbol').notNull(),
    type: (0, sqlite_core_1.text)('type', { enum: ['long', 'short'] }).notNull(),
    strategy: (0, sqlite_core_1.text)('strategy', { enum: ['arbitrage', 'technical', 'manual'] }).notNull(),
    entryPrice: (0, sqlite_core_1.real)('entry_price').notNull(),
    exitPrice: (0, sqlite_core_1.real)('exit_price'),
    quantity: (0, sqlite_core_1.real)('quantity').notNull(),
    leverage: (0, sqlite_core_1.real)('leverage').default(1),
    stopLoss: (0, sqlite_core_1.real)('stop_loss'),
    takeProfit: (0, sqlite_core_1.real)('take_profit'),
    status: (0, sqlite_core_1.text)('status', { enum: ['open', 'closed', 'partially_filled', 'cancelled'] })
        .notNull()
        .default('open'),
    pnl: (0, sqlite_core_1.real)('pnl').default(0),
    fees: (0, sqlite_core_1.real)('fees').default(0),
    // Metadata as JSON field
    metadata: (0, sqlite_core_1.text)('metadata', { mode: 'json' })
        .$type()
        .default((0, drizzle_orm_1.sql) `'{}'`),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    closedAt: (0, sqlite_core_1.integer)('closed_at', { mode: 'timestamp' }),
}, (table) => ({
    userIdIdx: (0, sqlite_core_1.index)('positions_user_id_idx').on(table.userId),
    statusIdx: (0, sqlite_core_1.index)('positions_status_idx').on(table.status),
    symbolIdx: (0, sqlite_core_1.index)('positions_symbol_idx').on(table.symbol),
    strategyIdx: (0, sqlite_core_1.index)('positions_strategy_idx').on(table.strategy),
}));
exports.opportunities = (0, sqlite_core_1.sqliteTable)('opportunities', {
    id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    type: (0, sqlite_core_1.text)('type', { enum: ['arbitrage', 'technical'] }).notNull(),
    symbol: (0, sqlite_core_1.text)('symbol').notNull(),
    exchange1: (0, sqlite_core_1.text)('exchange_1').notNull(),
    exchange2: (0, sqlite_core_1.text)('exchange_2').notNull(),
    price1: (0, sqlite_core_1.real)('price_1').notNull(),
    price2: (0, sqlite_core_1.real)('price_2').notNull(),
    profitPercentage: (0, sqlite_core_1.real)('profit_percentage').notNull(),
    confidence: (0, sqlite_core_1.real)('confidence').notNull(),
    expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'timestamp' }).notNull(),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
}, (table) => ({
    typeIdx: (0, sqlite_core_1.index)('opportunities_type_idx').on(table.type),
    profitIdx: (0, sqlite_core_1.index)('opportunities_profit_idx').on(table.profitPercentage),
    activeIdx: (0, sqlite_core_1.index)('opportunities_active_idx').on(table.isActive),
    expiresIdx: (0, sqlite_core_1.index)('opportunities_expires_idx').on(table.expiresAt),
}));
exports.tradingStrategies = (0, sqlite_core_1.sqliteTable)('trading_strategies', {
    id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id')
        .notNull()
        .references(() => users_js_1.users.id, { onDelete: 'cascade' }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    type: (0, sqlite_core_1.text)('type', { enum: ['arbitrage', 'technical', 'manual'] }).notNull(),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    settings: (0, sqlite_core_1.text)('settings', { mode: 'json' }).notNull(),
    // Performance metrics as JSON field
    performance: (0, sqlite_core_1.text)('performance', { mode: 'json' })
        .$type()
        .default((0, drizzle_orm_1.sql) `'{}'`),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
}, (table) => ({
    userIdIdx: (0, sqlite_core_1.index)('trading_strategies_user_id_idx').on(table.userId),
    typeIdx: (0, sqlite_core_1.index)('trading_strategies_type_idx').on(table.type),
    activeIdx: (0, sqlite_core_1.index)('trading_strategies_active_idx').on(table.isActive),
}));
//# sourceMappingURL=trading.js.map