import type { UserRoleType, SubscriptionTierType, RBACOperationResult } from '../types';
/**
 * Enhanced Feature Flag Service
 * Integrates FeatureFlagManager with feature_flags.json configuration
 * Provides centralized feature flag management with JSON-based defaults
 */
export declare class FeatureFlagService {
    private manager;
    private jsonFlags;
    constructor(env: unknown);
    /**
     * Initialize feature flags from JSON configuration
     */
    private initializeFromJson;
    /**
     * Check if a feature is enabled for a user
     * First checks the dynamic FeatureFlagManager, then falls back to JSON config
     */
    isFeatureEnabled(featureKey: string, userId?: string, role?: UserRoleType, subscriptionTier?: SubscriptionTierType): Promise<boolean>;
    /**
     * Get feature flag value from JSON configuration
     */
    private getJsonFeatureFlag;
    /**
     * Set global feature flag (delegates to FeatureFlagManager)
     */
    setGlobalFlag(featureKey: string, enabled: boolean, adminUserId: string): Promise<RBACOperationResult>;
    /**
     * Set user-specific feature flag override (delegates to FeatureFlagManager)
     */
    setUserFlag(userId: string, featureKey: string, enabled: boolean, adminUserId: string): Promise<RBACOperationResult>;
    /**
     * Remove user-specific feature flag override (delegates to FeatureFlagManager)
     */
    removeUserFlag(userId: string, featureKey: string, adminUserId: string): Promise<RBACOperationResult>;
    /**
     * Get all feature flags for a user
     * Combines dynamic flags with JSON configuration
     */
    getUserFeatureFlags(userId: string, role: UserRoleType, subscriptionTier: SubscriptionTierType): Promise<Record<string, boolean>>;
    /**
     * Get all feature flags from JSON configuration
     */
    private getAllJsonFlags;
    /**
     * Get feature flag configuration and metadata (delegates to FeatureFlagManager)
     */
    getFeatureFlagConfig(featureKey: string): Promise<unknown>;
    /**
     * Get feature flag usage statistics (delegates to FeatureFlagManager)
     */
    getFeatureFlagStats(featureKey: string): Promise<unknown>;
    /**
     * Record feature flag usage for analytics (delegates to FeatureFlagManager)
     */
    recordFlagUsage(featureKey: string, userId: string, enabled: boolean): Promise<void>;
    /**
     * Get available feature flags from JSON configuration and default flags
     */
    getAvailableFlags(): string[];
    /**
     * Validate feature flag key exists in configuration
     */
    isValidFeatureFlag(featureKey: string): boolean;
    /**
     * Get feature flag description from JSON configuration
     */
    getFeatureDescription(featureKey: string): string | null;
}
export declare function createFeatureFlagService(env: unknown): FeatureFlagService;
export declare function getFeatureFlagService(): FeatureFlagService | null;
//# sourceMappingURL=feature-flag-service.d.ts.map