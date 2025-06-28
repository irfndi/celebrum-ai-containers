/**
 * Feature Flag Routes and Handlers
 * Provides HTTP endpoints for feature flag management
 */
import type { UserRoleType, SubscriptionTierType } from '../types';
export interface FeatureFlagRequest {
    featureKey: string;
    userId?: string;
    role?: UserRoleType;
    subscriptionTier?: SubscriptionTierType;
}
export interface SetFeatureFlagRequest extends FeatureFlagRequest {
    enabled: boolean;
    adminUserId: string;
}
export interface FeatureFlagResponse {
    success: boolean;
    data?: unknown;
    error?: string;
    timestamp: number;
}
export interface FeatureFlagListResponse {
    success: boolean;
    flags: Record<string, boolean>;
    availableFlags: string[];
    timestamp: number;
}
/**
 * Feature Flag Route Handlers
 */
export declare class FeatureFlagRoutes {
    private service;
    constructor(env: unknown);
    /**
     * Check if a specific feature is enabled
     * GET /api/feature-flags/check
     */
    checkFeatureFlag(request: FeatureFlagRequest): Promise<FeatureFlagResponse>;
    /**
     * Get all feature flags for a user
     * GET /api/feature-flags/user
     */
    getUserFeatureFlags(userId: string, role: UserRoleType, subscriptionTier: SubscriptionTierType): Promise<FeatureFlagListResponse>;
    /**
     * Set global feature flag
     * POST /api/feature-flags/global
     */
    setGlobalFeatureFlag(request: SetFeatureFlagRequest): Promise<FeatureFlagResponse>;
    /**
     * Set user-specific feature flag override
     * POST /api/feature-flags/user
     */
    setUserFeatureFlag(request: SetFeatureFlagRequest): Promise<FeatureFlagResponse>;
    /**
     * Remove user-specific feature flag override
     * DELETE /api/feature-flags/user
     */
    removeUserFeatureFlag(userId: string, featureKey: string, adminUserId: string): Promise<FeatureFlagResponse>;
    /**
     * Get feature flag configuration and metadata
     * GET /api/feature-flags/config
     */
    getFeatureFlagConfig(featureKey: string): Promise<FeatureFlagResponse>;
    /**
     * Get feature flag usage statistics
     * GET /api/feature-flags/stats
     */
    getFeatureFlagStats(featureKey: string): Promise<FeatureFlagResponse>;
    /**
     * Get all available feature flags
     * GET /api/feature-flags/available
     */
    getAvailableFeatureFlags(): Promise<FeatureFlagResponse>;
    /**
     * Bulk check multiple feature flags
     * POST /api/feature-flags/bulk-check
     */
    bulkCheckFeatureFlags(featureKeys: string[], userId?: string, role?: UserRoleType, subscriptionTier?: SubscriptionTierType): Promise<FeatureFlagResponse>;
}
/**
 * Utility functions for feature flag middleware
 */
export declare class FeatureFlagMiddleware {
    private service;
    constructor(env: unknown);
    /**
     * Middleware to check if a feature is enabled before proceeding
     */
    requireFeature(featureKey: string): (userId?: string, role?: UserRoleType, subscriptionTier?: SubscriptionTierType) => Promise<{
        allowed: boolean;
        reason?: string;
    }>;
    /**
     * Check multiple features at once
     */
    requireFeatures(featureKeys: string[]): (userId?: string, role?: UserRoleType, subscriptionTier?: SubscriptionTierType) => Promise<{
        allowed: boolean;
        reason?: string;
        results?: Record<string, boolean>;
    }>;
}
//# sourceMappingURL=feature-flags.d.ts.map