import { type UserRoleType, type SubscriptionTierType, type OpportunityLimits, type RBACOperationResult, type ArbitrageOpportunity } from '@celebrum-ai/shared';
/**
 * Arbitrage Opportunity Manager for managing opportunity detection and execution limits
 * Handles opportunity validation, rate limiting, and access control
 */
export declare class ArbitrageOpportunityManager {
    private env;
    private opportunityCache;
    private userOpportunityHistory;
    constructor(env: unknown);
    /**
     * Create default opportunity limits for user
     */
    createDefaultOpportunityLimits(userId: string, role: UserRoleType, subscriptionTier: SubscriptionTierType): Promise<OpportunityLimits>;
    /**
     * Get opportunity limits for user
     */
    getOpportunityLimits(userId: string): Promise<OpportunityLimits | null>;
    /**
     * Validate opportunity access request
     */
    validateOpportunityAccess(userId: string, opportunityType: 'view' | 'execute' | 'create_alert'): Promise<RBACOperationResult>;
    /**
     * Record opportunity execution result
     */
    recordOpportunityExecution(userId: string, opportunityId: string, success: boolean, profitLoss?: number, executionTime?: number): Promise<RBACOperationResult>;
    /**
     * Get available opportunities for user based on their access level
     */
    getAvailableOpportunities(userId: string, role: UserRoleType, filters?: {
        minProfitPercent?: number;
        maxRisk?: 'low' | 'medium' | 'high';
        exchanges?: string[];
        symbols?: string[];
    }): Promise<ArbitrageOpportunity[]>;
    /**
     * Create opportunity alert for user
     */
    createOpportunityAlert(userId: string, alertConfig: {
        minProfitPercent: number;
        maxRisk: 'low' | 'medium' | 'high';
        exchanges: string[];
        symbols?: string[];
        notificationMethod: 'email' | 'webhook' | 'telegram';
        isActive: boolean;
    }): Promise<RBACOperationResult>;
    /**
     * Get user's opportunity alerts
     */
    getUserOpportunityAlerts(userId: string): Promise<unknown[]>;
    /**
     * Update opportunity limits for user
     */
    updateOpportunityLimits(userId: string, newLimits: Partial<OpportunityLimits>): Promise<RBACOperationResult>;
    /**
     * Get tier-based opportunity limits
     */
    private getTierLimits;
    /**
     * Reset counters if time windows have passed
     */
    private resetCountersIfNeeded;
    /**
     * Get opportunities from cache
     */
    private getOpportunitiesFromCache;
    /**
     * Cache opportunities for role
     */
    private cacheOpportunities;
    /**
     * Generate mock opportunities (in production, this would connect to real data sources)
     */
    private generateOpportunities;
    /**
     * Filter opportunities by user role
     */
    private filterOpportunitiesByRole;
    /**
     * Apply user-defined filters to opportunities
     */
    private applyFilters;
    /**
     * Get maximum opportunities for role
     */
    private getMaxOpportunitiesForRole;
    /**
     * Get total executions for user
     */
    private getTotalExecutions;
    /**
     * Get successful executions for user
     */
    private getSuccessfulExecutions;
}
//# sourceMappingURL=arbitrage-opportunity-manager.d.ts.map