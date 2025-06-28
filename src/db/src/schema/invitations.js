"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invitationUsage = exports.invitationCodes = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.invitationCodes = (0, sqlite_core_1.sqliteTable)('invitation_codes', {
    code: (0, sqlite_core_1.text)('code').primaryKey(),
    createdBy: (0, sqlite_core_1.text)('created_by').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'timestamp' }),
    maxUses: (0, sqlite_core_1.integer)('max_uses'),
    currentUses: (0, sqlite_core_1.integer)('current_uses').notNull().default(0),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    purpose: (0, sqlite_core_1.text)('purpose'),
}, (table) => ({
    codeIdx: (0, sqlite_core_1.index)('idx_invitation_codes_code').on(table.code),
    expiresAtIdx: (0, sqlite_core_1.index)('idx_invitation_codes_expires_at').on(table.expiresAt),
    isActiveIdx: (0, sqlite_core_1.index)('idx_invitation_codes_is_active').on(table.isActive),
    createdByIdx: (0, sqlite_core_1.index)('idx_invitation_codes_created_by').on(table.createdBy),
}));
exports.invitationUsage = (0, sqlite_core_1.sqliteTable)('invitation_usage', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    invitationId: (0, sqlite_core_1.text)('invitation_id').notNull(),
    userId: (0, sqlite_core_1.text)('user_id').notNull(),
    telegramId: (0, sqlite_core_1.integer)('telegram_id').notNull(),
    usedAt: (0, sqlite_core_1.integer)('used_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
    betaExpiresAt: (0, sqlite_core_1.integer)('beta_expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' })
        .notNull()
        .default((0, drizzle_orm_1.sql) `(unixepoch())`),
}, (table) => ({
    userBetaIdx: (0, sqlite_core_1.index)('idx_invitation_usage_user_beta').on(table.userId, table.betaExpiresAt),
}));
//# sourceMappingURL=invitations.js.map