import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const invitationCodes = sqliteTable(
  'invitation_codes',
  {
    code: text('code').primaryKey(),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    maxUses: integer('max_uses'),
    currentUses: integer('current_uses').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    purpose: text('purpose'),
  },
  (table) => ({
    codeIdx: index('idx_invitation_codes_code').on(table.code),
    expiresAtIdx: index('idx_invitation_codes_expires_at').on(table.expiresAt),
    isActiveIdx: index('idx_invitation_codes_is_active').on(table.isActive),
    createdByIdx: index('idx_invitation_codes_created_by').on(table.createdBy),
  })
);

export const invitationUsage = sqliteTable(
  'invitation_usage',
  {
    id: text('id').primaryKey(),
    invitationId: text('invitation_id').notNull(),
    userId: text('user_id').notNull(),
    telegramId: integer('telegram_id').notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    betaExpiresAt: integer('beta_expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    userBetaIdx: index('idx_invitation_usage_user_beta').on(table.userId, table.betaExpiresAt),
  })
);

export type InvitationCode = typeof invitationCodes.$inferSelect;
export type NewInvitationCode = typeof invitationCodes.$inferInsert;
export type InvitationUsage = typeof invitationUsage.$inferSelect;
export type NewInvitationUsage = typeof invitationUsage.$inferInsert;