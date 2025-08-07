// Using native crypto.randomUUID() instead of uuid package for Cloudflare Workers compatibility
import { NotFoundError, ValidationError } from '../errors';
import type { Database, InvitationCode as DbInvitationCode, InvitationUsage as DbInvitationUsage } from '../../../db/src/index';
import { invitationCodes, invitationUsage } from '../../../db/src/schema';
import { eq, and, count, gt, sql } from 'drizzle-orm';

// Debug: Check what's being imported
// console.log('invitationCodes:', invitationCodes);
// console.log('invitationCodes.code:', invitationCodes?.code);

// Re-export database types for convenience
export type InvitationCode = DbInvitationCode;
export type InvitationUsage = DbInvitationUsage;

export interface CreateInvitationCodeData {
  code: string;
  created_by: string;
  expires_at?: number;
  max_uses?: number;
  purpose: string;
}

export class InvitationService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Validate an invitation code and check if it's usable
   */
  async validateInvitationCode(code: string): Promise<InvitationCode> {
    const invitation = await this.db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .get();
    
    if (!invitation) {
      throw new NotFoundError('Invalid or inactive invitation code');
    }
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      throw new NotFoundError('Invitation code has expired');
    }
    const maxUses = Number(invitation.maxUses ?? 0);
    const currentUses = Number(invitation.currentUses ?? 0);
    if (!isNaN(maxUses) && maxUses > 0 && currentUses >= maxUses) {
      throw new NotFoundError('Invitation code has reached maximum uses');
    }

    return invitation;
  }

  /**
   * Use an invitation code for user registration
   */
  async useInvitationCode(code: string, userId: string, telegramId: number): Promise<InvitationUsage> {
    return this.db.transaction(async (tx) => {
      // 1. Find and lock the invitation code
      const invitation = await tx
        .select()
        .from(invitationCodes)
        .where(eq(invitationCodes.code, code))
        .get();

      if (!invitation) {
        throw new NotFoundError('Invalid or inactive invitation code');
      }

      // Additional check for isActive in case mock database filtering didn't work
      if (!invitation.isActive) {
        throw new NotFoundError('Invalid or inactive invitation code');
      }

      // 2. Check for expiration
      if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
        throw new ValidationError('Invitation code has expired');
      }

      // 3. Check for max uses
      if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) {
        throw new ValidationError('Invitation code has reached maximum uses');
      }

      // 4. Check if user has already used a code
      const existingUsage = await tx
        .select()
        .from(invitationUsage)
        .where(eq(invitationUsage.userId, userId))
        .get();

      if (existingUsage) {
        throw new ValidationError('User has already used an invitation code');
      }

      // 5. Increment usage count
      await tx
        .update(invitationCodes)
        .set({ currentUses: invitation.currentUses + 1 })
        .where(eq(invitationCodes.code, code))
        .execute();

      // 6. Create usage record
      const betaExpiresAt = new Date();
      betaExpiresAt.setDate(betaExpiresAt.getDate() + 90);
      const usageId = globalThis.crypto.randomUUID();
      const now = new Date();

      const result = await tx.insert(invitationUsage).values({
        id: usageId,
        invitationId: invitation.code,
        userId,
        telegramId,
        usedAt: now,
        betaExpiresAt,
        createdAt: now,
      }).returning();

      // Handle both array and single object returns from mock database
      const newUsage = Array.isArray(result) ? result[0] : result;
      return newUsage;
    });
  }

  /**
   * Check if user has active beta access
   */
  async hasActiveBetaAccess(userId: string): Promise<boolean> {
    const usage = await this.db
      .select({ betaExpiresAt: invitationUsage.betaExpiresAt })
      .from(invitationUsage)
      .where(and(
        eq(invitationUsage.userId, userId),
        gt(invitationUsage.betaExpiresAt, new Date())
      ))
      .get();
    return !!usage;
  }

  /**
   * Get user's beta expiration date
   */
  async getBetaExpirationDate(userId: string): Promise<Date | null> {
    const usage = await this.db
      .select({ betaExpiresAt: invitationUsage.betaExpiresAt })
      .from(invitationUsage)
      .where(eq(invitationUsage.userId, userId))
      .get();
    return usage ? usage.betaExpiresAt : null;
  }

  /**
   * Create invitation codes (admin only)
   */
  async createInvitationCodes(
    codes: CreateInvitationCodeData[]
  ): Promise<InvitationCode[]> {
    const now = new Date();
    const createdCodes: InvitationCode[] = [];

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

        await tx.insert(invitationCodes).values(invitation);
        createdCodes.push(invitation);
      }
    });
    
    return createdCodes;
  }

  /**
   * Get invitation metrics
   */
  async getInvitationMetrics(): Promise<{
    totalCodes: number;
    activeCodes: number;
    usedCodes: number;
    totalUsers: number;
    activeBetaUsers: number;
  }> {
    const [totalCodes, activeCodes, usedCodes, totalUsers, activeBetaUsers] = await Promise.all([
      this.db.select({ count: count() }).from(invitationCodes).get(),
      this.db.select({ count: count() }).from(invitationCodes).where(eq(invitationCodes.isActive, true)).get(),
      this.db.select({ count: count() }).from(invitationCodes).where(gt(invitationCodes.currentUses, 0)).get(),
      this.db.select({ count: count() }).from(invitationUsage).get(),
      this.db.select({ count: count() }).from(invitationUsage).where(sql`${invitationUsage.betaExpiresAt} > ${Math.floor(Date.now() / 1000)}`).get()
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