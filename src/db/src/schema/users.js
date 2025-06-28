"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    telegramId: (0, sqlite_core_1.text)('telegram_id').notNull(),
    firstName: (0, sqlite_core_1.text)('first_name'),
    lastName: (0, sqlite_core_1.text)('last_name'),
    username: (0, sqlite_core_1.text)('username'),
    languageCode: (0, sqlite_core_1.text)('language_code'),
    email: (0, sqlite_core_1.text)('email'),
    role: (0, sqlite_core_1.text)('role', { enum: ['free', 'pro', 'ultra', 'admin', 'superadmin'] })
        .notNull()
        .default('free'),
    status: (0, sqlite_core_1.text)('status', { enum: ['active', 'suspended', 'banned'] })
        .notNull()
        .default('active'),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    lastActiveAt: (0, sqlite_core_1.integer)('last_active_at', { mode: 'timestamp' }),
    // Settings as JSON field - using proper JSON type
    settings: (0, sqlite_core_1.text)('settings', { mode: 'json' })
        .$type()
        .default((0, drizzle_orm_1.sql) `'{}'`),
    // API limits as JSON field
    apiLimits: (0, sqlite_core_1.text)('api_limits', { mode: 'json' })
        .$type()
        .default((0, drizzle_orm_1.sql) `'{}'`),
    // Account balance
    accountBalance: (0, sqlite_core_1.text)('account_balance').default('0.00'),
    betaExpiresAt: (0, sqlite_core_1.integer)('beta_expires_at', { mode: 'timestamp' }),
    // Trading preferences as JSON field
    tradingPreferences: (0, sqlite_core_1.text)('trading_preferences', { mode: 'json' })
        .$type()
        .default((0, drizzle_orm_1.sql) `'{}'`),
}, (table) => ({
    uniqueTelegramId: (0, sqlite_core_1.unique)().on(table.telegramId),
    uniqueEmail: (0, sqlite_core_1.unique)().on(table.email),
    uniqueUsername: (0, sqlite_core_1.unique)().on(table.username),
}));
//# sourceMappingURL=users.js.map