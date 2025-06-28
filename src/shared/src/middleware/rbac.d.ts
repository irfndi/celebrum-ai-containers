import type { Env, UserRoleType, SubscriptionTierType, RBACOperationResult, UserAccessSummary, TierLimits } from '../types';
/**
 * Comprehensive RBAC Service for ArbEdge
 * Manages user roles, permissions, API access, trading configurations, and feature flags
 */
export declare class RBACService {
    private env;
    private rolePermissions;
    private tierLimits;
    private featureFlags;
    constructor(env: Env);
    /**
     * Initialize role-based permissions matrix
     */
    private initializeRolePermissions;
    /**
     * Initialize subscription tier limits
     */
    private initializeTierLimits;
    /**
     * Initialize feature flags
     */
    private initializeFeatureFlags;
    /**
     * Check if user has specific permission
     */
    hasPermission(role: UserRoleType, permission: string): boolean;
    /**
     * Get all permissions for a role
     */
    getRolePermissions(role: UserRoleType): string[];
    /**
     * Get tier limits for subscription
     */
    getTierLimits(tier: SubscriptionTierType): TierLimits;
    /**
     * Check if feature flag is enabled
     */
    isFeatureEnabled(flag: string): boolean;
    /**
     * Create comprehensive user access summary
     */
    createUserAccessSummary(userId: string, role: UserRoleType, subscriptionTier: SubscriptionTierType): Promise<UserAccessSummary>;
    /**
     * Get or create API access configuration
     */
    private getOrCreateApiAccess;
    /**
     * Get or create trading configuration
     */
    private getOrCreateTradingConfig;
    /**
     * Validate API access request
     */
    validateApiAccess(userId: string, apiType: 'exchange' | 'ai'): Promise<RBACOperationResult>;
    /**
     * Validate trading request
     */
    validateTradingRequest(userId: string, requestedLeverage: number, positionSize: number): Promise<RBACOperationResult>;
    /**
     * Register a new user with initial role and subscription tier
     */
    registerUser(userId: string, role?: UserRoleType, subscriptionTier?: SubscriptionTierType): Promise<RBACOperationResult>;
    /**
     * Update user role and recalculate permissions
     */
    updateUserRole(userId: string, newRole: UserRoleType, newTier: SubscriptionTierType): Promise<RBACOperationResult>;
    /**
     * Get user access summary
     */
    getUserAccessSummary(userId: string): Promise<UserAccessSummary | null>;
}
//# sourceMappingURL=rbac.d.ts.map