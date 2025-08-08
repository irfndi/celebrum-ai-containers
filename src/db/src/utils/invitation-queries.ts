/**
 * Invitation-related database queries
 * Handles invitation codes and usage tracking
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import type { Database } from './connection.js';
import { invitationCodes, invitationUsage } from '../schema/invitations.js';
import type { InvitationCode, NewInvitationCode, InvitationUsage, NewInvitationUsage } from '../schema/invitations.js';

export class InvitationQueries {
  constructor(private db: Database) {}

  /**
   * Find an invitation code by its code
   */
  async findByCode(code: string): Promise<InvitationCode | null> {
    const builder: any = this.db
      .select()
      .from(invitationCodes)
      .where(eq(invitationCodes.code, code))
      .limit(1);
    
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    if (Array.isArray(result)) {
      return result.length > 0 ? result[0] : null;
    }
    return result || null;
  }

  /**
   * Find all active invitation codes
   */
  async findActiveCodes(): Promise<InvitationCode[]> {
    const builder: any = this.db
      .select()
      .from(invitationCodes)
      .where(
        and(
          eq(invitationCodes.isActive, true),
          sql`(${invitationCodes.expiresAt} IS NULL OR ${invitationCodes.expiresAt} > unixepoch())`
        )
      )
      .orderBy(desc(invitationCodes.createdAt));
    
    return typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
  }

  /**
   * Create a new invitation code
   */
  async create(invitation: NewInvitationCode): Promise<InvitationCode> {
    const builder: any = this.db
      .insert(invitationCodes)
      .values(invitation)
      .returning();
    
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    const inserted = Array.isArray(result) ? result[0] : result;
    if (!inserted) {
      throw new Error('Failed to create invitation code');
    }
    
    return inserted;
  }

  /**
   * Update an invitation code
   */
  async update(code: string, updates: Partial<NewInvitationCode>): Promise<InvitationCode | null> {
    const builder: any = (this.db as any)
      .update(invitationCodes)
      .set(updates)
      .where(eq(invitationCodes.code, code))
      .returning();
    
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Increment usage count for an invitation code
   */
  async incrementUsage(code: string): Promise<InvitationCode | null> {
    const invitation = await this.findByCode(code);
    if (!invitation) return null;

    return this.update(code, {
      currentUses: invitation.currentUses + 1
    });
  }

  /**
   * Check if an invitation code is valid and usable
   */
  async isValid(code: string): Promise<boolean> {
    const invitation = await this.findByCode(code);
    if (!invitation) return false;
    if (!invitation.isActive) return false;
    if (invitation.maxUses && invitation.currentUses >= invitation.maxUses) return false;
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) return false;
    
    return true;
  }

  /**
   * Record invitation usage
   */
  async recordUsage(usage: NewInvitationUsage): Promise<InvitationUsage> {
    const builder: any = this.db
      .insert(invitationUsage)
      .values(usage)
      .returning();
    
    const result = typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
    
    const inserted = Array.isArray(result) ? result[0] : result;
    if (!inserted) {
      throw new Error('Failed to record invitation usage');
    }
    
    return inserted;
  }

  /**
   * Find usage records for a specific invitation
   */
  async findUsageByCode(code: string): Promise<InvitationUsage[]> {
    const builder: any = this.db
      .select()
      .from(invitationUsage)
      .where(eq(invitationUsage.invitationId, code))
      .orderBy(desc(invitationUsage.usedAt));
    
    return typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
  }

  /**
   * Find usage records for a specific user
   */
  async findUsageByUserId(userId: string): Promise<InvitationUsage[]> {
    const builder: any = this.db
      .select()
      .from(invitationUsage)
      .where(eq(invitationUsage.userId, userId))
      .orderBy(desc(invitationUsage.usedAt));
    
    return typeof (builder as any).execute === 'function'
      ? await (builder as any).execute()
      : await builder;
  }

  /**
   * Count total usage for an invitation
   */
  async countUsage(code: string): Promise<number> {
    const usage = await this.findUsageByCode(code);
    return usage.length;
  }
}