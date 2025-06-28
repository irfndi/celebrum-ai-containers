import type { Database, InvitationCode as DbInvitationCode, InvitationUsage as DbInvitationUsage } from '@celebrum-ai/db';
export type InvitationCode = DbInvitationCode;
export type InvitationUsage = DbInvitationUsage;
export interface CreateInvitationCodeData {
    code: string;
    created_by: string;
    expires_at?: number;
    max_uses?: number;
    purpose: string;
}
export declare class InvitationService {
    private db;
    constructor(db: Database);
    /**
     * Validate an invitation code and check if it's usable
     */
    validateInvitationCode(code: string): Promise<InvitationCode>;
    /**
     * Use an invitation code for user registration
     */
    useInvitationCode(code: string, userId: string, telegramId: number): Promise<InvitationUsage>;
    /**
     * Check if user has active beta access
     */
    hasActiveBetaAccess(userId: string): Promise<boolean>;
    /**
     * Get user's beta expiration date
     */
    getBetaExpirationDate(userId: string): Promise<Date | null>;
    /**
     * Create invitation codes (admin only)
     */
    createInvitationCodes(codes: CreateInvitationCodeData[]): Promise<InvitationCode[]>;
    /**
     * Get invitation metrics
     */
    getInvitationMetrics(): Promise<{
        totalCodes: number;
        activeCodes: number;
        usedCodes: number;
        totalUsers: number;
        activeBetaUsers: number;
    }>;
}
//# sourceMappingURL=InvitationService.d.ts.map