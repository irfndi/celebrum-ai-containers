import type { UserRoleType, SubscriptionTierType, RBACOperationResult } from '../types';
/**
 * Feature Flag Manager for dynamic feature control
 * Handles feature toggles, A/B testing, and role-based feature access
 */
export declare class FeatureFlagManager {
    private env;
    private flagCache;
    private defaultFlags;
    constructor(env: unknown);
    /**
     * Get default feature flags
     */
    getDefaultFlags(): Record<string, boolean>;
    /**
     * Initialize default feature flags
     */
    private initializeDefaultFlags;
    /**
     * Check if a feature is enabled for a user
     */
    isFeatureEnabled(featureKey: string, userId?: string, role?: UserRoleType, subscriptionTier?: SubscriptionTierType): Promise<boolean>;
    /**
     * Set global feature flag
     */
    setGlobalFlag(featureKey: string, enabled: boolean, adminUserId: string): Promise<RBACOperationResult>;
    /**
     * Set user-specific feature flag override
     */
    setUserFlag(userId: string, featureKey: string, enabled: boolean, adminUserId: string): Promise<RBACOperationResult>;
    /**
     * Remove user-specific feature flag override
     */
    removeUserFlag(userId: string, featureKey: string, adminUserId: string): Promise<RBACOperationResult>;
    /**
     * Get all feature flags for a user
     */
    getUserFeatureFlags(userId: string, role: UserRoleType, subscriptionTier: SubscriptionTierType): Promise<Record<string, boolean>>;
    /**
     * Get feature flag configuration and metadata
     */
    getFeatureFlagConfig(featureKey: string): Promise<unknown>;
    /**
     * Get feature flag usage statistics
     */
    getFeatureFlagStats(featureKey: string): Promise<unknown>;
    /**
     * Record feature flag usage for analytics
     */
    recordFlagUsage(featureKey: string, userId: string, enabled: boolean): Promise<void>;
    /**
     * Get global feature flag value
     */
    private getGlobalFlag;
    /**
     * Get user-specific feature flag override
     */
    private getUserFlag;
    /**
     * Get default feature flag value
     */
    private getDefaultFlag;
    /**
     * Check role-based access to feature
     */
    private checkRoleAccess;
    /**
     * Check subscription tier access to feature
     */
    private checkTierAccess;
    /**
     * Get role restrictions for a feature
     */
    private getRoleRestrictions;
    /**
     * Get tier restrictions for a feature
     */
    private getTierRestrictions;
    /**
     * Get feature description
     */
    private getFeatureDescription;
    /**
     * Get next version number for feature flag
     */
    private getNextVersion;
    /**
     * Log feature flag changes for audit trail
     */
    private logFlagChange;
}
//# sourceMappingURL=feature-flag-manager.d.ts.map