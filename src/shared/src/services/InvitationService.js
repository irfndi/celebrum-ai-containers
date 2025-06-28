"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationService = void 0;
const uuid_1 = require("uuid");
const errors_1 = require("../errors");
const db_1 = require("@celebrum-ai/db");
const drizzle_orm_1 = require("drizzle-orm");
// Debug: Check what's being imported
console.log('invitationCodes:', db_1.invitationCodes);
console.log('invitationCodes.code:', db_1.invitationCodes?.code);
class InvitationService {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Validate an invitation code and check if it's usable
     */
    async validateInvitationCode(code) {
        const invitation = await this.db
            .select()
            .from(db_1.invitationCodes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.invitationCodes.code, code), (0, drizzle_orm_1.eq)(db_1.invitationCodes.isActive, true)))
            .get();
        if (!invitation) {
            throw new errors_1.NotFoundError('Invalid or inactive invitation code');
        }
        // Check if expired
        if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
            throw new errors_1.ValidationError('Invitation code has expired');
        }
        // Check if max uses reached
        if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
            throw new errors_1.ValidationError('Invitation code has reached maximum uses');
        }
        return invitation;
    }
    /**
     * Use an invitation code for user registration
     */
    async useInvitationCode(code, userId, telegramId) {
        return this.db.transaction(async (tx) => {
            // 1. Find and lock the invitation code
            const invitation = await tx
                .select()
                .from(db_1.invitationCodes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.invitationCodes.code, code), (0, drizzle_orm_1.eq)(db_1.invitationCodes.isActive, true)))
                .get();
            if (!invitation) {
                throw new errors_1.NotFoundError('Invalid or inactive invitation code');
            }
            // 2. Check for expiration
            if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
                throw new errors_1.ValidationError('Invitation code has expired');
            }
            // 3. Check for max uses
            if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
                throw new errors_1.ValidationError('Invitation code has reached maximum uses');
            }
            // 4. Check if user has already used a code
            const existingUsage = await tx
                .select()
                .from(db_1.invitationUsage)
                .where((0, drizzle_orm_1.eq)(db_1.invitationUsage.userId, userId))
                .get();
            if (existingUsage) {
                throw new errors_1.ValidationError('User has already used an invitation code');
            }
            // 5. Increment usage count
            await tx
                .update(db_1.invitationCodes)
                .set({ currentUses: invitation.currentUses + 1 })
                .where((0, drizzle_orm_1.eq)(db_1.invitationCodes.code, code));
            // 6. Create usage record
            const betaExpiresAt = new Date();
            betaExpiresAt.setDate(betaExpiresAt.getDate() + 90);
            const usageId = (0, uuid_1.v4)();
            const now = new Date();
            const [newUsage] = await tx.insert(db_1.invitationUsage).values({
                id: usageId,
                invitationId: invitation.code,
                userId,
                telegramId,
                usedAt: now,
                betaExpiresAt,
                createdAt: now,
            }).returning();
            return newUsage;
        });
    }
    /**
     * Check if user has active beta access
     */
    async hasActiveBetaAccess(userId) {
        const usage = await this.db
            .select({ betaExpiresAt: db_1.invitationUsage.betaExpiresAt })
            .from(db_1.invitationUsage)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.invitationUsage.userId, userId), (0, drizzle_orm_1.gt)(db_1.invitationUsage.betaExpiresAt, new Date())))
            .get();
        return !!usage;
    }
    /**
     * Get user's beta expiration date
     */
    async getBetaExpirationDate(userId) {
        const usage = await this.db
            .select({ betaExpiresAt: db_1.invitationUsage.betaExpiresAt })
            .from(db_1.invitationUsage)
            .where((0, drizzle_orm_1.eq)(db_1.invitationUsage.userId, userId))
            .get();
        return usage ? usage.betaExpiresAt : null;
    }
    /**
     * Create invitation codes (admin only)
     */
    async createInvitationCodes(codes) {
        const now = new Date();
        const createdCodes = [];
        await this.db.transaction(async (tx) => {
            for (const codeData of codes) {
                const invitation = {
                    code: codeData.code,
                    createdBy: codeData.created_by,
                    createdAt: now,
                    expiresAt: codeData.expires_at ? new Date(codeData.expires_at) : null,
                    maxUses: codeData.max_uses || null,
                    currentUses: 0,
                    isActive: true,
                    purpose: codeData.purpose
                };
                await tx.insert(db_1.invitationCodes).values(invitation);
                createdCodes.push(invitation);
            }
        });
        return createdCodes;
    }
    /**
     * Get invitation metrics
     */
    async getInvitationMetrics() {
        const [totalCodes, activeCodes, usedCodes, totalUsers, activeBetaUsers] = await Promise.all([
            this.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_1.invitationCodes).get(),
            this.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_1.invitationCodes).where((0, drizzle_orm_1.eq)(db_1.invitationCodes.isActive, true)).get(),
            this.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_1.invitationCodes).where((0, drizzle_orm_1.gt)(db_1.invitationCodes.currentUses, 0)).get(),
            this.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_1.invitationUsage).get(),
            this.db.select({ count: (0, drizzle_orm_1.count)() }).from(db_1.invitationUsage).where((0, drizzle_orm_1.sql) `${db_1.invitationUsage.betaExpiresAt} > ${Math.floor(Date.now() / 1000)}`).get()
        ]);
        return {
            totalCodes: Number(totalCodes?.count ?? 0),
            activeCodes: Number(activeCodes?.count ?? 0),
            usedCodes: Number(usedCodes?.count ?? 0),
            totalUsers: Number(totalUsers?.count ?? 0),
            activeBetaUsers: Number(activeBetaUsers?.count ?? 0)
        };
    }
}
exports.InvitationService = InvitationService;
//# sourceMappingURL=InvitationService.js.map